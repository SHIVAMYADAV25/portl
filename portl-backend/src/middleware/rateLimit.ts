import rateLimit from "express-rate-limit";

// Applies to POST /auth/request-otp and POST /auth/verify-otp.
// Tightest limit in the app: each SMS costs money and OTP is the classic SMS-bombing /
// brute-force target. Keyed by IP (express-rate-limit's default) since the phone number is
// caller-supplied and easy to rotate — IP is the only thing we can trust here.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests from this IP. Please try again in a few minutes." },
});

// Applies to POST /auth/login and POST /auth/signup — looser than OTP since these don't cost
// money per attempt, but still worth capping to slow down credential-stuffing/brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts from this IP. Please try again in a few minutes." },
});
