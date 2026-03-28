/**
 * VAT calculation rules:
 *  - Tenant country = LT (Lithuania)  → 21 %
 *  - EU country + valid VAT number     → 0 % (reverse charge)
 *  - EU country, no VAT number         → 21 %
 *  - Non-EU country                    → 0 %
 */

const EU_COUNTRY_CODES = new Set([
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI",
  "FR","GR","HR","HU","IE","IT","LT","LU","LV","MT",
  "NL","PL","PT","RO","SE","SI","SK",
]);

export interface VatResult {
  rate: number;       // e.g. 0.21
  label: string;      // e.g. "VAT 21%"
  description: string; // e.g. "Standard Lithuanian VAT"
}

export function calculateVAT(
  countryCode: string | null | undefined,
  vatNumber: string | null | undefined
): VatResult {
  const code = (countryCode ?? "").toUpperCase().trim();

  if (code === "LT") {
    return { rate: 0.21, label: "VAT 21%", description: "Standard Lithuanian VAT" };
  }

  if (EU_COUNTRY_CODES.has(code)) {
    if (vatNumber && vatNumber.trim().length > 0) {
      return { rate: 0, label: "VAT 0%", description: "EU reverse charge" };
    }
    return { rate: 0.21, label: "VAT 21%", description: "EU supply — no VAT number provided" };
  }

  return { rate: 0, label: "VAT 0%", description: "Non-EU supply" };
}

export function applyVAT(
  net: number,
  vat: VatResult
): { net: number; vatAmount: number; total: number } {
  const vatAmount = Math.round(net * vat.rate * 100) / 100;
  return { net, vatAmount, total: Math.round((net + vatAmount) * 100) / 100 };
}
