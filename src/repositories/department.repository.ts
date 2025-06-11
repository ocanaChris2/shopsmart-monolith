import { PrismaClient, Prisma, Department } from "@prisma/client";
import Redis from "ioredis";
import { stringifyWithDates, parseWithDates } from "../utils/dateUtils";
import { NotFoundError } from "../errors";

const prisma = new PrismaClient();
let redis: Redis;

if (process.env.NODE_ENV !== 'test') {
  redis = new Redis({
    host: process.env.REDIS_HOST || "redis",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  });
}

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `department:${method}:${identifier}`;
}

export type DepartmentWithEmployees = Prisma.DepartmentGetPayload<{
  include: { employees: true };
}>;

export const getAllDepartmentsRepo = async (): Promise<Department[]> => {
  try {
    const cacheKey = getCacheKey('all', '');
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return parseWithDates(cached);
      }
    }

    const departments = await prisma.department.findMany({
      include: { employees: true }
    });

    if (redis) {
      await redis.set(cacheKey, stringifyWithDates(departments), 'EX', CACHE_TTL);
    }
    return departments;
  } catch (err) {
    console.error("Error fetching departments:", err);
    throw new Error(`Failed to fetch departments: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const getDepartmentByIdRepo = async (
  id: string
): Promise<DepartmentWithEmployees> => {
  try {
    const cacheKey = getCacheKey('byId', id);
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return parseWithDates(cached);
      }
    }

    const department = await prisma.department.findUnique({
      where: { department_id: id },
      include: { employees: true }
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    if (redis) {
      await redis.set(cacheKey, stringifyWithDates(department), 'EX', CACHE_TTL);
    }
    return department;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    console.error("Error fetching department:", err);
    throw new Error(`Failed to fetch department: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const createDepartmentRepo = async (
  data: {
    name: string;
    description?: string;
    manager_id?: string;
    department_id: string;
  }
): Promise<Department> => {
  try {
    const department = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        manager_id: data.manager_id,
        department_id: data.department_id
      }
    });
    return department;
  } catch (err) {
    console.error("Error creating department:", err);
    throw new Error(`Failed to create department: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const updateDepartmentRepo = async (
  id: string,
  data: { name?: string; manager_id?: string | null }
): Promise<DepartmentWithEmployees> => {
  try {
    const department = await prisma.department.update({
      where: { department_id: id },
      data: {
        name: data.name,
        manager_id: data.manager_id,
        updatedAt: new Date()
      },
      include: { employees: true }
    });

    // Clear relevant cache entries
    if (redis) {
      await redis.del(getCacheKey('byId', id));
      await redis.del(getCacheKey('all', ''));
    }
    return department;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new NotFoundError('Department not found');
    }
    console.error("Error updating department:", err);
    throw new Error(`Failed to update department: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const deleteDepartmentRepo = async (
  id: string
): Promise<DepartmentWithEmployees> => {
  try {
    const department = await prisma.department.delete({
      where: { department_id: id },
      include: { employees: true }
    });

    // Clear relevant cache entries
    if (redis) {
      await redis.del(getCacheKey('byId', id));
      await redis.del(getCacheKey('all', ''));
    }
    return department;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new NotFoundError('Department not found');
    }
    console.error("Error deleting department:", err);
    throw new Error(`Failed to delete department: ${err instanceof Error ? err.message : String(err)}`);
  }
};
