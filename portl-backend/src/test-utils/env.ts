process.env.JWT_SECRET = "test-secret-do-not-use-in-prod";
process.env.DB_DRIVER = "sqlite";
process.env.DATABASE_PATH = ":memory:";
// Deliberately leave RAZORPAY_*/TWILIO_* unset by default — tests that need them configured set
// them explicitly inside the test file, after which they re-require the module under test.
