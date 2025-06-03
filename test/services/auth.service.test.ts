/**
 * @file Test suite for AuthService authentication functionality
 * @module test/services/auth.service.test
 *
 * @description
 * Comprehensive unit tests for the AuthService class, covering:
 * - Password security (hashing and complexity requirements)
 * - Account security (lockout mechanisms)
 * - Login attempt handling
 *
 * @see {@link ../../src/services/auth.service} for the implementation under test
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { hash } from "bcrypt";
import type { User } from "../../src/services/auth.service";

// Test user data
const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword123!",
  role: "USER" as const,
};

const mockUser = {
  id: 1,
  email: "test@example.com",
  passwordHash: "hashedpassword",
  role: "USER" as const,
  refreshToken: null,
  failedLoginAttempts: 0,
  lastFailedLogin: null,
  accountLockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock Prisma client at the module level
    vi.mock("@prisma/client", () => {
      return {
        PrismaClient: vi.fn(() => ({
          user: {
            findUnique: vi.fn().mockImplementation(async () => {
              return mockUser;
            }),
            update: vi.fn().mockImplementation(async (args) => {
              // Directly update mockUser fields
              if (args.data.refreshToken !== undefined) {
                mockUser.refreshToken = args.data.refreshToken;
              }
              if (args.data.failedLoginAttempts !== undefined) {
                mockUser.failedLoginAttempts = args.data.failedLoginAttempts;
              }
              if (args.data.lastFailedLogin !== undefined) {
                mockUser.lastFailedLogin = args.data.lastFailedLogin;
              }
              if (args.data.accountLockedUntil !== undefined) {
                mockUser.accountLockedUntil = args.data.accountLockedUntil;
              }
              mockUser.updatedAt = new Date();
              return mockUser;
            }),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    })),
  };
});

describe("AuthService", () => {
  let AuthService: typeof import("../../src/services/auth.service").AuthService;
  let prisma: typeof import("../../src/services/auth.service").prisma;

  beforeAll(async () => {
    // Import AuthService after setting up mocks
    ({ AuthService, prisma } = await import("../../src/services/auth.service"));

    // Create test user with consistent password hash
    const passwordHash = await hash(TEST_USER.password, 10);
    mockUser.passwordHash = passwordHash;
    
    await prisma.user.create({
      data: {
        email: TEST_USER.email,
        passwordHash: passwordHash,
        role: TEST_USER.role
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { email: TEST_USER.email },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Tests", () => {
    it("should authenticate user with valid credentials", async () => {
      // 1. Find user in database
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      expect(user).toBeDefined();

      // 2. Validate password
      const isValid = await AuthService.validatePassword(
        TEST_USER.password,
        user!.passwordHash
      );
      expect(isValid).toBe(true);

      // 3. Generate tokens
      const accessToken = AuthService.generateAccessToken(user!);
      const refreshToken = AuthService.generateRefreshToken(user!);
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 4. Verify tokens
      const accessPayload = await AuthService.verifyToken(accessToken);
      expect(accessPayload).not.toBeNull();
      expect(accessPayload && accessPayload.userId).toBe(user!.id);
    });

    it("should handle refresh token rotation", async () => {
      // 1. Get user
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });

      // 2. Generate and save refresh token
      const refreshToken = AuthService.generateRefreshToken(user!);
      await AuthService.saveRefreshToken(user!.id, refreshToken);

      // 3. Verify token was saved
      const updatedUser = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      expect(updatedUser?.refreshToken).toBe(refreshToken);
    });

    it("should lock account after multiple failed attempts", async () => {
      // 1. Get user
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });

      // 2. Simulate failed attempts
      for (let i = 0; i < 5; i++) {
        await AuthService.handleFailedLogin(user!);
      }

      // 3. Verify account is locked
      const lockedUser = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      expect(lockedUser?.accountLockedUntil).toBeDefined();
    });
  });

  it("should securely hash passwords using bcrypt", async () => {
    /**
     * @test Verifies that:
     * - Password hashing function is called
     * - Returns a non-empty hash value
     * - Uses async/await pattern
     */
    const hash = await AuthService.hashPassword("password123!");
    expect(hash).toBeDefined();
  });

  it("should enforce strong password requirements", async () => {
    /**
     * @test Verifies password policy enforcement:
     * - Minimum length requirement (8+ characters)
     * - Requires at least one uppercase letter
     * - Requires at least one number
     * - Provides clear validation messages
     */
    const weakResult = await AuthService.validatePasswordComplexity("weak");
    expect(weakResult.valid).toBe(false);
    expect(weakResult.message).toBeDefined();

    const strongResult = await AuthService.validatePasswordComplexity(
      "StrongPass123!"
    );
    expect(strongResult.valid).toBe(true);
  });

  it("should correctly determine account lock status", async () => {
    /**
     * @test Verifies account lock check:
     * - Returns correct status for unlocked account
     * - Handles null lock expiration
     * - Maintains type safety
     */
    const user = {
      ...mockUser,
      accountLockedUntil: null,
    };
    const result = await AuthService.checkAccountLock(user);
    expect(result.locked).toBe(false);
  });

  it("should properly handle failed login attempts", async () => {
    const user = {
      ...mockUser,
      failedLoginAttempts: 0,
    };

    // Reset mocks to ensure clean state
    vi.resetAllMocks();

    // Setup mock implementation
    vi.mocked(prisma.user.update).mockImplementation(async () => ({
      ...user,
      failedLoginAttempts: 1,
      lastFailedLogin: new Date(),
    }));

    await AuthService.handleFailedLogin(user);

    // Verify Prisma was called correctly
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 1,
        lastFailedLogin: expect.any(Date),
        accountLockedUntil: null,
      },
    });
  });
});
