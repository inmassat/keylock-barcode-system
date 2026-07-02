import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  TablePagination,
  TextField,
  MenuItem,
} from "@mui/material";
import { listAuditLogs } from "../api/endpoints";

const RESULT_COLORS = {
  allow: "success",
  deny: "error",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [resultFilter, setResultFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1 };
      if (resultFilter) params.result = resultFilter;
      if (deviceFilter) params.device_id = deviceFilter;
      const { data } = await listAuditLogs(params);
      setLogs(data.results || data);
      setTotalCount(data.count || data.length);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  }, [page, resultFilter, deviceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Box>
      <Typography variant="h5" mb={3}>Audit Logs</Typography>

      {/* Filters */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          select
          label="Result"
          value={resultFilter}
          onChange={(e) => { setResultFilter(e.target.value); setPage(0); }}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="allow">Allow</MenuItem>
          <MenuItem value="deny">Deny</MenuItem>
        </TextField>
        <TextField
          label="Device ID"
          value={deviceFilter}
          onChange={(e) => { setDeviceFilter(e.target.value); setPage(0); }}
          size="small"
        />
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
                <TableCell>Timestamp</TableCell>
                <TableCell>Barcode ID</TableCell>
                <TableCell>Device ID</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                    {log.barcode_id ? log.barcode_id.slice(0, 8) + "…" : "—"}
                  </TableCell>
                  <TableCell>{log.device_id}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.result.toUpperCase()}
                      color={RESULT_COLORS[log.result]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.reason}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No logs found</TableCell>
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
    </Box>
  );
}
