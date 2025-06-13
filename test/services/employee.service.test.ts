/**
 * @file Test suite for EmployeeService CRUD operations
 * @module test/services/employee.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as EmployeeService from '../../src/services/employee.service'
import * as EmployeeRepository from '../../src/repositories/employee.repository'
import { NotFoundError } from '../../src/errors'
import { z } from 'zod'

// Mock repository functions
vi.mock('../../src/repositories/employee.repository', () => ({
  getAllEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn()
}))

// Mock data
const mockEmployee = {
  employee_id: 'EMP001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone_number: '555-1234',
  hire_date: new Date('2023-01-15'),
  job_title: 'Developer',
  department_id: 'DEPT001',
  department: {
    department_id: 'DEPT001',
    name: 'Development',
    manager_id: null
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

// Setup mock implementations
beforeEach(() => {
  vi.mocked(EmployeeRepository.getAllEmployees).mockResolvedValue([mockEmployee])
  vi.mocked(EmployeeRepository.getEmployeeById).mockResolvedValue(mockEmployee)
  vi.mocked(EmployeeRepository.createEmployee).mockResolvedValue(mockEmployee)
  vi.mocked(EmployeeRepository.updateEmployee).mockResolvedValue({
    ...mockEmployee,
    job_title: 'Senior Developer',
    department: {
      department_id: 'DEPT001',
      name: 'Development',
      manager_id: null
    }
  })
  vi.mocked(EmployeeRepository.deleteEmployee).mockResolvedValue(mockEmployee)
})

describe('EmployeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllEmployees', () => {
    it('should return all employees', async () => {
      const employees = await EmployeeService.getAllEmployees()
      expect(employees).toEqual([mockEmployee])
      expect(EmployeeRepository.getAllEmployees).toHaveBeenCalled()
    })
  })

  describe('getEmployee', () => {
    it('should get employee by string ID', async () => {
      const employee = await EmployeeService.getEmployee('EMP001')
      expect(employee).toEqual(mockEmployee)
      expect(EmployeeRepository.getEmployeeById).toHaveBeenCalledWith('EMP001')
    })

    it('should get employee by numeric ID', async () => {
      const employee = await EmployeeService.getEmployee(123)
      expect(employee).toEqual(mockEmployee)
      expect(EmployeeRepository.getEmployeeById).toHaveBeenCalledWith('123')
    })

    it('should throw for non-existent employee', async () => {
      vi.mocked(EmployeeRepository.getEmployeeById).mockRejectedValue(new NotFoundError('Employee not found'))
      await expect(EmployeeService.getEmployee('INVALID')).rejects.toThrow('Employee not found')
    })
  })

  describe('createEmployee', () => {
    it('should create valid employee', async () => {
      const employee = await EmployeeService.createEmployee({
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        hire_date: '2023-01-15',
        department_id: 'DEPT001'
      })
      expect(employee).toEqual(mockEmployee)
      expect(EmployeeRepository.createEmployee).toHaveBeenCalled()
    })

    it('should reject invalid email format', async () => {
      await expect(EmployeeService.createEmployee({
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        hire_date: '2023-01-15'
      })).rejects.toThrow()
    })

    it('should reject missing required fields', async () => {
      await expect(EmployeeService.createEmployee({
        employee_id: '',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        hire_date: '2023-01-15'
      })).rejects.toThrow()
    })
  })

  describe('updateEmployee', () => {
    it('should update employee details', async () => {
      const updated = await EmployeeService.updateEmployee('EMP001', {
        job_title: 'Senior Developer'
      })
      expect(updated.job_title).toBe('Senior Developer')
      expect(EmployeeRepository.updateEmployee).toHaveBeenCalled()
    })

    it('should throw for non-existent employee', async () => {
      vi.mocked(EmployeeRepository.updateEmployee).mockRejectedValue(new NotFoundError('Employee not found'))
      await expect(EmployeeService.updateEmployee('INVALID', {
        job_title: 'Senior Developer'
      })).rejects.toThrow('Employee not found')
    })
  })

  describe('deleteEmployee', () => {
    it('should delete employee', async () => {
      const deleted = await EmployeeService.deleteEmployee('EMP001')
      expect(deleted).toEqual(mockEmployee)
      expect(EmployeeRepository.deleteEmployee).toHaveBeenCalled()
    })

    it('should throw for non-existent employee', async () => {
      vi.mocked(EmployeeRepository.deleteEmployee).mockRejectedValue(new NotFoundError('Employee not found'))
      await expect(EmployeeService.deleteEmployee('INVALID')).rejects.toThrow('Employee not found')
    })
  })
})