/**
 * @file Test suite for CustomerRepository CRUD and caching operations
 * @module test/repositories/customer.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as CustomerRepository from '../../src/repositories/customer.repository'
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
  PrismaClient.prototype.customer = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockCustomer = {
  customer_id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  created_at: new Date()
}

describe('CustomerRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached customers when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([mockCustomer]))
      const result = await CustomerRepository.getAllCustomers()
      expect(result).toEqual([mockCustomer])
      expect(prisma.customer.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.customer.findMany).mockResolvedValue([mockCustomer])
      const result = await CustomerRepository.getAllCustomers()
      expect(result).toEqual([mockCustomer])
      expect(prisma.customer.findMany).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations', () => {
    it('should create a customer and invalidate cache', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue(mockCustomer)
      const result = await CustomerRepository.createCustomer({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      })
      expect(result).toEqual(mockCustomer)
      expect(redis.del).toHaveBeenCalledWith('customer:all:')
    })

    it('should update a customer and invalidate caches', async () => {
      vi.mocked(prisma.customer.update).mockResolvedValue(mockCustomer)
      const result = await CustomerRepository.updateCustomer(1, {
        first_name: 'Updated'
      })
      expect(result).toEqual(mockCustomer)
      expect(redis.del).toHaveBeenCalledWith('customer:id:1')
      expect(redis.del).toHaveBeenCalledWith('customer:all:')
    })

    it('should delete a customer and invalidate caches', async () => {
      vi.mocked(prisma.customer.delete).mockResolvedValue(mockCustomer)
      const result = await CustomerRepository.deleteCustomer(1)
      expect(result).toEqual(mockCustomer)
      expect(redis.del).toHaveBeenCalledWith('customer:id:1')
      expect(redis.del).toHaveBeenCalledWith('customer:all:')
    })

    it('should get customer by ID with caching', async () => {
      vi.mocked(redis.get).mockResolvedValue(null)
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)
      const result = await CustomerRepository.getCustomerById(1)
      expect(result).toEqual(mockCustomer)
      expect(redis.setex).toHaveBeenCalled()
    })
  })
})
