import Razorpay from "razorpay";

let client: Razorpay | null = null;

export function getRazorpay() {
  if (client) return client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env (get test keys from the Razorpay dashboard)."
    );
  }
  client = new Razorpay({ key_id, key_secret });
  return client;
}
