// src/utils/auth.ts
import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  otp_verified?: boolean
}

export function isOtpVerified(token: string): boolean {
  try {
    const { otp_verified } = jwtDecode<JwtPayload>(token)

    return otp_verified === true
  } catch {
    return false
  }
}
