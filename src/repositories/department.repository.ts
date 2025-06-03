import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `department:${method}:${identifier}`;
}

export const getAllDepartments = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const departments = await prisma.department.findMany({
      include: { employees: true }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(departments));
    return departments;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.department.findMany({
      include: { employees: true }
    });
  }
};

export const getDepartmentById = async (id: string) => {
  const cacheKey = getCacheKey('id', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const department = await prisma.department.findUnique({
      where: { department_id: id },
      include: { employees: true }
    });
    if (department) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(department));
    }
    return department;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.department.findUnique({
      where: { department_id: id },
      include: { employees: true }
    });
  }
};

export const createDepartment = async (data: {
  department_id: string;
  name: string;
  manager_id?: string;
}) => {
  const department = await prisma.department.create({ 
    data,
    include: { employees: true }
  });
  // Invalidate all departments cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return department;
};

export const updateDepartment = async (id: string, data: {
  name?: string;
  manager_id?: string;
}) => {
  const department = await prisma.department.update({
    where: { department_id: id },
    data,
    include: { employees: true }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return department;
};

export const deleteDepartment = async (id: string) => {
  const result = await prisma.department.delete({
    where: { department_id: id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
