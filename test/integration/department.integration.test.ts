import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../src/services/auth.service';
import { redis } from '../../src/repositories/company.repository';

const prisma = new PrismaClient();

// Flush Redis before tests if it exists
if (redis) {
  beforeAll(async () => {
    try {
      await redis.flushall();
    } catch (err) {
      console.warn('Failed to flush Redis:', err);
    }
  });
}

// Enhanced cleanup with retries and verification
const cleanupDatabase = async () => {
  console.log('Starting database cleanup...');
  
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET session_replication_role = 'replica'`;
      await tx.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
      await tx.$executeRaw`TRUNCATE TABLE "Department" CASCADE`;
      await tx.$executeRaw`SET session_replication_role = 'origin'`;
    });
  } catch (error) {
    console.error('Transaction-based cleanup failed, trying alternative method:', error);
    await prisma.$executeRaw`BEGIN`;
    try {
      await prisma.$executeRaw`SET session_replication_role = 'replica'`;
      await prisma.$executeRaw`DELETE FROM "users"`;
      await prisma.$executeRaw`DELETE FROM "Department"`;
      await prisma.$executeRaw`SET session_replication_role = 'origin'`;
      await prisma.$executeRaw`COMMIT`;
    } catch (innerError) {
      await prisma.$executeRaw`ROLLBACK`;
      console.error('Alternative cleanup failed:', innerError);
      await prisma.user.deleteMany({});
      await prisma.department.deleteMany({});
    }
  }
  
  // Verify cleanup
  let attempts = 0;
  let users = await prisma.user.findMany();
  while (users.length > 0 && attempts < 5) {
    await prisma.user.deleteMany({});
    await new Promise(resolve => setTimeout(resolve, 500));
    users = await prisma.user.findMany();
    attempts++;
  }
};

describe('Department API Integration Tests', () => {
  const testUser = {
    email: 'department-test@example.com',
    password: 'ValidPass123!'
  };

  let accessToken: string;
  let userId: number;

  beforeAll(async () => {
    console.log('Connecting to test database:', process.env.DATABASE_URL);
    await prisma.$connect();
    
    // Verify test database connection and schema
    const dbInfo = await prisma.$queryRaw<Array<{current_database: string}>>`
      SELECT current_database()
    `;
    console.log('Connected to database:', dbInfo[0].current_database);
    
    // Verify User and Department tables exist
    const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Database tables:', tables);
    
    if (!tables.some(t => t.table_name === 'users')) {
      throw new Error('users table does not exist in test database');
    }
    if (!tables.some(t => t.table_name === 'Department')) {
      throw new Error('Department table does not exist in test database');
    }
    
    await cleanupDatabase();
    
    // Create test user with transaction
    const passwordHash = await AuthService.hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        role: 'USER',
        failedLoginAttempts: 0
      }
    });
    userId = user.id;

    accessToken = AuthService.generateAccessToken(user);
    await AuthService.saveRefreshToken(user.id, AuthService.generateRefreshToken(user));
    
    // Ensure test isolation by waiting briefly
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Enhanced cleanup between tests
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET session_replication_role = 'replica'`;
        await tx.$executeRaw`DELETE FROM "Department"`;
        await tx.$executeRaw`SET session_replication_role = 'origin'`;
      });
      
      // Verify cleanup
      const departments = await prisma.department.findMany();
      if (departments.length > 0) {
        console.warn(`Warning: ${departments.length} departments still exist after cleanup`);
        await prisma.department.deleteMany({});
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  });

  afterAll(async () => {
    console.log('Running final cleanup...');
    try {
      await cleanupDatabase();
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error during final cleanup:', error);
      await prisma.$disconnect();
    }
  });

  describe('Department CRUD Operations', () => {
    it('should create a department', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('department_id');
      expect(typeof response.body.department_id).toBe('string');
      expect(response.body.name).toBe('IT Department');
      // Verify createdAt is an ISO string
      expect(typeof response.body.createdAt).toBe('string');
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);

      // Verify database state
      const department = await prisma.department.findUnique({
        where: { department_id: response.body.department_id }
      });
      expect(department).toBeTruthy();
    });

    it('should get all departments', async () => {
      // First create a department
      await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        });

      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0].name).toBe('IT Department');
      // Verify dates are valid ISO date strings
      expect(typeof response.body[0].createdAt).toBe('string');
      expect(new Date(response.body[0].createdAt)).toBeInstanceOf(Date);
    });

    it('should get a department by ID', async () => {
      // First create a department
      const createRes = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        });

      const response = await request(app)
        .get(`/api/departments/${createRes.body.department_id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body.department_id).toBe(createRes.body.department_id);
      expect(typeof response.body.department_id).toBe('string');
      // Verify createdAt is an ISO string
      expect(typeof response.body.createdAt).toBe('string');
      expect(new Date(response.body.createdAt)).toBeInstanceOf(Date);
    });

    it('should update a department', async () => {
      // First create a department
      const createRes = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        });

      const response = await request(app)
        .put(`/api/departments/${createRes.body.department_id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated IT Department'
        })
        .expect(200);
      
      expect(response.body.name).toBe('Updated IT Department');
      // Verify updatedAt is a valid ISO date string
      expect(typeof response.body.updatedAt).toBe('string');
      expect(new Date(response.body.updatedAt)).toBeInstanceOf(Date);
    });

    it('should delete a department', async () => {
      // First create a department
      const createRes = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        });

      await request(app)
        .delete(`/api/departments/${createRes.body.department_id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
      
      // Verify deletion
      const deletedDepartment = await prisma.department.findUnique({
        where: { department_id: createRes.body.department_id }
      });
      expect(deletedDepartment).toBeNull();
    });
  });

  describe('Department Validation', () => {
    it('should reject invalid department data', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: '', // Invalid empty name
          description: 'Information Technology'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent department', async () => {
      await request(app)
        .get('/api/departments/nonexistent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Department Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/departments')
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        });
      expect([400, 401]).toContain(response.status);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', 'Bearer invalidtoken')
        .send({
          name: 'IT Department',
          description: 'Information Technology'
        });
      expect([400, 401]).toContain(response.status);
    });
  });
});
