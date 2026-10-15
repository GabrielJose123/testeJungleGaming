#!/usr/bin/env node
import { execSync, spawn } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

import { chromium } from "@playwright/test"
import * as chromeLauncher from "chrome-launcher"
import lighthouse from "lighthouse"

import { pages, profiles, runsPerProfile, targets } from "../lighthouse/lighthouse.config.mjs"

const require = createRequire(import.meta.url)
const args = new Set(process.argv.slice(2))
const runsArg = [...args].find((arg) => arg.startsWith("--runs="))
const RUNS = runsArg ? Number(runsArg.split("=")[1]) : runsPerProfile
const PORT = Number(process.env.LIGHTHOUSE_PORT ?? 4174)
const BASE_URL = `http://localhost:${PORT}`
const OUT_DIR = path.resolve("lighthouse/reports")

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
    }
    await sleep(300)
  }
  throw new Error(`preview não respondeu em ${url}`)
}

if (!args.has("--skip-build")) {
  console.log("› build:demo")
  execSync("npm run build:demo", { stdio: "inherit" })
}

mkdirSync(OUT_DIR, { recursive: true })

console.log(`› vite preview em ${BASE_URL}`)
const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { shell: true, stdio: "ignore" })
const stopPreview = () => {
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(preview.pid), "/f", "/t"], { stdio: "ignore" })
  else preview.kill("SIGTERM")
}

let chrome
try {
  await waitForServer(BASE_URL)
  chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  })

  const results = []
  for (const page of pages) {
    for (const [profile, config] of Object.entries(profiles)) {
      for (let run = 1; run <= RUNS; run++) {
        const url = `${BASE_URL}${page.path}`
        process.stdout.write(`› ${page.slug} · ${profile} · medição ${run}/${RUNS} … `)
        const { lhr, report } = await lighthouse(url, { port: chrome.port, output: ["html", "json"], logLevel: "error" }, config)
        const base = path.join(OUT_DIR, `${page.slug}-${profile}-${run}`)
        writeFileSync(`${base}.report.html`, report[0])
        writeFileSync(`${base}.report.json`, report[1])
        const scores = Object.fromEntries(Object.entries(lhr.categories).map(([id, category]) => [id, Math.round((category.score ?? 0) * 100)]))
        const metrics = {
          lcpMs: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
          cls: Number(lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3)),
          tbtMs: Math.round(lhr.audits["total-blocking-time"].numericValue),
        }
        results.push({ page: page.slug, profile, run, scores, metrics, runtimeError: lhr.runtimeError?.message ?? null })
        console.log(Object.entries(scores).map(([id, score]) => `${id} ${score}`).join(" · "))
      }
    }
  }

  const groups = {}
  for (const result of results) (groups[`${result.page}|${result.profile}`] ??= []).push(result)
  const summary = Object.entries(groups).map(([key, runs]) => {
    const [page, profile] = key.split("|")
    const categories = Object.fromEntries(Object.keys(runs[0].scores).map((id) => [id, median(runs.map((run) => run.scores[id]))]))
    return {
      page,
      profile,
      runs: runs.length,
      median: categories,
      metrics: {
        lcpMs: median(runs.map((run) => run.metrics.lcpMs)),
        cls: median(runs.map((run) => run.metrics.cls)),
        tbtMs: median(runs.map((run) => run.metrics.tbtMs)),
      },
      belowTarget: Object.entries(targets)
        .filter(([id, target]) => categories[id] < target)
        .map(([id]) => id),
    }
  })

  const environment = {
    date: new Date().toISOString(),
    lighthouse: require("lighthouse/package.json").version,
    chromeLauncher: require("chrome-launcher/package.json").version,
    chromium: chromium.name() + " " + (await (async () => {
      const browser = await chromium.launch()
      const version = browser.version()
      await browser.close()
      return version
    })()),
    node: process.version,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model ?? "desconhecida",
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    target: `${BASE_URL} (vite preview do build:demo, mocks MSW no cenário padrão)`,
    runsPerProfile: RUNS,
    throttling: {
      mobile: "padrão Lighthouse: emulação Moto G Power, 4G lento simulado (150 ms RTT, 1,6 Mbps), CPU 4×",
      desktop: "preset desktop-config: 40 ms RTT, 10 Mbps, sem lentidão de CPU",
    },
  }

  writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify({ environment, targets, summary, results }, null, 2))

  const rows = summary.map(
    (entry) =>
      `| ${entry.page} | ${entry.profile} | ${entry.median.performance} | ${entry.median.accessibility} | ${entry.median["best-practices"]} | ${entry.median.seo} | ${entry.metrics.lcpMs} ms | ${entry.metrics.cls} | ${entry.metrics.tbtMs} ms |`,
  )
  const markdown = [
    "# Lighthouse — resumo",
    "",
    `Mediana de ${RUNS} medição(ões) por página e perfil. Metas: Performance ≥ ${targets.performance}, Accessibility ≥ ${targets.accessibility}, Best Practices ≥ ${targets["best-practices"]}, SEO ≥ ${targets.seo}.`,
    "",
    "| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Ambiente",
    "",
    ...Object.entries(environment).map(([key, value]) => `- **${key}**: ${typeof value === "object" ? JSON.stringify(value) : value}`),
    "",
  ].join("\n")
  writeFileSync(path.join(OUT_DIR, "summary.md"), markdown)
  console.log(`\n${markdown}`)
} finally {
  await chrome?.kill()
  stopPreview()
}
