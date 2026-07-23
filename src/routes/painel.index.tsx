import { createFileRoute } from "@tanstack/react-router";
import { PainelCliente } from "./painel";

export const Route = createFileRoute("/painel/")({
  component: PainelCliente,
});
