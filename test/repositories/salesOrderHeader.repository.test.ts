/**
 * @file Test suite for SalesOrderHeaderRepository CRUD and caching operations
 * @module test/repositories/salesOrderHeader.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as SalesOrderHeaderRepository from '../../src/repositories/salesOrderHeader.repository'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { stringifyWithDates } from '../../src/utils/dateUtils'

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
  PrismaClient.prototype.salesOrderHeader = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

interface MockSalesOrderHeader {
  order_id: number;
  order_date: Date;
  customer_id: number;
  employee_id: string;
  company_id: number;
  currency_code: string;
  status: string;
  total_amount: number;
  shipped_date: Date | null;
  created_at: Date;
  updated_at: Date;
  details: Array<{
    order_detail_id: number;
    product_id: number;
    quantity: number;
    price: number;
  }>;
  customer: {
    customer_id: number;
    name: string;
  };
  employee: {
    employee_id: string;
    name: string;
  };
  currency: {
    currency_code: string;
    name: string;
  };
}

// Mock data
const mockSalesOrderHeader: MockSalesOrderHeader = {
  order_id: 1,
  order_date: new Date('2025-06-08T19:52:49.667Z'),
  customer_id: 1,
  employee_id: 'EMP-001',
  company_id: 1,
  currency_code: 'USD',
  status: 'PENDING',
  total_amount: 999.99,
  shipped_date: null,
  created_at: new Date('2025-06-08T19:52:49.667Z'),
  updated_at: new Date('2025-06-08T19:52:49.667Z'),
  details: [
    {
      order_detail_id: 1,
      product_id: 1,
      quantity: 10,
      price: 99.99
    }
  ],
  customer: {
    customer_id: 1,
    name: 'Test Customer'
  },
  employee: {
    employee_id: 'EMP-001',
    name: 'Test Employee'
  },
  currency: {
    currency_code: 'USD',
    name: 'US Dollar'
  }
}

const mockCachedSalesOrderHeader = {
  ...mockSalesOrderHeader,
  order_date: "2025-06-08T19:52:49.667Z",
  created_at: "2025-06-08T19:52:49.667Z",
  updated_at: "2025-06-08T19:52:49.667Z"
}

describe('SalesOrderHeaderRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached headers when available', async () => {
      interface SerializedDate {
        __type: string;
        value: string;
      }

      const serializedDates: {
        order_date: SerializedDate;
        created_at: SerializedDate;
        updated_at: SerializedDate;
        shipped_date?: SerializedDate;
      } = {
        order_date: { __type: 'Date', value: mockSalesOrderHeader.order_date.toISOString() },
        created_at: { __type: 'Date', value: mockSalesOrderHeader.created_at.toISOString() },
        updated_at: { __type: 'Date', value: mockSalesOrderHeader.updated_at.toISOString() }
      };
      
      if (mockSalesOrderHeader.shipped_date instanceof Date) {
        serializedDates.shipped_date = { 
          __type: 'Date', 
          value: mockSalesOrderHeader.shipped_date.toISOString() 
        };
      }

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockSalesOrderHeader,
        ...serializedDates
      }]))
      const result = await SalesOrderHeaderRepository.getAllSalesOrderHeaders()
      expect(result).toEqual([mockSalesOrderHeader])
      expect(prisma.salesOrderHeader.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.salesOrderHeader.findMany).mockResolvedValue([mockSalesOrderHeader])
      const result = await SalesOrderHeaderRepository.getAllSalesOrderHeaders()
      expect(result).toEqual([mockSalesOrderHeader])
      expect(prisma.salesOrderHeader.findMany).toHaveBeenCalled()
    })
  })

  describe('Lookup Methods', () => {
    it('should get header by id', async () => {
      vi.mocked(prisma.salesOrderHeader.findUnique).mockResolvedValue(mockSalesOrderHeader)
      const result = await SalesOrderHeaderRepository.getSalesOrderHeaderById(1)
      expect(result).toEqual(mockSalesOrderHeader)
    })
  })

  describe('CRUD Operations', () => {
    it('should create a header and invalidate cache', async () => {
      vi.mocked(prisma.salesOrderHeader.create).mockResolvedValue(mockSalesOrderHeader)
      const result = await SalesOrderHeaderRepository.createSalesOrderHeader({
        order_date: new Date(),
        customer_id: 1,
        company_id: 1,
        currency_code: 'USD',
        status: 'PENDING',
        total_amount: 999.99
      })
      expect(result).toEqual(mockSalesOrderHeader)
      expect(redis.del).toHaveBeenCalledWith('salesOrderHeader:all:')
    })

    it('should update a header and invalidate caches', async () => {
      const updatedHeader = { ...mockSalesOrderHeader, status: 'SHIPPED' }
      vi.mocked(prisma.salesOrderHeader.update).mockResolvedValue(updatedHeader)
      const result = await SalesOrderHeaderRepository.updateSalesOrderHeader(1, {
        status: 'SHIPPED'
      })
      expect(result).toEqual(updatedHeader)
      expect(redis.del).toHaveBeenCalledWith('salesOrderHeader:id:1')
      expect(redis.del).toHaveBeenCalledWith('salesOrderHeader:all:')
    })

    it('should delete a header and invalidate caches', async () => {
      vi.mocked(prisma.salesOrderHeader.delete).mockResolvedValue(mockSalesOrderHeader)
      const result = await SalesOrderHeaderRepository.deleteSalesOrderHeader(1)
      expect(result).toEqual(mockSalesOrderHeader)
      expect(redis.del).toHaveBeenCalledWith('salesOrderHeader:id:1')
      expect(redis.del).toHaveBeenCalledWith('salesOrderHeader:all:')
    })
  })
})
