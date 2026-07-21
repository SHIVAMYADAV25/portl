jest.mock("razorpay", () => jest.fn().mockImplementation((opts) => ({ __opts: opts })));

describe("razorpay utils", () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it("throws a clear setup error when keys are missing", () => {
    const { getRazorpay } = require("../razorpay");
    expect(() => getRazorpay()).toThrow(/RAZORPAY_KEY_ID/);
  });

  it("constructs a client once keys are set", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
    process.env.RAZORPAY_KEY_SECRET = "shhh";
    const { getRazorpay } = require("../razorpay");
    const client = getRazorpay() as any;
    expect(client.__opts).toEqual({ key_id: "rzp_test_abc", key_secret: "shhh" });
  });

  it("reuses the same client instance across calls (module-level singleton)", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
    process.env.RAZORPAY_KEY_SECRET = "shhh";
    const { getRazorpay } = require("../razorpay");
    expect(getRazorpay()).toBe(getRazorpay());
  });
});
