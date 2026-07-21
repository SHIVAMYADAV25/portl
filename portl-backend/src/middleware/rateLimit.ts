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

// Society bootstrap creates a brand-new tenant + admin account from one public request — the
// most sensitive open endpoint in the app, so it gets the tightest limit of all.
export const bootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many society creation attempts from this IP. Please try again later." },
});

// Applies to invite-sending and invite-activation — caps invite spam (an admin mass-inviting)
// and token brute-forcing (guessing at an activation token) with the same limiter.
export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a few minutes." },
});
