/**
 * @file Test suite for CompanyRepository CRUD and caching operations
 * @module test/repositories/company.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as CompanyRepository from '../../src/repositories/company.repository'
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
  PrismaClient.prototype.company = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockCompany = {
  company_id: 1,
  name: 'Test Company',
  tax_id: null,
  address: '123 Test St',
  phone: '555-1234',
  email: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('CompanyRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached companies when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([mockCompany]))
      const result = await CompanyRepository.getAllCompanies()
      expect(result).toEqual([mockCompany])
      expect(prisma.company.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.company.findMany).mockResolvedValue([mockCompany])
      const result = await CompanyRepository.getAllCompanies()
      expect(result).toEqual([mockCompany])
      expect(prisma.company.findMany).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations', () => {
    it('should create a company and invalidate cache', async () => {
      vi.mocked(prisma.company.create).mockResolvedValue(mockCompany)
      const result = await CompanyRepository.createCompany({
        name: 'Test Company',
        address: '123 Test St',
        phone: '555-1234'
      })
      expect(result).toEqual(mockCompany)
      expect(redis.del).toHaveBeenCalledWith('company:all:')
    })

    it('should update a company and invalidate caches', async () => {
      vi.mocked(prisma.company.update).mockResolvedValue(mockCompany)
      const result = await CompanyRepository.updateCompany(1, {
        name: 'Updated Company'
      })
      expect(result).toEqual(mockCompany)
      expect(redis.del).toHaveBeenCalledWith('company:id:1')
      expect(redis.del).toHaveBeenCalledWith('company:all:')
    })

    it('should delete a company and invalidate caches', async () => {
      vi.mocked(prisma.company.delete).mockResolvedValue(mockCompany)
      const result = await CompanyRepository.deleteCompany(1)
      expect(result).toEqual(mockCompany)
      expect(redis.del).toHaveBeenCalledWith('company:id:1')
      expect(redis.del).toHaveBeenCalledWith('company:all:')
    })
  })
})
