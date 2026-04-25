jest.mock("../../services/otpStore", () => ({
  getOtpStore: jest.fn(),
}));

jest.mock("../../services/funnelService", () => ({
  recordFunnelStage: jest.fn(),
}));

jest.mock("../../services/emailService", () => ({
  sendOtpEmail: jest.fn(),
}));

jest.mock("../../services/userService", () => ({
  findOrCreateUserByGoogleProfile: jest.fn(),
  findOrCreateUserByIdentifier: jest.fn(),
}));

jest.mock("../../services/googleAuthService", () => ({
  verifyGoogleIdToken: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../../services/emailService");
const { verifyGoogleIdToken } = require("../../services/googleAuthService");
const { getOtpStore } = require("../../services/otpStore");
const { findOrCreateUserByGoogleProfile, findOrCreateUserByIdentifier } = require("../../services/userService");
const { googleLogin, login, verify } = require("../authController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendOtpEmail.mockResolvedValue();
    process.env.JWT_SECRET = "test-secret";
    process.env.DEMO_OTP_ENABLED = "false";
    process.env.DEMO_OTP_CODE = "123456";
    process.env.DEMO_OTP_PHONES = "";
    process.env.SMS_OTP_ENABLED = "false";
    process.env.EXPOSE_OTP_IN_RESPONSE = "false";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
  });

  test("login returns 400 for invalid phone", async () => {
    const req = { body: { type: "phone", identifier: "123" } };
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

    const req = { body: { type: "phone", identifier: "9876543210" } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ message: "Rate limit exceeded. Try again later." });
  });

  test("login saves OTP and returns success for email", async () => {
    const saveOtp = jest.fn().mockResolvedValue();
    getOtpStore.mockReturnValue({
      isRateLimited: jest.fn().mockResolvedValue(false),
      saveOtp,
      clearOtp: jest.fn().mockResolvedValue(),
    });

    const req = { body: { type: "email", identifier: "test@example.com" } };
    const res = createResponse();

    await login(req, res);

    expect(saveOtp).toHaveBeenCalledWith("email:test@example.com", expect.stringMatching(/^\d{6}$/));
    expect(sendOtpEmail).toHaveBeenCalledWith("test@example.com", expect.stringMatching(/^\d{6}$/));
    expect(res.json).toHaveBeenCalledWith({ message: "OTP sent" });
  });

  test("login saves OTP and returns success for phone when sms is disabled", async () => {
    const saveOtp = jest.fn().mockResolvedValue();
    getOtpStore.mockReturnValue({
      isRateLimited: jest.fn().mockResolvedValue(false),
      saveOtp,
    });

    const req = { body: { type: "phone", identifier: "9876543210" } };
    const res = createResponse();

    await login(req, res);

    expect(saveOtp).toHaveBeenCalledWith("phone:9876543210", expect.stringMatching(/^\d{6}$/));
    expect(res.json).toHaveBeenCalledWith({ message: "OTP sent" });
  });

  test("login can expose generated OTP in response", async () => {
    process.env.EXPOSE_OTP_IN_RESPONSE = "true";
    getOtpStore.mockReturnValue({
      isRateLimited: jest.fn().mockResolvedValue(false),
      saveOtp: jest.fn().mockResolvedValue(),
    });

    const req = { body: { type: "phone", identifier: "9876543210" } };
    const res = createResponse();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "OTP sent",
        debugOtp: expect.stringMatching(/^\d{6}$/),
      })
    );
  });

  test("verify returns 400 for invalid payload", async () => {
    const req = { body: { type: "phone", identifier: "123", otp: "12" } };
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

    const req = { body: { type: "phone", identifier: "9876543210", otp: "123456", lang: "hi" } };
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
    findOrCreateUserByIdentifier.mockResolvedValue({
      id: "user-1",
      phone: "9876543210",
      lang: "hi",
    });

    const req = { body: { type: "phone", identifier: "9876543210", otp: "123456", lang: "hi" } };
    const res = createResponse();

    await verify(req, res);

    expect(clearOtp).toHaveBeenCalledWith("phone:9876543210");
    expect(findOrCreateUserByIdentifier).toHaveBeenCalledWith("9876543210", "phone", "hi");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: expect.any(String),
      needsRegistration: true,
      user: expect.objectContaining({
        id: "user-1",
        phone: "9876543210",
        lang: "hi",
        photoType: "none",
        onboardingDone: false,
      }),
    }));

    const payload = jwt.verify(res.json.mock.calls[0][0].token, process.env.JWT_SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe("user");
  });

  test("verify supports demo OTP mode", async () => {
    process.env.DEMO_OTP_ENABLED = "true";
    process.env.DEMO_OTP_CODE = "123456";

    getOtpStore.mockReturnValue({
      getOtp: jest.fn().mockResolvedValue("123456"),
      clearOtp: jest.fn().mockResolvedValue(),
    });
    findOrCreateUserByIdentifier.mockResolvedValue({
      id: "user-2",
      phone: "9999999999",
      lang: "en",
    });

    const req = { body: { type: "phone", identifier: "9999999999", otp: "123456", lang: "en" } };
    const res = createResponse();

    await verify(req, res);

    expect(findOrCreateUserByIdentifier).toHaveBeenCalledWith("9999999999", "phone", "en");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      token: expect.any(String),
      needsRegistration: true,
      user: expect.objectContaining({
        id: "user-2",
        phone: "9999999999",
        lang: "en",
        photoType: "none",
        onboardingDone: false,
      }),
    }));
  });

  test("googleLogin returns 400 when credential is missing", async () => {
    const req = { body: {} };
    const res = createResponse();

    await googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Google credential is required" });
  });

  test("googleLogin verifies credential and returns app token", async () => {
    verifyGoogleIdToken.mockResolvedValue({
      sub: "google-sub-1",
      email: "test@example.com",
      emailVerified: true,
      name: "Test User",
      picture: "https://lh3.googleusercontent.com/a/test",
    });
    findOrCreateUserByGoogleProfile.mockResolvedValue({
      id: "user-google-1",
      email: "test@example.com",
      google_sub: "google-sub-1",
      email_verified: true,
      name: "Test User",
      photo_url: "https://lh3.googleusercontent.com/a/test",
      photo_type: "upload",
      onboarding_done: true,
      lang: "en",
    });

    const req = { body: { credential: "google-id-token", lang: "en" } };
    const res = createResponse();

    await googleLogin(req, res);

    expect(verifyGoogleIdToken).toHaveBeenCalledWith("google-id-token", "google-client-id");
    expect(findOrCreateUserByGoogleProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "google-sub-1",
        email: "test@example.com",
      }),
      "en"
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        needsRegistration: false,
        user: expect.objectContaining({
          id: "user-google-1",
          email: "test@example.com",
          photoType: "upload",
          onboardingDone: true,
        }),
      })
    );
  });
});
