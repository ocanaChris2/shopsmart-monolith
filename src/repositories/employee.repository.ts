import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { NotFoundError } from '../errors';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `employee:${method}:${identifier}`;
}

export const getAllEmployees = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Convert string dates back to Date objects
      if (Array.isArray(parsed)) {
        return parsed.map(employee => ({
          ...employee,
          hire_date: new Date(employee.hire_date),
          createdAt: new Date(employee.createdAt),
          updatedAt: new Date(employee.updatedAt)
        }));
      }
      return {
        ...parsed,
        hire_date: new Date(parsed.hire_date),
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt)
      };
    }
    
    const employees = await prisma.employee.findMany({
      include: { department: true }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(employees));
    return employees;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.employee.findMany({
      include: { department: true }
    });
  }
};

export const getEmployeeById = async (id: string) => {
  const cacheKey = getCacheKey('id', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        hire_date: new Date(parsed.hire_date),
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt)
      };
    }
  } catch (redisErr) {
    console.error('Redis error, falling back to DB', redisErr);
  }
  
  try {
    const employee = await prisma.employee.findUnique({
      where: { employee_id: id },
      include: { department: true }
    });
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    // Try to cache the result, but don't fail if Redis is down
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(employee));
    } catch (cacheErr) {
      console.error('Redis caching error:', cacheErr);
    }
    return employee;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    console.error('Database error accessing employee:', err);
    throw new Error(`Failed to fetch employee: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

export const createEmployee = async (data: {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  hire_date: Date;
  job_title?: string;
  department_id?: string;
}) => {
  const employee = await prisma.employee.create({ 
    data,
    include: { department: true }
  });
  // Invalidate all employees cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return employee;
};

export const updateEmployee = async (id: string, data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  job_title?: string;
  department_id?: string;
}) => {
  try {
    // First verify employee exists
    const existing = await prisma.employee.findUnique({
      where: { employee_id: id }
    });
    if (!existing) {
      throw new NotFoundError('Employee not found');
    }

    const employee = await prisma.employee.update({
      where: { employee_id: id },
      data,
      include: { department: true }
    });
    // Invalidate all relevant caches
    await Promise.all([
      redis.del(getCacheKey('id', id)),
      redis.del(getCacheKey('all', ''))
    ]).catch(console.error);
    return employee;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    console.error('Database/Redis error updating employee:', err);
    throw new Error(`Failed to update employee: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

export const deleteEmployee = async (id: string) => {
  try {
    // First verify employee exists
    const existing = await prisma.employee.findUnique({
      where: { employee_id: id }
    });
    if (!existing) {
      throw new NotFoundError('Employee not found');
    }

    const result = await prisma.employee.delete({
      where: { employee_id: id }
    });
    // Invalidate all relevant caches
    await Promise.all([
      redis.del(getCacheKey('id', id)),
      redis.del(getCacheKey('all', ''))
    ]).catch(console.error);
    return result;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    console.error('Database/Redis error deleting employee:', err);
    throw new Error(`Failed to delete employee: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
