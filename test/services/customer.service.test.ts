/**
 * @file Test suite for CustomerService CRUD operations
 * @module test/services/customer.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as CustomerService from '../../src/services/customer.service'
import * as CustomerRepository from '../../src/repositories/customer.repository'

// Mock repository functions
vi.mock('../../src/repositories/customer.repository', () => ({
  getAllCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn()
}))

// Mock data
const mockCustomer = {
  customer_id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-1234',
  created_at: new Date()
}

// Setup mock implementations
beforeEach(() => {
  vi.mocked(CustomerRepository.getAllCustomers).mockResolvedValue([mockCustomer])
  vi.mocked(CustomerRepository.getCustomerById).mockResolvedValue(mockCustomer)
  vi.mocked(CustomerRepository.createCustomer).mockResolvedValue(mockCustomer)
  vi.mocked(CustomerRepository.updateCustomer).mockResolvedValue({
    ...mockCustomer,
    first_name: 'Updated'
  })
  vi.mocked(CustomerRepository.deleteCustomer).mockResolvedValue(mockCustomer)
})

describe('CustomerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create a new customer', async () => {
      const customer = await CustomerService.createCustomer({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      })
      
      expect(customer).toEqual(mockCustomer)
      expect(CustomerRepository.createCustomer).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      await expect(CustomerService.createCustomer({
        first_name: 'J', // Too short
        last_name: 'D',
        email: 'invalid'
      })).rejects.toThrow()
    })
  })

  describe('Read Operations', () => {
    it('should get customer by ID (number)', async () => {
      const customer = await CustomerService.getCustomer(1)
      expect(customer).toEqual(mockCustomer)
    })

    it('should get customer by ID (string)', async () => {
      const customer = await CustomerService.getCustomer('1')
      expect(customer).toEqual(mockCustomer)
    })

    it('should throw error for invalid ID', async () => {
      vi.mocked(CustomerRepository.getCustomerById).mockResolvedValue(null)
      await expect(CustomerService.getCustomer(999)).rejects.toThrow('Customer not found')
    })

    it('should get all customers', async () => {
      const customers = await CustomerService.getAllCustomers()
      expect(customers).toEqual([mockCustomer])
    })
  })

  describe('Update Operations', () => {
    it('should update customer details', async () => {
      const updated = await CustomerService.updateCustomer(1, {
        first_name: 'Updated'
      })
      
      expect(updated.first_name).toBe('Updated')
    })

    it('should validate update data', async () => {
      await expect(CustomerService.updateCustomer(1, {
        email: 'invalid'
      })).rejects.toThrow()
    })
  })

  describe('Delete Operations', () => {
    it('should delete a customer', async () => {
      const deleted = await CustomerService.deleteCustomer(1)
      expect(deleted).toEqual(mockCustomer)
    })

    it('should throw error when deleting non-existent customer', async () => {
      vi.mocked(CustomerRepository.getCustomerById).mockResolvedValue(null)
      await expect(CustomerService.deleteCustomer(999)).rejects.toThrow('Customer not found')
    })
  })
})