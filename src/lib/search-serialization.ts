import { parseSearchWith, stringifySearchWith } from "@tanstack/react-router"

function parseValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(",")
  if (typeof value === "string") return parseValue(value) === value ? value : JSON.stringify(value)
  return JSON.stringify(value)
}

export const parseSearch = parseSearchWith(parseValue)
export const stringifySearch = stringifySearchWith(stringifyValue, parseValue)
