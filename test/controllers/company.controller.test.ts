/**
 * @file Test suite for CompanyController API endpoints
 * @module test/controllers/company.controller.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { companyController } from '../../src/controllers/company.controller'
import * as companyService from '../../src/services/company.service'
import { Request, Response } from 'express'

// Mock service methods
vi.mock('../../src/services/company.service', () => ({
  getAllCompanies: vi.fn(),
  getCompany: vi.fn(),
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

// Mock Express request/response
const mockRequest = (body: any = {}, params: any = {}) => ({
  body,
  params
}) as Request

const mockResponse = () => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('CompanyController', () => {
  let req: Request
  let res: Response

  beforeEach(() => {
    vi.clearAllMocks()
    req = mockRequest()
    res = mockResponse()
  })

  describe('GET /companies', () => {
    it('should return all companies', async () => {
      vi.mocked(companyService.getAllCompanies).mockResolvedValue([mockCompany])
      await companyController.getAll(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith([mockCompany])
    })

    it('should handle errors', async () => {
      vi.mocked(companyService.getAllCompanies).mockRejectedValue(new Error('DB error'))
      await companyController.getAll(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch companies' })
    })
  })

  describe('GET /companies/:id', () => {
    it('should return a company', async () => {
      req = mockRequest({}, { id: '1' })
      vi.mocked(companyService.getCompany).mockResolvedValue(mockCompany)
      await companyController.getById(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(mockCompany)
    })

    it('should return 404 if not found', async () => {
      req = mockRequest({}, { id: '999' })
      vi.mocked(companyService.getCompany).mockResolvedValue(null)
      await companyController.getById(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('POST /companies', () => {
    it('should create a company', async () => {
      req = mockRequest({
        name: 'Test Company',
        address: '123 Test St',
        phone: '555-1234'
      })
      vi.mocked(companyService.createCompany).mockResolvedValue(mockCompany)
      await companyController.create(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockCompany)
    })

    it('should handle validation errors', async () => {
      req = mockRequest({ name: '' })
      vi.mocked(companyService.createCompany).mockRejectedValue(new Error('Invalid data'))
      await companyController.create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('PUT /companies/:id', () => {
    it('should update a company', async () => {
      req = mockRequest({ name: 'Updated' }, { id: '1' })
      vi.mocked(companyService.updateCompany).mockResolvedValue(mockCompany)
      await companyController.update(req, res)
      expect(res.json).toHaveBeenCalledWith(mockCompany)
    })
  })

  describe('DELETE /companies/:id', () => {
    it('should delete a company', async () => {
      req = mockRequest({}, { id: '1' })
      vi.mocked(companyService.deleteCompany).mockResolvedValue(mockCompany)
      await companyController.delete(req, res)
      expect(res.status).toHaveBeenCalledWith(204)
    })
  })
})
