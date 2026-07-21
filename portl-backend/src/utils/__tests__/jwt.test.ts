import { signAccessToken, signRefreshToken, verifyToken, TokenPayload } from "../jwt";

describe("jwt utils", () => {
  const payload: TokenPayload = { sub: "user-1", role: "resident", phone: "9876543210" };

  it("signs and verifies an access token round-trip", () => {
    const token = signAccessToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.phone).toBe(payload.phone);
  });

  it("signs and verifies a refresh token round-trip", () => {
    const token = signRefreshToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -2) + (token.slice(-2) === "aa" ? "bb" : "aa");
    expect(() => verifyToken(tampered)).toThrow();
  });

  it("rejects garbage input", () => {
    expect(() => verifyToken("not-a-real-jwt")).toThrow();
  });

  it("access and refresh tokens for the same payload are different strings", () => {
    // Different expiries (and usually different `iat` timing) mean they should never collide.
    const access = signAccessToken(payload);
    const refresh = signRefreshToken(payload);
    expect(access).not.toEqual(refresh);
  });
});
