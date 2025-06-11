import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/repositories/company.repository';
import { AuthService } from '../../src/services/auth.service';

const prisma = new PrismaClient();
let transaction: any;

describe('Company API Integration Tests', () => {
  const testUser = {
    email: 'company-test@example.com', // Unique email for this test file
    password: 'ValidPass123!'
  };

  let accessToken: string;

  beforeAll(async () => {
    await prisma.$connect();
    
    // Use transaction for atomic cleanup with constraint handling
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET session_replication_role = 'replica'`;
      await tx.$executeRaw`DELETE FROM "users"`;
      await tx.$executeRaw`DELETE FROM "Company"`;
      await tx.$executeRaw`SET session_replication_role = 'origin'`;
    });
    
    // Verify Redis flush with retries
    let redisKeys = await redis.keys('*');
    let attempts = 0;
    while (redisKeys.length > 0 && attempts < 3) {
      await redis.flushall();
      await new Promise(resolve => setTimeout(resolve, 100));
      redisKeys = await redis.keys('*');
      attempts++;
    }
    
    if (redisKeys.length > 0) {
      throw new Error('Redis cleanup failed - keys still exist');
    }

    // Verify database cleanup with retries
    let users = await prisma.user.findMany();
    let companies = await prisma.company.findMany();
    attempts = 0;
    while ((users.length > 0 || companies.length > 0) && attempts < 3) {
      await new Promise(resolve => setTimeout(resolve, 100));
      users = await prisma.user.findMany();
      companies = await prisma.company.findMany();
      attempts++;
    }
    
    if (users.length > 0) {
      throw new Error('Database cleanup failed - users still exist');
    }
    if (companies.length > 0) {
      throw new Error('Database cleanup failed - companies still exist');
    }

    // Create test user directly in database to avoid registration issues
    const passwordHash = await AuthService.hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        role: 'USER',
        failedLoginAttempts: 0
      }
    });

    // Generate tokens directly
    accessToken = AuthService.generateAccessToken(user);
    await AuthService.saveRefreshToken(user.id, AuthService.generateRefreshToken(user));
  });

  afterEach(async () => {
    // Ensure complete cleanup between tests
    await prisma.$transaction([
      prisma.company.deleteMany({}),
    ]);
    await redis.flushall();
  });

  describe('Company CRUD Operations', () => {
    it('should create a company', async () => {
      await prisma.$transaction(async (tx) => {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test Company',
            address: '123 Test St',
            phone: '555-1234'
          })
          .expect(201);
        
        expect(response.body).toHaveProperty('company_id');
        expect(response.body.name).toBe('Test Company');
        // Verify createdAt is a valid ISO date string
        expect(typeof response.body.createdAt).toBe('string');
        expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);

        // Verify database state
        const company = await tx.company.findUnique({
          where: { company_id: response.body.company_id }
        });
        expect(company).toBeTruthy();
      });
    });

    it('should get all companies', async () => {
      // First create a company
      await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Company',
          address: '123 Test St',
          phone: '555-1234'
        });

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0].name).toBe('Test Company');
      // Verify dates are valid ISO date strings
      expect(typeof response.body[0].createdAt).toBe('string');
      expect(new Date(response.body[0].createdAt)).toBeInstanceOf(Date);

      // Verify database state
      const companies = await prisma.company.findMany();
      expect(companies.length).toBe(1);
    });

    it('should get a company by ID', async () => {
      await prisma.$transaction(async (tx) => {
        // First create a company
        const createRes = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test Company',
            address: '123 Test St',
            phone: '555-1234'
          });

        const response = await request(app)
          .get(`/api/companies/${createRes.body.company_id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
        
        expect(response.body.company_id).toBe(createRes.body.company_id);
        // Verify createdAt is a valid ISO date string
        expect(typeof response.body.createdAt).toBe('string');
        expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);

        // Verify database state
        const company = await tx.company.findUnique({
          where: { company_id: createRes.body.company_id }
        });
        expect(company).toBeTruthy();
      });
    });

    it('should update a company', async () => {
      await prisma.$transaction(async (tx) => {
        // First create a company
        const createRes = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test Company',
            address: '123 Test St',
            phone: '555-1234'
          });

        const response = await request(app)
          .put(`/api/companies/${createRes.body.company_id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Updated Company'
          })
          .expect(200);
        
        expect(response.body.name).toBe('Updated Company');
        // Verify updatedAt is a valid ISO date string
        expect(typeof response.body.updatedAt).toBe('string');
        expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);

        // Verify database state
        const updatedCompany = await tx.company.findUnique({
          where: { company_id: createRes.body.company_id }
        });
        expect(updatedCompany?.name).toBe('Updated Company');
      });
    });

    it('should delete a company', async () => {
      await prisma.$transaction(async (tx) => {
        // First create a company
        const createRes = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Test Company',
            address: '123 Test St',
            phone: '555-1234'
          });

        await request(app)
          .delete(`/api/companies/${createRes.body.company_id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(204);
        
        // Verify deletion in database
        const deletedCompany = await tx.company.findUnique({
          where: { company_id: createRes.body.company_id }
        });
        expect(deletedCompany).toBeNull();

        // Verify API returns 404
        await request(app)
          .get(`/api/companies/${createRes.body.company_id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });
  });

  describe('Company Validation', () => {
    it('should reject invalid company data', async () => {
      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '', // Invalid empty name
          address: '123 Test St',
          phone: '555-1234'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent company', async () => {
      await request(app)
        .get('/api/companies/9999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Company Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/companies')
        .send({
          name: 'Test Company',
          address: '123 Test St',
          phone: '555-1234'
        });
      expect([400, 401]).toContain(response.status);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer invalidtoken')
        .send({
          name: 'Test Company',
          address: '123 Test St',
          phone: '555-1234'
        });
      expect([400, 401]).toContain(response.status);
    });
  });
});
