import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `customer:${method}:${identifier}`;
}

const dateReviver = (key: string, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  return value;
};

export const getAllCustomers = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached, dateReviver);
    
    const customers = await prisma.customer.findMany();
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(customers));
    return customers;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.customer.findMany();
  }
};

export const getCustomerById = async (id: number) => {
  const cacheKey = getCacheKey('id', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached, dateReviver);
    
    const customer = await prisma.customer.findUnique({
      where: { customer_id: id }
    });
    if (customer) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(customer));
    }
    return customer;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.customer.findUnique({
      where: { customer_id: id }
    });
  }
};

export const createCustomer = async (data: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}) => {
  const customer = await prisma.customer.create({ data });
  // Invalidate all customers cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return customer;
};

export const updateCustomer = async (id: number, data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}) => {
  const customer = await prisma.customer.update({
    where: { customer_id: id },
    data
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return customer;
};

export const deleteCustomer = async (id: number) => {
  const result = await prisma.customer.delete({
    where: { customer_id: id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
