import { createFileRoute } from "@tanstack/react-router"

import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"

export const Route = createFileRoute("/perfil")({
  component: () => <ScreenPlaceholder title="Perfil do colecionador" />,
})
