/**
 * @file Test suite for DepartmentService CRUD operations
 * @module test/services/department.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as DepartmentService from '../../src/services/department.service'
import * as DepartmentRepository from '../../src/repositories/department.repository'
import { NotFoundError, ValidationError } from '../../src/errors'

// Mock repository functions
vi.mock('../../src/repositories/department.repository', () => ({
  getAllDepartmentsRepo: vi.fn(),
  getDepartmentByIdRepo: vi.fn(),
  createDepartmentRepo: vi.fn(),
  updateDepartmentRepo: vi.fn(),
  deleteDepartmentRepo: vi.fn()
}))

// Mock data
const mockDepartment = {
  department_id: 'DEPT001',
  name: 'Development',
  description: 'Software development team',
  manager_id: null,
  employees: [],
  createdAt: new Date(),
  updatedAt: new Date()
}

// Setup mock implementations
beforeEach(() => {
  vi.mocked(DepartmentRepository.getAllDepartmentsRepo).mockResolvedValue([mockDepartment])
  vi.mocked(DepartmentRepository.getDepartmentByIdRepo).mockResolvedValue(mockDepartment)
  vi.mocked(DepartmentRepository.createDepartmentRepo).mockResolvedValue(mockDepartment)
  vi.mocked(DepartmentRepository.updateDepartmentRepo).mockResolvedValue({
    ...mockDepartment,
    name: 'Updated Department'
  })
  vi.mocked(DepartmentRepository.deleteDepartmentRepo).mockResolvedValue(mockDepartment)
})

describe('DepartmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create a new department', async () => {
      const department = await DepartmentService.createDepartment({
        name: 'Development',
        description: 'Software development team'
      })
      
      expect(department).toEqual(mockDepartment)
      expect(DepartmentRepository.createDepartmentRepo).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      await expect(DepartmentService.createDepartment({
        name: '', // Invalid - too short
        description: ''
      })).rejects.toThrow(ValidationError)
    })
  })

  describe('Read Operations', () => {
    it('should get department by ID', async () => {
      const department = await DepartmentService.getDepartment('DEPT001')
      expect(department).toEqual(mockDepartment)
      expect(DepartmentRepository.getDepartmentByIdRepo).toHaveBeenCalledWith('DEPT001')
    })

    it('should throw NotFoundError for invalid ID', async () => {
      vi.mocked(DepartmentRepository.getDepartmentByIdRepo).mockResolvedValue(null as unknown as typeof mockDepartment)
      await expect(DepartmentService.getDepartment('INVALID')).rejects.toThrow(NotFoundError)
    })

    it('should get all departments', async () => {
      const departments = await DepartmentService.getAllDepartments()
      expect(departments).toEqual([mockDepartment])
      expect(DepartmentRepository.getAllDepartmentsRepo).toHaveBeenCalled()
    })
  })

  describe('Update Operations', () => {
    it('should update department details', async () => {
      const updated = await DepartmentService.updateDepartment('DEPT001', {
        name: 'Updated Department'
      })
      
      expect(updated.name).toBe('Updated Department')
      expect(DepartmentRepository.updateDepartmentRepo).toHaveBeenCalledWith('DEPT001', {
        name: 'Updated Department'
      })
    })

    it('should validate update data', async () => {
      await expect(DepartmentService.updateDepartment('DEPT001', {
        name: '' // Invalid - too short
      })).rejects.toThrow(ValidationError)
    })
  })

  describe('Delete Operations', () => {
    it('should delete a department', async () => {
      const deleted = await DepartmentService.deleteDepartment('DEPT001')
      expect(deleted).toEqual(mockDepartment)
      expect(DepartmentRepository.deleteDepartmentRepo).toHaveBeenCalledWith('DEPT001')
    })

    it('should throw NotFoundError when deleting non-existent department', async () => {
      vi.mocked(DepartmentRepository.getDepartmentByIdRepo).mockResolvedValue(null as unknown as typeof mockDepartment)
      await expect(DepartmentService.deleteDepartment('INVALID')).rejects.toThrow(NotFoundError)
    })
  })
})