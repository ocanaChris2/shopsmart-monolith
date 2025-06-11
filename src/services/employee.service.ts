import { 
  getAllEmployees as getAllEmployeesRepo,
  getEmployeeById as getEmployeeByIdRepo,
  createEmployee as createEmployeeRepo,
  updateEmployee as updateEmployeeRepo,
  deleteEmployee as deleteEmployeeRepo
} from '../repositories/employee.repository';
import { NotFoundError } from '../errors';
import { z } from 'zod';

const employeeCreateSchema = z.object({
  employee_id: z.string().min(1),
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone_number: z.string().optional(),
  hire_date: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]).refine(date => !isNaN(date.getTime()), {
    message: "Invalid date format"
  }),
  job_title: z.string().optional(),
  department_id: z.string().optional()
});

const employeeUpdateSchema = z.object({
  employee_id: z.string().min(1).optional(),
  first_name: z.string().min(2).optional(),
  last_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  hire_date: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]).refine(date => !isNaN(date.getTime()), {
    message: "Invalid date format"
  }).optional(),
  job_title: z.string().optional(),
  department_id: z.string().optional()
});

export const getAllEmployees = async () => {
  return await getAllEmployeesRepo();
};

export const getEmployee = async (id: string | number) => {
  const employeeId = typeof id === 'number' ? id.toString() : id;
  try {
    return await getEmployeeByIdRepo(employeeId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error('Failed to fetch employee');
  }
};

export const createEmployee = async (data: unknown) => {
  const validatedData = employeeCreateSchema.parse(data);
  return await createEmployeeRepo(validatedData);
};

export const updateEmployee = async (id: string | number, data: unknown) => {
  const employeeId = typeof id === 'number' ? id.toString() : id;
  try {
    const validatedData = employeeUpdateSchema.parse(data);
    return await updateEmployeeRepo(employeeId, validatedData);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error('Failed to update employee');
  }
};

export const deleteEmployee = async (id: string | number) => {
  const employeeId = typeof id === 'number' ? id.toString() : id;
  try {
    return await deleteEmployeeRepo(employeeId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new Error('Failed to delete employee');
  }
};
