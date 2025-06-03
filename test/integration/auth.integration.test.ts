import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { PrismaClient } from '@prisma/client';
import { redis } from '../../src/repositories/company.repository';

const prisma = new PrismaClient();

// Enhanced cleanup with retries and verification - defined at module scope
const cleanupDatabase = async () => {
  console.log('Starting database cleanup...');
  
  // Use a more robust approach to delete users
  // First attempt with transaction
  try {
    await prisma.$transaction(async (tx) => {
      // Disable foreign key constraints temporarily
      await tx.$executeRaw`SET session_replication_role = 'replica'`;
      
      // Delete all records from tables with proper ordering
      await tx.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
      await tx.$executeRaw`TRUNCATE TABLE "Company" CASCADE`;
      
      // Re-enable constraints
      await tx.$executeRaw`SET session_replication_role = 'origin'`;
    });
  } catch (error) {
    console.error('Transaction-based cleanup failed, trying alternative method:', error);
    
    // If transaction fails, try direct approach
    await prisma.$executeRaw`BEGIN`;
    try {
      await prisma.$executeRaw`SET session_replication_role = 'replica'`;
      await prisma.$executeRaw`DELETE FROM "users"`;
      await prisma.$executeRaw`DELETE FROM "Company"`;
      await prisma.$executeRaw`SET session_replication_role = 'origin'`;
      await prisma.$executeRaw`COMMIT`;
    } catch (innerError) {
      await prisma.$executeRaw`ROLLBACK`;
      console.error('Alternative cleanup failed:', innerError);
      
      // Last resort - simple deleteMany
      try {
        await prisma.user.deleteMany({});
        await prisma.company.deleteMany({});
      } catch (finalError) {
        console.error('Final cleanup attempt failed:', finalError);
      }
    }
  }
  
  // Verify cleanup with retries
  let attempts = 0;
  let users = await prisma.user.findMany();
  while (users.length > 0 && attempts < 5) {
    console.log(`Cleanup verification: ${users.length} users still exist. Retrying...`);
    
    // Try one more direct deletion
    try {
      await prisma.user.deleteMany({});
    } catch (error) {
      console.error('Retry deletion failed:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Longer wait time
    users = await prisma.user.findMany();
    attempts++;
  }
  
  if (users.length > 0) {
    console.error(`Database cleanup verification failed - ${users.length} users still exist`);
  } else {
    console.log('Database cleanup completed successfully');
  }
};

const cleanupRedis = async () => {
  console.log('Starting Redis cleanup...');
  try {
    let redisKeys = await redis.keys('*');
    let attempts = 0;
    while (redisKeys.length > 0 && attempts < 5) {
      await redis.flushall();
      await new Promise(resolve => setTimeout(resolve, 200));
      redisKeys = await redis.keys('*');
      attempts++;
      if (attempts > 1) {
        console.log(`Redis cleanup attempt ${attempts}: ${redisKeys.length} keys remaining`);
      }
    }
    
    if (redisKeys.length > 0) {
      console.error(`Redis cleanup verification failed - ${redisKeys.length} keys still exist`);
    } else {
      console.log('Redis cleanup completed successfully');
    }
  } catch (error) {
    console.error('Redis cleanup error:', error);
  }
};

describe('Auth API Integration Tests', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'ValidPass123!'
  };
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    // Create a dedicated Prisma client for testing
    testPrisma = new PrismaClient();
    console.log('Connecting to test database:', process.env.DATABASE_URL);
    await prisma.$connect();
    
    // Verify test database connection
    const dbInfo = await prisma.$queryRaw<Array<{current_database: string}>>`
      SELECT current_database()
    `;
    console.log('Connected to database:', dbInfo[0].current_database);
    
    // Verify User table exists
    const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Database tables:', tables);
    if (!tables.some((t: {table_name: string}) => t.table_name === 'users')) {
      throw new Error('users table does not exist in test database');
    }
    
    // Run cleanups sequentially with delays
    try {
      await cleanupDatabase();
      await new Promise(resolve => setTimeout(resolve, 500));
      await cleanupRedis();
      
      // Final verification - don't fail the test setup, just log the issue
      // This will allow tests to run even if cleanup isn't perfect
      // IMPORTANT: Don't fail the setup if there are still some records
      // The tests can still run and we'll clean up at the end
      const [users, companies] = await Promise.all([
        prisma.user.findMany(),
        prisma.company.findMany()
      ]);
      
      if (users.length > 0) {
        console.warn(`Warning: ${users.length} users still exist after initial cleanup. Tests will still run.`);
        // Try once more with direct delete but don't fail if it doesn't work
        try {
          await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
        } catch (e) {
          console.error('Final user cleanup failed:', e);
        }
      }
      
      if (companies.length > 0) {
        console.warn(`Warning: ${companies.length} companies still exist after initial cleanup.`);
        try {
          await prisma.$executeRaw`TRUNCATE TABLE "Company" CASCADE`;
        } catch (e) {
          console.error('Final company cleanup failed:', e);
        }
      }
    } catch (error) {
      console.error('Error during initial cleanup:', error);
      // Don't fail the test setup, continue anyway
    }
  });

  afterEach(async () => {
    // Use the same robust cleanup method as in beforeAll
    try {
      await cleanupDatabase();
      await redis.flushall();
      
      // Add a small delay to ensure everything is cleaned up
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Final verification but don't fail tests if cleanup isn't perfect
      const [users, companies] = await Promise.all([
        prisma.user.findMany(),
        prisma.company.findMany()
      ]);
      
      if (users.length > 0) {
        console.warn(`Warning: ${users.length} users still exist after test cleanup.`);
        // Force deletion with session_replication_role = 'replica' to bypass foreign key constraints
        try {
          await prisma.$executeRaw`SET session_replication_role = 'replica'`;
          await prisma.$executeRaw`DELETE FROM "users"`;
          await prisma.$executeRaw`SET session_replication_role = 'origin'`;
        } catch (err) {
          console.error('Force deletion failed:', err);
          // Last resort
          await prisma.user.deleteMany({});
        }
      }
      
      if (companies.length > 0) {
        console.warn(`Warning: ${companies.length} companies still exist after test cleanup.`);
        await prisma.company.deleteMany({});
      }
    } catch (error) {
      console.error('Error during afterEach cleanup:', error);
      // Don't fail the test, continue anyway
    }
  });

  // Add afterAll hook to clean up after all tests
  afterAll(async () => {
    console.log('Running final cleanup after all tests...');
    try {
      // Try the most aggressive cleanup approach
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET session_replication_role = 'replica'`;
        await tx.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
        await tx.$executeRaw`TRUNCATE TABLE "Company" CASCADE`;
        await tx.$executeRaw`SET session_replication_role = 'origin'`;
      });
      
      // Verify final cleanup
      const [users, companies] = await Promise.all([
        prisma.user.findMany(),
        prisma.company.findMany()
      ]);
      
      if (users.length > 0 || companies.length > 0) {
        console.warn(`Final cleanup incomplete: ${users.length} users, ${companies.length} companies remain`);
      } else {
        console.log('Final cleanup successful - all records removed');
      }
      
      // Cleanup Redis
      await redis.flushall();
      
      // Close the database connection
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error during final cleanup:', error);
      // Try to disconnect even if cleanup failed
      await prisma.$disconnect();
    }
  });

  describe('Registration', () => {
    // Add logging for test suite transitions
    console.log('Starting Registration test suite...');
    
    // Add afterEach hook specific to Registration tests
    afterEach(async () => {
      console.log('Cleaning up after Registration test...');
      try {
        await prisma.user.deleteMany({ where: { email: testUser.email } });
      } catch (error) {
        console.error('Error cleaning up Registration test:', error);
      }
    });
    
    it('should register a new user', async () => {
      // Use transaction to ensure isolated test
      await prisma.$transaction(async (tx) => {
        // Ensure user doesn't exist before test
        await tx.user.deleteMany({ where: { email: testUser.email } });
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        console.log('Registration response:', response.status, response.body);
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body.user.email).toBe(testUser.email);
      });
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Second attempt
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);
      
      expect(response.body.error).toMatch(/already in use/i);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: 'weak'
        })
        .expect(400);
      
      expect(response.body.error).toMatch(/password must be/i);
    });
  });

  describe('Login', () => {
    // Add logging for test suite transitions
    console.log('Starting Login test suite...');
    
    beforeEach(async () => {
      // Wrap in transaction for isolation
      await prisma.$transaction(async (tx) => {
        // Delete any existing user
        await tx.user.deleteMany({ where: { email: testUser.email } });
        
        // Register a fresh test user
        await request(app)
          .post('/api/auth/register')
          .send(testUser);
      });
    });
    
    // Add afterEach hook specific to Login tests
    afterEach(async () => {
      console.log('Cleaning up after Login test...');
      try {
        await prisma.$executeRaw`DELETE FROM "users" WHERE email = ${testUser.email}`;
      } catch (error) {
        console.error('Error cleaning up Login test:', error);
      }
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
      
      expect(response.body.error).toMatch(/invalid credentials/i);
    });

    it('should lock account after multiple failed attempts', async () => {
      // Attempt login with wrong password 5 times
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          });
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(403);
      
      expect(response.body.error).toMatch(/account locked/i);
      expect(response.body).toHaveProperty('lockedUntil');
    });
  });

  describe('Protected Routes', () => {
    // Add logging for test suite transitions
    console.log('Starting Protected Routes test suite...');
    
    let accessToken: string;
    let userId: number;

    beforeEach(async () => {
      // Delete any existing user first using transaction
      await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({ where: { email: testUser.email } });
        
        // Register and login test user
        await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(testUser);
        
        accessToken = loginResponse.body.accessToken;
        
        // Keep track of user ID for cleanup
        const user = await tx.user.findUnique({ where: { email: testUser.email } });
        if (user) {
          userId = user.id;
        }
      });
    });
    
    // Add afterEach hook specific to Protected Routes tests
    afterEach(async () => {
      console.log('Cleaning up after Protected Routes test...');
      try {
        if (userId) {
          await prisma.user.delete({ where: { id: userId } });
        } else {
          await prisma.user.deleteMany({ where: { email: testUser.email } });
        }
      } catch (error) {
        console.error('Error cleaning up Protected Routes test:', error);
      }
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      
      expect(response.body.message).toMatch(/access granted/i);
    });

    it('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);
      
      expect(response.body.message).toMatch(/unauthorized/i);
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
      
      expect(response.body.message).toMatch(/unauthorized/i);
    });
  });

  describe('Token Refresh', () => {
    // Add logging for test suite transitions
    console.log('Starting Token Refresh test suite...');
    
    let refreshToken: string;
    let accessToken: string;
    let userId: number;

    beforeEach(async () => {
      // Clean up and set up with transaction
      await prisma.$transaction(async (tx) => {
        // Clean up any existing test user
        await tx.user.deleteMany({ where: { email: testUser.email } });
        
        // Register and login test user
        await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(testUser);
        
        accessToken = loginResponse.body.accessToken;
        const cookies = loginResponse.headers['set-cookie'];
        refreshToken = cookies?.[0]?.split(';')[0]?.split('=')[1] || '';
        
        // Keep track of user ID for cleanup
        const user = await tx.user.findUnique({ where: { email: testUser.email } });
        if (user) {
          userId = user.id;
        }
      });
    });
    
    // Add afterEach hook specific to Token Refresh tests
    afterEach(async () => {
      console.log('Cleaning up after Token Refresh test...');
      try {
        // Clear Redis refresh tokens
        await redis.keys('refresh:*').then(keys => {
          if (keys.length > 0) {
            return redis.del(keys);
          }
        });
        
        // Delete user
        if (userId) {
          await prisma.user.delete({ where: { id: userId } }).catch(() => {});
        } else {
          await prisma.user.deleteMany({ where: { email: testUser.email } });
        }
      } catch (error) {
        console.error('Error cleaning up Token Refresh test:', error);
      }
    });

    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .expect(200);
      
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).not.toBe(accessToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', ['refreshToken=invalid'])
        .expect(401);
      
      expect(response.body.error).toMatch(/invalid token/i);
    });
  });

  describe('Logout', () => {
    // Add logging for test suite transitions
    console.log('Starting Logout test suite...');
    
    let refreshToken: string;
    let userId: number;

    beforeEach(async () => {
      // Use transaction for isolation
      await prisma.$transaction(async (tx) => {
        // Clean up any existing test user
        await tx.user.deleteMany({ where: { email: testUser.email } });
        
        // Register and login test user
        await request(app)
          .post('/api/auth/register')
          .send(testUser);
        
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send(testUser);
        
        const cookies = loginResponse.headers['set-cookie'];
        refreshToken = cookies?.[0]?.split(';')[0]?.split('=')[1] || '';
        
        // Get user ID for cleanup
        const user = await tx.user.findUnique({ where: { email: testUser.email } });
        if (user) {
          userId = user.id;
        }
      });
    });
    
    // Add afterEach hook specific to Logout tests
    afterEach(async () => {
      console.log('Cleaning up after Logout test...');
      try {
        // Clear any remaining refresh tokens
        await redis.keys('refresh:*').then(keys => {
          if (keys.length > 0) {
            return redis.del(keys);
          }
        });
        
        // Delete user
        if (userId) {
          await prisma.user.delete({ where: { id: userId } }).catch(() => {});
        } else {
          await prisma.user.deleteMany({ where: { email: testUser.email } });
        }
      } catch (error) {
        console.error('Error cleaning up Logout test:', error);
      }
    });

    it('should logout successfully', async () => {
      // First verify token works before logout
      await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .expect(200);

      // Perform logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .expect(204);
      
      // Verify token is invalidated by attempting refresh
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .expect(401);
      
      expect(response.body.error).toMatch(/unauthorized/i);
    });
  });
});
