# Lighthouse — resumo

Mediana de 3 medição(ões) por página e perfil. Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inicio | mobile | 79 | 100 | 100 | 100 | 4581 ms | 0.005 | 129 ms |
| inicio | desktop | 96 | 100 | 100 | 100 | 1275 ms | 0.011 | 0 ms |
| detalhe | mobile | 81 | 100 | 100 | 100 | 4375 ms | 0 | 97 ms |
| detalhe | desktop | 97 | 100 | 100 | 100 | 1267 ms | 0.003 | 0 ms |

## Ambiente

- **date**: 2026-10-15T16:29:09.024Z
- **lighthouse**: 13.5.0
- **chromeLauncher**: 1.2.2
- **chromium**: chromium 156.0.8078.4
- **node**: v24.19.0
- **os**: Windows_NT 10.0.19045 (x64)
- **cpu**: 12th Gen Intel(R) Core(TM) i5-12400F
- **memoryGb**: 32
- **target**: http://localhost:4174 (vite preview do build:demo, mocks MSW no cenário padrão)
- **runsPerProfile**: 3
- **throttling**: {"mobile":"padrão Lighthouse: emulação Moto G Power, 4G lento simulado (150 ms RTT, 1,6 Mbps), CPU 4×","desktop":"preset desktop-config: 40 ms RTT, 10 Mbps, sem lentidão de CPU"}
