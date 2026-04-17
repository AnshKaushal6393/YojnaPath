jest.mock("../../services/adminService", () => ({
  findAdminByEmail: jest.fn(),
  findAdminById: jest.fn(),
  recordAdminLogin: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  findAdminByEmail,
  findAdminById,
  recordAdminLogin,
} = require("../../services/adminService");
const { login, me } = require("../adminAuthController");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("adminAuthController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_JWT_SECRET = "admin-test-secret";
  });

  test("login returns 400 when email or password is missing", async () => {
    const req = { body: { email: "", password: "" } };
    const res = createResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email and password are required" });
  });

  test("login returns 401 when admin is not found", async () => {
    findAdminByEmail.mockResolvedValue(null);
    const req = { body: { email: "admin@example.com", password: "secret123" } };
    const res = createResponse();

    await login(req, res);

    expect(findAdminByEmail).toHaveBeenCalledWith("admin@example.com");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  test("login returns JWT and admin payload for valid credentials", async () => {
    findAdminByEmail.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      password_hash: bcrypt.hashSync("secret123", 4),
      last_login: null,
    });
    recordAdminLogin.mockResolvedValue();

    const req = { body: { email: "admin@example.com", password: "secret123" } };
    const res = createResponse();

    await login(req, res);

    expect(recordAdminLogin).toHaveBeenCalledWith("admin-1");
    expect(res.json).toHaveBeenCalledWith({
      token: expect.any(String),
      admin: expect.objectContaining({
        id: "admin-1",
        email: "admin@example.com",
      }),
    });

    const payload = jwt.verify(res.json.mock.calls[0][0].token, process.env.ADMIN_JWT_SECRET);
    expect(payload.adminId).toBe("admin-1");
    expect(payload.email).toBe("admin@example.com");
    expect(payload.role).toBe("admin");
    expect(payload.isAdmin).toBe(true);
  });

  test("me returns admin profile for authenticated request", async () => {
    findAdminById.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      last_login: "2026-04-17T18:00:00.000Z",
    });
    const req = { admin: { id: "admin-1" } };
    const res = createResponse();

    await me(req, res);

    expect(findAdminById).toHaveBeenCalledWith("admin-1");
    expect(res.json).toHaveBeenCalledWith({
      admin: {
        id: "admin-1",
        email: "admin@example.com",
        lastLogin: "2026-04-17T18:00:00.000Z",
      },
    });
  });
});
