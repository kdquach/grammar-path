import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "grammarpath-dev-jwt-super-secret-key-32chars-minimum-2026";
const JWT_EXPIRES_IN = "7d";

export interface JwtUserPayload {
  id: string;
  email: string;
  displayName: string;
}

export function signJwtToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwtToken(token: string): JwtUserPayload {
  return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
}
