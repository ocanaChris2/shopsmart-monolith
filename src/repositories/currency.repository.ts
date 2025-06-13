import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import Redis from 'ioredis';
import { NotFoundError } from '../errors';

function jsonDateReviver(key: string, value: any) {
  const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  if (typeof value === 'string' && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `currency:${method}:${identifier}`;
}

export const getAllCurrencies = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached, jsonDateReviver);
    
    const currencies = await prisma.currency.findMany();
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(currencies));
    return currencies;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.currency.findMany();
  }
};
export const getCurrencyByCode = async (code: string) => {
  const cacheKey = getCacheKey('code', code);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached, jsonDateReviver);

    const currency = await prisma.currency.findUnique({
      where: { currency_code: code }
    });
    if (!currency) {
      return null;
    }
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(currency));
    return currency;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    const currency = await prisma.currency.findUnique({
      where: { currency_code: code }
    });
    if (!currency) {
      return null;
    }
    return currency;
  }
};

export const createCurrency = async (data: {
  currency_code: string;
  name: string;
  symbol?: string;
}) => {
  const currency = await prisma.currency.create({ data });
  // Invalidate all currencies cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return currency;
};

export const updateCurrency = async (code: string, data: {
  name?: string;
  symbol?: string;
}) => {
  try {
    const currency = await prisma.currency.update({
      where: { currency_code: code },
      data
    });
    // Invalidate all relevant caches
    await Promise.all([
      redis.del(getCacheKey('code', code)),
      redis.del(getCacheKey('all', ''))
    ]).catch(console.error);
    return currency;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundError('Currency not found');
    }
    throw error;
  }
};

export const deleteCurrency = async (code: string) => {
  try {
    const result = await prisma.currency.delete({
      where: { currency_code: code }
    });
    // Invalidate all relevant caches
    await Promise.all([
      redis.del(getCacheKey('code', code)),
      redis.del(getCacheKey('all', ''))
    ]).catch(console.error);
    return result;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundError('Currency not found');
    }
    throw error;
  }
};
