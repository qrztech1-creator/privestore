import { createFileRoute, Navigate } from "@tanstack/react-router";

// Closed platform: only admin logs in. Brides access via secret link `/g/$token`.
// Old `/painel` redirects to admin dashboard.
export const Route = createFileRoute("/painel/")({
  component: () => <Navigate to="/admin" />,
});
