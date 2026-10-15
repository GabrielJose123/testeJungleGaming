import { describe, expect, it } from "vitest"

import { addEth, compareEth, formatEth, isEthAmount, multiplyEth } from "./money"

describe("money", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(addEth("0.1", "0.2")).toBe("0.3")
    expect(addEth("1.19", "1.69", "0.0021")).toBe("2.8821")
  })

  it("multiplica apenas por quantidades inteiras", () => {
    expect(multiplyEth("0.333333333333333333", 3)).toBe("0.999999999999999999")
    expect(() => multiplyEth("1", 1.5)).toThrow()
  })

  it("preserva até 18 casas e remove zeros à direita", () => {
    expect(addEth("0.000000000000000001", "1")).toBe("1.000000000000000001")
    expect(addEth("1.50", "0")).toBe("1.5")
  })

  it("compara e valida strings decimais", () => {
    expect(compareEth("1.19", "1.190")).toBe(0)
    expect(compareEth("0.99", "1")).toBe(-1)
    expect(isEthAmount("1.19")).toBe(true)
    expect(isEthAmount("1e3")).toBe(false)
    expect(isEthAmount(1.19)).toBe(false)
  })

  it("formata com arredondamento só na apresentação", () => {
    expect(formatEth("1.19")).toBe("1.19 ETH")
    expect(formatEth("2")).toBe("2.00 ETH")
    expect(formatEth("0.0021")).toBe("0.0021 ETH")
    expect(formatEth("0.12345678")).toBe("0.123457 ETH")
    expect(formatEth("12.3", { locale: "pt-BR" })).toBe("12,30 ETH")
  })
})
