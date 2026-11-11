import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export interface JwtUserPayload {
  id: string;
  email: string;
  displayName: string;
}

export function signJwtToken(payload: JwtUserPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function verifyJwtToken(token: string): JwtUserPayload {
  const env = getEnv();
  const decoded = jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
  });

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof (decoded as JwtUserPayload).id !== "string" ||
    !(decoded as JwtUserPayload).id.trim() ||
    typeof (decoded as JwtUserPayload).email !== "string" ||
    !(decoded as JwtUserPayload).email.trim() ||
    typeof (decoded as JwtUserPayload).displayName !== "string" ||
    !(decoded as JwtUserPayload).displayName.trim()
  ) {
    throw new Error("Invalid JWT payload claims");
  }

  return {
    id: (decoded as JwtUserPayload).id,
    email: (decoded as JwtUserPayload).email,
    displayName: (decoded as JwtUserPayload).displayName,
  };
}
