import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

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
    if (cached) return JSON.parse(cached);
    
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
    if (cached) return JSON.parse(cached);
    
    const employee = await prisma.employee.findUnique({
      where: { employee_id: id },
      include: { department: true }
    });
    if (employee) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(employee));
    }
    return employee;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.employee.findUnique({
      where: { employee_id: id },
      include: { department: true }
    });
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
};

export const deleteEmployee = async (id: string) => {
  const result = await prisma.employee.delete({
    where: { employee_id: id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
