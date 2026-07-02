import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  Alert,
  CircularProgress,
  TablePagination,
} from "@mui/material";
import { Add, Block, Visibility, ContentCopy, Edit, Delete, Autorenew } from "@mui/icons-material";
import {
  createBarcode,
  listBarcodes,
  revokeBarcode,
  updateBarcode,
  deleteBarcode,
  reissueBarcode,
} from "../api/endpoints";

const STATUS_COLORS = {
  active: "success",
  expired: "warning",
  revoked: "error",
};

const CODE_TYPE_LABELS = {
  barcode: "Barcode",
  qrcode: "QR Code",
};

export default function BarcodesPage() {
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [codeType, setCodeType] = useState("barcode");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editBarcode, setEditBarcode] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Reissue dialog
  const [reissueOpen, setReissueOpen] = useState(false);
  const [reissueTarget, setReissueTarget] = useState(null);
  const [reissueExpiresAt, setReissueExpiresAt] = useState("");
  const [reissueLoading, setReissueLoading] = useState(false);
  const [reissueError, setReissueError] = useState("");

  const fetchBarcodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listBarcodes({ page: page + 1 });
      setBarcodes(data.results || data);
      setTotalCount(data.count || data.length);
    } catch (err) {
      console.error("Failed to load barcodes", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBarcodes();
  }, [fetchBarcodes]);

  const handleCreate = async () => {
    setCreateError("");
    setCreateLoading(true);
    try {
      const { data } = await createBarcode({
        label,
        expires_at: new Date(expiresAt).toISOString(),
        code_type: codeType,
      });
      setSelectedBarcode(data);
      setCreateOpen(false);
      setDetailOpen(true);
      setLabel("");
      setExpiresAt("");
      setCodeType("barcode");
      fetchBarcodes();
    } catch (err) {
      setCreateError(err.response?.data?.detail || JSON.stringify(err.response?.data) || "Failed to create barcode");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this barcode?")) return;
    try {
      await revokeBarcode(id);
      fetchBarcodes();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to revoke");
    }
  };

  const handleOpenEdit = (b) => {
    setEditBarcode(b);
    setEditLabel(b.label || "");
    setEditError("");
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    setEditError("");
    setEditLoading(true);
    try {
      await updateBarcode(editBarcode.id, { label: editLabel });
      setEditOpen(false);
      fetchBarcodes();
    } catch (err) {
      setEditError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Failed to update barcode"
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (b) => {
    const name = b.label || b.id.slice(0, 8);
    if (!window.confirm(`Permanently delete barcode "${name}"? This cannot be undone.`))
      return;
    try {
      await deleteBarcode(b.id);
      fetchBarcodes();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete");
    }
  };

  const handleOpenReissue = (b) => {
    setReissueTarget(b);
    setReissueExpiresAt("");
    setReissueError("");
    setReissueOpen(true);
  };

  const handleReissue = async () => {
    setReissueError("");
    setReissueLoading(true);
    try {
      const { data } = await reissueBarcode(reissueTarget.id, {
        expires_at: new Date(reissueExpiresAt).toISOString(),
      });
      setReissueOpen(false);
      // Show the freshly signed payload/image so it can be redistributed.
      setSelectedBarcode(data);
      setDetailOpen(true);
      fetchBarcodes();
    } catch (err) {
      setReissueError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Failed to reissue barcode"
      );
    } finally {
      setReissueLoading(false);
    }
  };

  const handleCopyPayload = async (payload) => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Barcodes</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Generate Barcode
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {barcodes.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>{b.label || b.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Chip label={CODE_TYPE_LABELS[b.code_type] || b.code_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={b.status} color={STATUS_COLORS[b.status]} size="small" />
                  </TableCell>
                  <TableCell>{new Date(b.created_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(b.expires_at).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => { setSelectedBarcode(b); setDetailOpen(true); }}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenEdit(b)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reissue (new expiry)">
                      <IconButton size="small" color="primary" onClick={() => handleOpenReissue(b)}>
                        <Autorenew />
                      </IconButton>
                    </Tooltip>
                    {b.status === "active" && (
                      <Tooltip title="Revoke">
                        <IconButton size="small" color="error" onClick={() => handleRevoke(b.id)}>
                          <Block />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(b)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {barcodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No barcodes found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={25}
            rowsPerPageOptions={[25]}
          />
        </TableContainer>
      )}

      {/* ── Create Dialog ───────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate New Barcode</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            label="Label (optional)"
            fullWidth
            margin="normal"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <TextField
            label="Expires At"
            type="datetime-local"
            fullWidth
            required
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <TextField
            select
            label="Code Type"
            fullWidth
            margin="normal"
            value={codeType}
            onChange={(e) => setCodeType(e.target.value)}
          >
            <MenuItem value="barcode">Barcode (Code128)</MenuItem>
            <MenuItem value="qrcode">QR Code</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!expiresAt || createLoading}
          >
            {createLoading ? <CircularProgress size={20} /> : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail Dialog ───────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Barcode Details</DialogTitle>
        <DialogContent>
          {selectedBarcode && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ID: {selectedBarcode.id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Label: {selectedBarcode.label || "—"}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Type: <Chip label={CODE_TYPE_LABELS[selectedBarcode.code_type] || selectedBarcode.code_type || "barcode"} size="small" variant="outlined" />
              </Typography>
              <Typography variant="body2" gutterBottom>
                Status: <Chip label={selectedBarcode.status} color={STATUS_COLORS[selectedBarcode.status]} size="small" />
              </Typography>
              <Typography variant="body2" gutterBottom>
                Expires: {new Date(selectedBarcode.expires_at).toLocaleString()}
              </Typography>

              {/* Show barcode image */}
              {(selectedBarcode.image_base64 || selectedBarcode.image) && (
                <Box mt={2} textAlign="center">
                  <img
                    src={
                      selectedBarcode.image_base64
                        ? `data:image/png;base64,${selectedBarcode.image_base64}`
                        : selectedBarcode.image
                    }
                    alt="Barcode"
                    style={{
                      width: selectedBarcode.code_type === "qrcode" ? 260 : "100%",
                      maxWidth: selectedBarcode.code_type === "qrcode" ? 260 : 480,
                      height: "auto",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 16,
                      background: "#fff",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  />
                </Box>
              )}

              {/* Show payload only on creation */}
              {selectedBarcode.payload && (
                <Box mt={2}>
                  <Alert severity="info" icon={false}>
                    <Typography variant="subtitle2" gutterBottom>Signed Payload (save this!):</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" sx={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: 12 }}>
                        {selectedBarcode.payload}
                      </Typography>
                      <IconButton size="small" onClick={() => handleCopyPayload(selectedBarcode.payload)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                    {copiedPayload && <Typography variant="caption" color="success.main">Copied!</Typography>}
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Barcode</DialogTitle>
        <DialogContent>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <TextField
            label="Label"
            fullWidth
            margin="normal"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            autoFocus
          />
          <Typography variant="caption" color="text.secondary">
            Only the label can be edited. Type and expiry are locked into the
            signed barcode and cannot be changed after creation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={editLoading}>
            {editLoading ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reissue Dialog ──────────────────────── */}
      <Dialog open={reissueOpen} onClose={() => setReissueOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reissue Barcode</DialogTitle>
        <DialogContent>
          {reissueError && <Alert severity="error" sx={{ mb: 2 }}>{reissueError}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Reissuing generates a brand-new signed code with the new expiry and
            reactivates the barcode. The previously distributed code will stop
            working — you must redistribute the new one shown afterwards.
          </Alert>
          <TextField
            label="New Expires At"
            type="datetime-local"
            fullWidth
            required
            margin="normal"
            slotProps={{ inputLabel: { shrink: true } }}
            value={reissueExpiresAt}
            onChange={(e) => setReissueExpiresAt(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReissueOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReissue}
            disabled={!reissueExpiresAt || reissueLoading}
          >
            {reissueLoading ? <CircularProgress size={20} /> : "Reissue"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
