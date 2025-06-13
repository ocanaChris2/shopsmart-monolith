import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/repositories/company.repository';

const prisma = new PrismaClient();

const cleanupDatabase = async () => {
  try {
    await prisma.currency.deleteMany({});
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

const cleanupRedis = async () => {
  try {
    await redis.flushall();
  } catch (error) {
    console.error('Redis cleanup failed:', error);
  }
};

describe('Currency API Integration Tests', () => {
  const testCurrency = {
    currency_code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  };

  beforeAll(async () => {
    await prisma.$connect();
    await cleanupDatabase();
    await cleanupRedis();
  });

  afterEach(async () => {
    await cleanupDatabase();
    await cleanupRedis();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/currencies', () => {
    it('should return empty array when no currencies exist', async () => {
      const response = await request(app)
        .get('/api/currencies')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all currencies', async () => {
      await prisma.currency.create({ data: testCurrency });

      const response = await request(app)
        .get('/api/currencies')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].currency_code).toBe(testCurrency.currency_code);
    });
  });

  describe('GET /api/currencies/:code', () => {
    it('should return 404 for non-existent currency', async () => {
      const response = await request(app)
        .get('/api/currencies/XYZ')
        .expect(404);

      expect(response.body.error).toMatch(/not found/i);
    });

    it('should return currency by code', async () => {
      await prisma.currency.create({ data: testCurrency });

      const response = await request(app)
        .get(`/api/currencies/${testCurrency.currency_code}`)
        .expect(200);

      expect(response.body.currency_code).toBe(testCurrency.currency_code);
    });
  });

  describe('POST /api/currencies', () => {
    it('should create new currency', async () => {
      const response = await request(app)
        .post('/api/currencies')
        .send(testCurrency)
        .expect(201);

      expect(response.body.currency_code).toBe(testCurrency.currency_code);
    });

    it('should reject invalid currency data', async () => {
      const response = await request(app)
        .post('/api/currencies')
        .send({ currency_code: 'US' }) // Invalid - too short
        .expect(400);

      expect(response.body.error).toMatch(/validation failed/i);
    });
  });

  describe('PUT /api/currencies/:code', () => {
    it('should update currency', async () => {
      await prisma.currency.create({ data: testCurrency });

      const response = await request(app)
        .put(`/api/currencies/${testCurrency.currency_code}`)
        .send({ name: 'Updated Dollar' })
        .expect(200);

      expect(response.body.name).toBe('Updated Dollar');
    });

    it('should reject invalid updates', async () => {
      await prisma.currency.create({ data: testCurrency });

      const response = await request(app)
        .put(`/api/currencies/${testCurrency.currency_code}`)
        .send({ currency_code: 'US' }) // Invalid - too short
        .expect(400);

      expect(response.body.error).toMatch(/validation failed/i);
    });
  });

  describe('DELETE /api/currencies/:code', () => {
    it('should delete currency', async () => {
      await prisma.currency.create({ data: testCurrency });

      await request(app)
        .delete(`/api/currencies/${testCurrency.currency_code}`)
        .expect(204);

      const count = await prisma.currency.count();
      expect(count).toBe(0);
    });

    it('should return 404 for non-existent currency', async () => {
      const response = await request(app)
        .delete('/api/currencies/XYZ')
        .expect(404);

      expect(response.body.error).toMatch(/not found/i);
    });
  });
});