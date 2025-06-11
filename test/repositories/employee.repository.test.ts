/**
 * @file Test suite for EmployeeRepository CRUD and caching operations
 * @module test/repositories/employee.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as EmployeeRepository from '../../src/repositories/employee.repository'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'

// Mock Redis and Prisma
vi.mock('ioredis', () => {
  const Redis = vi.fn()
  Redis.prototype.get = vi.fn()
  Redis.prototype.setex = vi.fn()
  Redis.prototype.del = vi.fn().mockResolvedValue(1)
  return { default: Redis }
})

vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn()
  PrismaClient.prototype.employee = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockEmployee = {
  employee_id: 'emp-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone_number: '555-1234',
  hire_date: new Date(),
  job_title: 'Developer',
  department_id: 'dept-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  department: {
    department_id: 'dept-1',
    name: 'Engineering'
  }
}

describe('EmployeeRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached employees when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([mockEmployee]))
      const result = await EmployeeRepository.getAllEmployees()
      expect(result).toEqual([mockEmployee])
      expect(prisma.employee.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.employee.findMany).mockResolvedValue([mockEmployee])
      const result = await EmployeeRepository.getAllEmployees()
      expect(result).toEqual([mockEmployee])
      expect(prisma.employee.findMany).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations', () => {
    it('should get employee by id', async () => {
      vi.mocked(redis.get).mockResolvedValue(null)
      vi.mocked(prisma.employee.findUnique).mockResolvedValue(mockEmployee)
      const result = await EmployeeRepository.getEmployeeById('emp-1')
      expect(result).toEqual(mockEmployee)
    })

    it('should create an employee and invalidate cache', async () => {
      vi.mocked(prisma.employee.create).mockResolvedValue(mockEmployee)
      const result = await EmployeeRepository.createEmployee({
        employee_id: 'emp-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        hire_date: new Date()
      })
      expect(result).toEqual(mockEmployee)
      expect(redis.del).toHaveBeenCalledWith('employee:all:')
    })

    it('should update an employee and invalidate caches', async () => {
      vi.mocked(prisma.employee.findUnique).mockResolvedValue(mockEmployee)
      vi.mocked(prisma.employee.update).mockResolvedValue(mockEmployee)
      const result = await EmployeeRepository.updateEmployee('emp-1', {
        job_title: 'Senior Developer'
      })
      expect(result).toEqual(mockEmployee)
      expect(redis.del).toHaveBeenCalledWith('employee:id:emp-1')
      expect(redis.del).toHaveBeenCalledWith('employee:all:')
    })

    it('should delete an employee and invalidate caches', async () => {
      vi.mocked(prisma.employee.findUnique).mockResolvedValue(mockEmployee)
      vi.mocked(prisma.employee.delete).mockResolvedValue(mockEmployee)
      const result = await EmployeeRepository.deleteEmployee('emp-1')
      expect(result).toEqual(mockEmployee)
      expect(redis.del).toHaveBeenCalledWith('employee:id:emp-1')
      expect(redis.del).toHaveBeenCalledWith('employee:all:')
    })
  })
})
