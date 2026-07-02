import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import BarcodesPage from "./pages/BarcodesPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import ScannerPage from "./pages/ScannerPage";

const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Protected layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/barcodes" element={
                <ProtectedRoute roles={["admin", "operator"]}>
                  <BarcodesPage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/logs" element={
                <ProtectedRoute roles={["admin"]}>
                  <AuditLogsPage />
                </ProtectedRoute>
              } />
              <Route path="/scanner" element={
                <ProtectedRoute roles={["admin", "operator", "device"]}>
                  <ScannerPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard/barcodes" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
