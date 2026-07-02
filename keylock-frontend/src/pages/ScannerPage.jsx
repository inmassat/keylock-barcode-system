import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import { CameraAlt, Send } from "@mui/icons-material";
import { Html5Qrcode } from "html5-qrcode";
import { scanBarcode } from "../api/endpoints";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000";

export default function ScannerPage() {
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem("scanner_device_id") || "device-01");
  const [scanning, setScanning] = useState(false);
  const [manualPayload, setManualPayload] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wsEvents, setWsEvents] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  const scannerRef = useRef(null);
  const wsRef = useRef(null);
  const scannerContainerRef = useRef(null);

  /* ── Persist device ID ──────────────────── */
  useEffect(() => {
    localStorage.setItem("scanner_device_id", deviceId);
  }, [deviceId]);

  /* ── WebSocket connection ───────────────── */
  useEffect(() => {
    if (!deviceId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/lock/${deviceId}/`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWsEvents((prev) => [data, ...prev].slice(0, 50)); // keep last 50
    };

    return () => {
      ws.close();
    };
  }, [deviceId]);

  /* ── Handle scan result ─────────────────── */
  const handleScan = useCallback(
    async (payload) => {
      if (!payload || loading) return;
      setLoading(true);
      setResult(null);
      try {
        const { data } = await scanBarcode(payload, deviceId);
        setResult(data);
      } catch (err) {
        const errData = err.response?.data;
        setResult(errData || { access: "DENY", reason: "Network error" });
      } finally {
        setLoading(false);
      }
    },
    [deviceId, loading]
  );

  /* ── Camera scanner ─────────────────────── */
  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("scanner-region");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 150 } },
        (decodedText) => {
          handleScan(decodedText);
          stopScanner();
        },
        () => {} // ignore scan failures
      );
      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      alert("Camera access denied or not available.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualScan = (e) => {
    e.preventDefault();
    if (manualPayload.trim()) {
      handleScan(manualPayload.trim());
      setManualPayload("");
    }
  };

  return (
    <Box maxWidth={600} mx="auto">
      <Typography variant="h5" gutterBottom>
        Barcode Scanner
      </Typography>

      {/* Device ID */}
      <TextField
        label="Device ID"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      {/* WebSocket status */}
      <Box mb={2}>
        <Chip
          label={wsConnected ? "WebSocket Connected" : "WebSocket Disconnected"}
          color={wsConnected ? "success" : "default"}
          size="small"
        />
      </Box>

      {/* Camera scanner */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          <CameraAlt sx={{ mr: 1, verticalAlign: "middle" }} />
          Camera Scanner
        </Typography>

        <Box
          id="scanner-region"
          ref={scannerContainerRef}
          sx={{
            width: "100%",
            minHeight: scanning ? 250 : 0,
            mb: 2,
            border: scanning ? "2px solid #1976d2" : "none",
            borderRadius: 1,
            overflow: "hidden",
          }}
        />

        {!scanning ? (
          <Button variant="contained" onClick={startScanner} fullWidth>
            Start Camera
          </Button>
        ) : (
          <Button variant="outlined" color="error" onClick={stopScanner} fullWidth>
            Stop Camera
          </Button>
        )}
      </Paper>

      {/* Manual entry */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Manual Payload Entry
        </Typography>
        <Box component="form" onSubmit={handleManualScan} display="flex" gap={1}>
          <TextField
            label="Barcode Payload"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            size="small"
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!manualPayload.trim() || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Send />}
          >
            Scan
          </Button>
        </Box>
      </Paper>

      {/* Scan result */}
      {result && (
        <Alert
          severity={result.access === "ALLOW" ? "success" : "error"}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6">
            {result.access === "ALLOW" ? "✅ ACCESS GRANTED" : "❌ ACCESS DENIED"}
          </Typography>
          <Typography variant="body2">{result.reason}</Typography>
          {result.barcode_id && (
            <Typography variant="caption" display="block" mt={1}>
              Barcode: {result.barcode_id}
            </Typography>
          )}
        </Alert>
      )}

      {/* Real-time WebSocket events */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Real-Time Lock Events
        </Typography>
        <Divider sx={{ mb: 1 }} />
        {wsEvents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events yet. Scan a barcode to see real-time events.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
            {wsEvents.map((evt, i) => (
              <ListItem key={i} divider>
                <ListItemText
                  primary={
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip
                        label={evt.type}
                        color={evt.type === "UNLOCK" ? "success" : evt.type === "DENIED" ? "error" : "default"}
                        size="small"
                      />
                      <Typography variant="caption">{evt.timestamp}</Typography>
                    </Box>
                  }
                  secondary={evt.reason || evt.message}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
