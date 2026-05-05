import { createHmac, timingSafeEqual, randomBytes } from "crypto"

const TTL_MS = 3 * 60 * 1000 // 3 minutes

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error("NEXTAUTH_SECRET missing")
  return s
}

export function signPreToken(): string {
  // Add random nonce so two tokens at the same ms are distinct
  const ts = Date.now()
  const nonce = randomBytes(8).toString("hex")
  const data = `${ts}.${nonce}`
  const sig = createHmac("sha256", secret()).update(data).digest("hex")
  return `${data}.${sig}`
}

export function verifyPreToken(token: string): boolean {
  try {
    // Format: timestamp.nonce.sig
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const [ts, nonce, sig] = parts
    if (!ts || !nonce || !sig || sig.length !== 64) return false
    if (Date.now() - Number(ts) > TTL_MS) return false
    const data = `${ts}.${nonce}`
    const expected = createHmac("sha256", secret()).update(data).digest("hex")
    // Purely timing-safe comparison — no string equality fallback
    const a = Buffer.from(sig, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
