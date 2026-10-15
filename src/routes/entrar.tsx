import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { LoginPage } from "@/features/auth/login-page"

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(["expired"]).optional().catch(undefined),
})

export const Route = createFileRoute("/entrar")({
  validateSearch: searchSchema,
  component: LoginPage,
})
