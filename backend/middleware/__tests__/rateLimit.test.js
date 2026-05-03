const { getOtpIdentifierKey } = require("../rateLimit");

describe("rateLimit otp keying", () => {
  test("uses normalized phone identifier for phone OTP requests", () => {
    const key = getOtpIdentifierKey({
      body: {
        type: "phone",
        identifier: "+91 98765-43210",
      },
    });

    expect(key).toBe("919876543210");
  });

  test("uses normalized email identifier for email OTP requests", () => {
    const key = getOtpIdentifierKey({
      body: {
        type: "email",
        identifier: " Test@Example.com ",
      },
    });

    expect(key).toBe("email:test@example.com");
  });

  test("falls back to empty key for unsupported types", () => {
    const key = getOtpIdentifierKey({
      body: {
        type: "unknown",
        identifier: "value",
      },
    });

    expect(key).toBe("");
  });
});
