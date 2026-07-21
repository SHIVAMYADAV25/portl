import { hashPassword, comparePassword } from "../password";

describe("password utils", () => {
  it("hashes a password to something other than the plaintext", async () => {
    const hash = await hashPassword("demo1234");
    expect(hash).not.toEqual("demo1234");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(comparePassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(comparePassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const [a, b] = await Promise.all([hashPassword("demo1234"), hashPassword("demo1234")]);
    expect(a).not.toEqual(b);
  });
});
