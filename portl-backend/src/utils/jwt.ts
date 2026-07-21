import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "portl-dev-secret-change-me";
const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_TTL = "30d";

export interface TokenPayload {
  sub: string; // user id
  role: "resident" | "guard" | "admin";
  phone: string;
}

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
