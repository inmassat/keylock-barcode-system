import api from "./axios";

/* ── Auth ─────────────────────────────────── */

export const login = (username, password) =>
  api.post("/auth/token/", { username, password });

export const refreshToken = (refresh) =>
  api.post("/auth/token/refresh/", { refresh });

export const getMe = () => api.get("/auth/me/");

/* ── Barcodes ─────────────────────────────── */

export const listBarcodes = (params) =>
  api.get("/barcodes/", { params });

export const createBarcode = (data) =>
  api.post("/barcodes/create/", data);

export const getBarcode = (id) =>
  api.get(`/barcodes/${id}/`);

export const updateBarcode = (id, data) =>
  api.patch(`/barcodes/${id}/`, data);

export const deleteBarcode = (id) =>
  api.delete(`/barcodes/${id}/`);

export const revokeBarcode = (id) =>
  api.post(`/barcodes/${id}/revoke/`);

export const reissueBarcode = (id, data) =>
  api.post(`/barcodes/${id}/reissue/`, data);

export const scanBarcode = (payload, device_id) =>
  api.post("/barcodes/scan/", { payload, device_id });

/* ── Audit Logs ───────────────────────────── */

export const listAuditLogs = (params) =>
  api.get("/barcodes/audit-logs/", { params });
