jest.mock("../../services/otpStore", () => ({
  getOtpStore: jest.fn(),
}));

jest.mock("../../services/userService", () => ({
  findOrCreateUserByPhone: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const { getOtpStore } = require("../../services/otpStore");
const { findOrCreateUserByPhone } = require("../../services/userService");
const { login, verify } = require("../authController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.DEMO_OTP_ENABLED = "false";
    process.env.DEMO_OTP_CODE = "123456";
    process.env.DEMO_OTP_PHONES = "";
  });

  test("login returns 400 for invalid phone", async () => {
    const req = { body: { phone: "123" } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Valid 10-digit phone is required" });
  });

  test("login returns 429 when rate limited", async () => {
    getOtpStore.mockReturnValue({
      isRateLimited: jest.fn().mockResolvedValue(true),
      saveOtp: jest.fn(),
    });

    const req = { body: { phone: "9876543210" } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ message: "Rate limit exceeded. Try again later." });
  });

  test("login saves OTP and returns success", async () => {
    const saveOtp = jest.fn().mockResolvedValue();
    getOtpStore.mockReturnValue({
      isRateLimited: jest.fn().mockResolvedValue(false),
      saveOtp,
    });

    const req = { body: { phone: "9876543210" } };
    const res = createResponse();

    await login(req, res);

    expect(saveOtp).toHaveBeenCalledWith("9876543210", expect.stringMatching(/^\d{6}$/));
    expect(res.json).toHaveBeenCalledWith({ message: "OTP sent" });
  });

  test("verify returns 400 for invalid payload", async () => {
    const req = { body: { phone: "123", otp: "12" } };
    const res = createResponse();

    await verify(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Valid phone and 6-digit OTP are required" });
  });

  test("verify returns 401 for wrong OTP", async () => {
    getOtpStore.mockReturnValue({
      getOtp: jest.fn().mockResolvedValue("654321"),
      clearOtp: jest.fn(),
    });

    const req = { body: { phone: "9876543210", otp: "123456", lang: "hi" } };
    const res = createResponse();

    await verify(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "OTP wrong or expired" });
  });

  test("verify returns token and user for stored OTP match", async () => {
    const clearOtp = jest.fn().mockResolvedValue();
    getOtpStore.mockReturnValue({
      getOtp: jest.fn().mockResolvedValue("123456"),
      clearOtp,
    });
    findOrCreateUserByPhone.mockResolvedValue({
      id: "user-1",
      phone: "9876543210",
      lang: "hi",
    });

    const req = { body: { phone: "9876543210", otp: "123456", lang: "hi" } };
    const res = createResponse();

    await verify(req, res);

    expect(clearOtp).toHaveBeenCalledWith("9876543210");
    expect(findOrCreateUserByPhone).toHaveBeenCalledWith("9876543210", "hi");
    expect(res.json).toHaveBeenCalledWith({
      token: expect.any(String),
      user: {
        id: "user-1",
        phone: "9876543210",
        lang: "hi",
      },
    });

    const payload = jwt.verify(res.json.mock.calls[0][0].token, process.env.JWT_SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.phone).toBe("9876543210");
    expect(payload.role).toBe("user");
  });

  test("verify supports demo OTP mode", async () => {
    process.env.DEMO_OTP_ENABLED = "true";
    process.env.DEMO_OTP_CODE = "123456";

    getOtpStore.mockReturnValue({
      getOtp: jest.fn(),
      clearOtp: jest.fn(),
    });
    findOrCreateUserByPhone.mockResolvedValue({
      id: "user-2",
      phone: "9999999999",
      lang: "en",
    });

    const req = { body: { phone: "9999999999", otp: "123456", lang: "en" } };
    const res = createResponse();

    await verify(req, res);

    expect(findOrCreateUserByPhone).toHaveBeenCalledWith("9999999999", "en");
    expect(res.json).toHaveBeenCalledWith({
      token: expect.any(String),
      user: {
        id: "user-2",
        phone: "9999999999",
        lang: "en",
      },
    });
  });
});
