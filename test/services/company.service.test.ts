/**
 * @file Test suite for CompanyService CRUD operations
 * @module test/services/company.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as CompanyService from '../../src/services/company.service'
import * as CompanyRepository from '../../src/repositories/company.repository'
import { Company } from '@prisma/client'

// Mock repository functions
vi.mock('../../src/repositories/company.repository', () => ({
  getAllCompanies: vi.fn(),
  getCompanyById: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn()
}))

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

// Setup mock implementations
beforeEach(() => {
  vi.mocked(CompanyRepository.getAllCompanies).mockResolvedValue([mockCompany])
  vi.mocked(CompanyRepository.getCompanyById).mockResolvedValue(mockCompany)
  vi.mocked(CompanyRepository.createCompany).mockResolvedValue(mockCompany)
  vi.mocked(CompanyRepository.updateCompany).mockResolvedValue({
    ...mockCompany,
    name: 'Updated Company'
  })
  vi.mocked(CompanyRepository.deleteCompany).mockResolvedValue(mockCompany)
})

describe('CompanyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create a new company', async () => {
      const company = await CompanyService.createCompany({
        name: 'Test Company',
        address: '123 Test St',
        phone: '555-1234'
      })
      
      expect(company).toEqual(mockCompany)
      expect(CompanyRepository.createCompany).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      await expect(CompanyService.createCompany({
        name: '',
        address: '',
        phone: ''
      })).rejects.toThrow()
    })
  })

  describe('Read Operations', () => {
    it('should get company by ID', async () => {
      const company = await CompanyService.getCompany('1')
      expect(company).toEqual(mockCompany)
      expect(CompanyRepository.getCompanyById).toHaveBeenCalledWith(1)
    })

    it('should get all companies', async () => {
      const companies = await CompanyService.getAllCompanies()
      expect(companies).toEqual([mockCompany])
      expect(CompanyRepository.getAllCompanies).toHaveBeenCalled()
    })
  })

  describe('Update Operations', () => {
    it('should update company details', async () => {
      const updated = await CompanyService.updateCompany('1', {
        name: 'Updated Company'
      })
      
      expect(updated.name).toBe('Updated Company')
      expect(CompanyRepository.updateCompany).toHaveBeenCalledWith(1, {
        name: 'Updated Company'
      })
    })
  })

  describe('Delete Operations', () => {
    it('should delete a company', async () => {
      const deleted = await CompanyService.deleteCompany('1')
      expect(deleted).toEqual(mockCompany)
      expect(CompanyRepository.deleteCompany).toHaveBeenCalledWith(1)
    })
  })
})
