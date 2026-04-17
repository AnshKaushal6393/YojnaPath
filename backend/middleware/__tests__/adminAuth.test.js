const jwt = require("jsonwebtoken");

const { requireAdminAuth, verifyAdmin } = require("../adminAuth");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("adminAuth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_JWT_SECRET = "admin-test-secret";
  });

  test("returns 401 without bearer token", () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    requireAdminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts admin token with role claim", () => {
    const token = jwt.sign(
      { adminId: "admin-1", email: "admin@example.com", role: "admin" },
      process.env.ADMIN_JWT_SECRET
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireAdminAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
    });
  });

  test("accepts admin token with isAdmin claim", () => {
    const token = jwt.sign(
      { adminId: "admin-2", email: "owner@example.com", isAdmin: true },
      process.env.ADMIN_JWT_SECRET
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.admin).toEqual({
      id: "admin-2",
      email: "owner@example.com",
      role: "admin",
    });
  });

  test("rejects non-admin token", () => {
    const token = jwt.sign(
      { adminId: "admin-3", email: "user@example.com", role: "user" },
      process.env.ADMIN_JWT_SECRET
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createResponse();
    const next = jest.fn();

    requireAdminAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});
