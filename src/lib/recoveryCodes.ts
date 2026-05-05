import { randomBytes, createHash, timingSafeEqual } from "crypto"

const CODE_COUNT = 8
const CODE_FORMAT = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, () => {
    const bytes = randomBytes(9) // 9 bytes → 18 hex chars → we use base32-ish
    const hex = bytes.toString("hex").toUpperCase().slice(0, 15)
    return `${hex.slice(0, 5)}-${hex.slice(5, 10)}-${hex.slice(10, 15)}`
  })
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.replace(/-/g, "").toUpperCase()).digest("hex")
}

export function hashCodes(codes: string[]): string[] {
  return codes.map(hashCode)
}

export function verifyAndConsume(
  input: string,
  hashedCodes: string[],
): { valid: boolean; remaining: string[] } {
  const inputHash = hashCode(input)
  let found = false
  const remaining = hashedCodes.filter((h) => {
    if (!found) {
      const a = Buffer.from(h.padEnd(64).slice(0, 64))
      const b = Buffer.from(inputHash.padEnd(64).slice(0, 64))
      try {
        if (timingSafeEqual(a, b) && h === inputHash) { found = true; return false }
      } catch { /* length mismatch */ }
    }
    return true
  })
  return { valid: found, remaining }
}
