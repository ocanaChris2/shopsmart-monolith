import { describe, it, expect, vi, beforeEach } from "vitest";
import * as DepartmentRepository from "../../src/repositories/department.repository";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { stringifyWithDates } from "../../src/utils/dateUtils";

type MockDepartmentMethods = {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

vi.mock("@prisma/client", () => {
  const mockDepartmentMethods: MockDepartmentMethods = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const PrismaClient = vi.fn(() => ({
    department: mockDepartmentMethods,
  }));

  return { PrismaClient };
});

vi.mock("ioredis", () => {
  const Redis = vi.fn();
  Redis.prototype.get = vi.fn();
  Redis.prototype.setex = vi.fn();
  Redis.prototype.del = vi.fn().mockResolvedValue(1);
  return { default: Redis };
});

const mockDepartment = {
  department_id: "dept-1",
  name: "Engineering",
  description: null,
  manager_id: "emp-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  employees: [
    {
      employee_id: "emp-1",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone_number: null,
      hire_date: new Date("2025-01-01"),
      job_title: "Manager",
      department_id: "dept-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const mockBasicDepartment = {
  department_id: "dept-1",
  name: "Engineering",
  manager_id: "emp-1",
  employees: [
    {
      employee_id: "emp-1",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone_number: null,
      hire_date: new Date("2025-01-01"),
      job_title: "Manager",
      department_id: "dept-1",
    },
  ],
};

describe("DepartmentRepository", () => {
  let redis: Redis;
  let prisma: PrismaClient;
  let departmentMock: MockDepartmentMethods;

  beforeEach(() => {
    redis = new Redis();
    prisma = new PrismaClient();
    departmentMock = prisma.department as unknown as MockDepartmentMethods;
    vi.clearAllMocks();

    departmentMock.findMany.mockResolvedValue([mockDepartment]);
    departmentMock.findUnique.mockResolvedValue(mockDepartment);
    departmentMock.create.mockResolvedValue(mockDepartment);
    departmentMock.update.mockResolvedValue({
      ...mockDepartment,
      name: "Updated Engineering",
    });
    departmentMock.delete.mockResolvedValue(mockBasicDepartment);
  });

  describe("CRUD Operations", () => {
    it("should get department by id", async () => {
      const result = await DepartmentRepository.getDepartmentByIdRepo("dept-1");
      expect(result).toEqual(mockDepartment);
    });

    it("should update a department", async () => {
      const result = await DepartmentRepository.updateDepartmentRepo("dept-1", {
        name: "Updated Engineering",
      });
      expect(result).toEqual({
        ...mockDepartment,
        name: "Updated Engineering",
      });
    });

    it("should delete a department", async () => {
      const result = await DepartmentRepository.deleteDepartmentRepo("dept-1");
      expect(result).toEqual(mockBasicDepartment);
    });
  });
});
