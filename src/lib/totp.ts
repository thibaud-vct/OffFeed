import { TOTP, Secret } from "otpauth"
import QRCode from "qrcode"

// 10-second window as requested
function makeTOTP(secret: string): TOTP {
  return new TOTP({ secret: Secret.fromBase32(secret), period: 10, digits: 6, algorithm: "SHA1" })
}

export function generateSecret(): string {
  return new Secret({ size: 20 }).base32
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    const totp = makeTOTP(secret)
    const delta = totp.validate({ token: token.replace(/\s/g, ""), window: 1 })
    return delta !== null
  } catch {
    return false
  }
}

export async function generateQRDataURL(secret: string, issuer: string, account: string): Promise<string> {
  const totp = makeTOTP(secret)
  totp.issuer = issuer
  totp.label = account
  const uri = totp.toString()
  return QRCode.toDataURL(uri, { width: 200, margin: 2 })
}
