import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Helper to revive Date objects from JSON strings
const dateReviver = (key: string, value: any) => {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  return typeof value === 'string' && dateFormat.test(value) 
    ? new Date(value) 
    : value;
};
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `company:${method}:${identifier}`;
}

export const getAllCompanies = async (tx?: any) => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached, dateReviver);
    
    const db = tx || prisma;
    const companies = await db.company.findMany();
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(companies));
    return companies;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    const db = tx || prisma;
    return await db.company.findMany();
  }
};

export const getCompanyById = async (id: number, tx?: any) => {
  const cacheKey = getCacheKey('id', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached, dateReviver);
    
    const db = tx || prisma;
    const company = await db.company.findUnique({
      where: { company_id: id }
    });
    if (company) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(company));
    } else {
      // Explicitly handle not found case
      throw new Error('Company not found');
    }
    return company;
  } catch (err) {
    // Ensure "Company not found" errors are propagated correctly
    if (err instanceof Error && err.message === 'Company not found') {
      throw err;
    }
    
    console.error('Redis error, falling back to DB', err);
    const db = tx || prisma;
    const company = await db.company.findUnique({
      where: { company_id: id }
    });
    
    if (!company) {
      throw new Error('Company not found');
    }
    
    return company;
  }
};

export const createCompany = async (data: {
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
}, tx?: any) => {
  const db = tx || prisma;
  const company = await db.company.create({ data });
  // Invalidate all companies cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return company;
};

export const updateCompany = async (id: number, data: {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}, tx?: any) => {
  try {
    const db = tx || prisma;
    const company = await db.company.update({
      where: { company_id: id },
      data
    });
    // Invalidate all relevant caches
    await Promise.all([
      redis.del(getCacheKey('id', id)),
      redis.del(getCacheKey('all', ''))
    ]).catch(console.error);
    return company;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Company not found');
    }
    throw err;
  }
};

export const deleteCompany = async (id: number, tx?: any) => {
  try {
    const db = tx || prisma;
    const result = await db.company.delete({
      where: { company_id: id }
    });
    // Invalidate all relevant caches
    await Promise.all([
      redis.del(getCacheKey('id', id)),
      redis.del(getCacheKey('all', ''))
    ]).catch(console.error);
    return result;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new Error('Company not found');
    }
    throw err;
  }
};
