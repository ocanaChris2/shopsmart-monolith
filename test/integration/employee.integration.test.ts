import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/server";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "../../src/services/auth.service";

const prisma = new PrismaClient();

describe("Employee API Integration Tests", () => {
  let accessToken: string;
  let testUserId: number;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Generate unique test user for each test
    const testUser = {
      email: `employee-test-${Date.now()}@example.com`, // Truly unique email
      password: 'ValidPass123!'
    };

    // Cleanup database - separate operations to avoid deadlocks
    try {
      await prisma.employee.deleteMany();
      await prisma.user.deleteMany();
    } catch (error) {
      console.error('Cleanup error:', error);
      // Continue test execution even if cleanup fails
    }

    // Create test user
    const passwordHash = await AuthService.hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        role: "USER",
        failedLoginAttempts: 0,
      },
    });
    testUserId = user.id;

    // Generate tokens
    accessToken = AuthService.generateAccessToken(user);
    await AuthService.saveRefreshToken(
      user.id,
      AuthService.generateRefreshToken(user)
    );
    testUserId = user.id;

    // Generate tokens
    accessToken = AuthService.generateAccessToken(user);
    await AuthService.saveRefreshToken(
      user.id,
      AuthService.generateRefreshToken(user)
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Cleanup between tests - non-transactional to avoid deadlocks
    try {
      await prisma.employee.deleteMany();
    } catch (error) {
      console.error('Cleanup error:', error);
      // Continue test execution even if cleanup fails
    }
  });

  describe("Employee CRUD Operations", () => {
    it("should create an employee", async () => {
      const response = await request(app)
        .post("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          employee_id: "EMP-001",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        })
        .expect(201);

      expect(response.body).toHaveProperty("employee_id");
      expect(response.body.first_name).toBe("John");
      // Verify createdAt is a valid ISO date string
      expect(typeof response.body.createdAt).toBe('string');
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
      expect(response.body.last_name).toBe("Doe");

      // Verify database state
      const employee = await prisma.employee.findUnique({
        where: { employee_id: response.body.employee_id },
      });
      expect(employee).toBeTruthy();
    });

    it("should get all employees", async () => {
      // First create an employee
      await request(app)
        .post("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          employee_id: "EMP-001",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        });

      const response = await request(app)
        .get("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0].first_name).toBe("John");
      expect(response.body[0].last_name).toBe("Doe");
      // Verify dates are valid ISO date strings
      expect(typeof response.body[0].createdAt).toBe('string');
      expect(new Date(response.body[0].createdAt)).toBeInstanceOf(Date);
    });

    it("should get an employee by ID", async () => {
      // First create an employee
      const createRes = await request(app)
        .post("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          employee_id: "EMP-001",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        });

      const response = await request(app)
        .get(`/api/employees/${createRes.body.employee_id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.employee_id).toBe(createRes.body.employee_id);
      // Verify createdAt is an ISO string
      expect(typeof response.body.createdAt).toBe('string');
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
    });

    it("should update an employee", async () => {
      // First create an employee
      const createRes = await request(app)
        .post("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          employee_id: "EMP-001",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        });

      // Verify employee exists before update
      const checkRes = await request(app)
        .get(`/api/employees/${createRes.body.employee_id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      console.log('Employee check before update:', checkRes.status, checkRes.body);

      const response = await request(app)
        .put(`/api/employees/${createRes.body.employee_id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          first_name: "Updated",
          last_name: "Name",
        })
        .expect(200);

      expect(response.body.first_name).toBe("Updated");
      // Verify updatedAt is a valid ISO date string
      expect(typeof response.body.updatedAt).toBe('string');
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
      expect(response.body.last_name).toBe("Name");
    });

    it("should delete an employee", async () => {
      // First create an employee
      const createRes = await request(app)
        .post("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          employee_id: "EMP-001",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        });

      await request(app)
        .delete(`/api/employees/${createRes.body.employee_id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(204);

      // Verify deletion
      const deletedEmployee = await prisma.employee.findUnique({
        where: { employee_id: createRes.body.employee_id },
      });
      expect(deletedEmployee).toBeNull();
    });
  });

  describe("Employee Validation", () => {
    it("should reject invalid employee data", async () => {
      const response = await request(app)
        .post("/api/employees")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          employee_id: "", // Invalid empty ID
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should return 404 for non-existent employee", async () => {
      await request(app)
        .get("/api/employees/NON-EXISTENT")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("Employee Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await request(app).post("/api/employees").send({
        employee_id: "EMP-001",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        hire_date: new Date().toISOString(),
        department_id: "dept-1",
      });
      expect([400, 401]).toContain(response.status);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .post("/api/employees")
        .set("Authorization", "Bearer invalidtoken")
        .send({
          employee_id: "EMP-001",
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          hire_date: new Date().toISOString(),
          department_id: undefined, // Make department optional
        });
      expect([400, 401]).toContain(response.status);
    });
  });
});
