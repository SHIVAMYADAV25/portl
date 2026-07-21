// Mock the "twilio" package before any test imports ../twilio, since twilio.ts calls
// twilio(sid, token) at module load time once TWILIO_ACCOUNT_SID/TOKEN are set.
const verificationsCreate = jest.fn();
const verificationChecksCreate = jest.fn();

jest.mock("twilio", () => {
  return jest.fn(() => ({
    verify: {
      v2: {
        services: () => ({
          verifications: { create: verificationsCreate },
          verificationChecks: { create: verificationChecksCreate },
        }),
      },
    },
  }));
});

describe("twilio utils — not configured (demo mode)", () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
  });

  it("isTwilioConfigured() is false with no env vars set", () => {
    const { isTwilioConfigured } = require("../twilio");
    expect(isTwilioConfigured()).toBe(false);
  });

  it("sendOtp() fails soft to false", async () => {
    const { sendOtp } = require("../twilio");
    await expect(sendOtp("+919876543210")).resolves.toBe(false);
  });

  it("checkOtp() returns null (not false) so the caller can fall back to the demo code", async () => {
    const { checkOtp } = require("../twilio");
    await expect(checkOtp("+919876543210", "1234")).resolves.toBeNull();
  });
});

describe("twilio utils — configured", () => {
  beforeEach(() => {
    jest.resetModules();
    verificationsCreate.mockReset();
    verificationChecksCreate.mockReset();
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VAtest";
  });

  it("isTwilioConfigured() is true once all three env vars are set", () => {
    const { isTwilioConfigured } = require("../twilio");
    expect(isTwilioConfigured()).toBe(true);
  });

  it("sendOtp() calls Twilio Verify and returns true on success", async () => {
    verificationsCreate.mockResolvedValueOnce({ status: "pending" });
    const { sendOtp } = require("../twilio");
    await expect(sendOtp("+919876543210")).resolves.toBe(true);
    expect(verificationsCreate).toHaveBeenCalledWith({ to: "+919876543210", channel: "sms" });
  });

  it("sendOtp() fails soft to false if Twilio throws", async () => {
    verificationsCreate.mockRejectedValueOnce(new Error("Twilio unreachable"));
    const { sendOtp } = require("../twilio");
    await expect(sendOtp("+919876543210")).resolves.toBe(false);
  });

  it("checkOtp() returns true when Twilio approves the code", async () => {
    verificationChecksCreate.mockResolvedValueOnce({ status: "approved" });
    const { checkOtp } = require("../twilio");
    await expect(checkOtp("+919876543210", "4242")).resolves.toBe(true);
  });

  it("checkOtp() returns false when Twilio rejects the code", async () => {
    verificationChecksCreate.mockResolvedValueOnce({ status: "pending" });
    const { checkOtp } = require("../twilio");
    await expect(checkOtp("+919876543210", "0000")).resolves.toBe(false);
  });

  it("checkOtp() returns null (not false) if Twilio throws — distinguishes 'couldn't check' from 'wrong code'", async () => {
    verificationChecksCreate.mockRejectedValueOnce(new Error("Twilio unreachable"));
    const { checkOtp } = require("../twilio");
    await expect(checkOtp("+919876543210", "4242")).resolves.toBeNull();
  });
});

describe("toE164", () => {
  it("adds +91 to a plain 10-digit number", () => {
    const { toE164 } = require("../twilio");
    expect(toE164("9876543210")).toBe("+919876543210");
  });

  it("leaves an already-E.164 number untouched", () => {
    const { toE164 } = require("../twilio");
    expect(toE164("+15551234567")).toBe("+15551234567");
  });
});
