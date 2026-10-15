import { parseSearchWith, stringifySearchWith } from "@tanstack/react-router"

/**
 * Serialização dos search params: arrays viram CSV legível (`collections=musica,arte-3d`)
 * em vez do JSON padrão do TanStack Router. Os schemas de cada rota aceitam CSV.
 */
function parseValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(",")
  // Strings ficam sem aspas, a menos que fossem lidas de volta como outro tipo ("123", "true").
  if (typeof value === "string") return parseValue(value) === value ? value : JSON.stringify(value)
  return JSON.stringify(value)
}

export const parseSearch = parseSearchWith(parseValue)
export const stringifySearch = stringifySearchWith(stringifyValue, parseValue)
