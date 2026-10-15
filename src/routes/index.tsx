import { createFileRoute } from "@tanstack/react-router"

import { catalogSearchSchema } from "@/features/home/catalog-search"
import { HomePage } from "@/features/home/home-page"

export const Route = createFileRoute("/")({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})
