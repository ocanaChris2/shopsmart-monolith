import { 
  getAllEmployees as getAllEmployeesRepo,
  getEmployeeById as getEmployeeByIdRepo,
  createEmployee as createEmployeeRepo,
  updateEmployee as updateEmployeeRepo,
  deleteEmployee as deleteEmployeeRepo
} from '../repositories/employee.repository';
import { z } from 'zod';

const employeeSchema = z.object({
  employee_id: z.string().min(1),
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone_number: z.string().optional(),
  hire_date: z.date(),
  job_title: z.string().optional(),
  department_id: z.string().optional()
});

export const getAllEmployees = async () => {
  return await getAllEmployeesRepo();
};

export const getEmployee = async (id: string | number) => {
  const employeeId = typeof id === 'number' ? id.toString() : id;
  const employee = await getEmployeeByIdRepo(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
  return employee;
};

export const createEmployee = async (data: unknown) => {
  const validatedData = employeeSchema.parse(data);
  return await createEmployeeRepo(validatedData);
};

export const updateEmployee = async (id: string | number, data: unknown) => {
  const employeeId = typeof id === 'number' ? id.toString() : id;
  const employee = await getEmployeeByIdRepo(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
  const validatedData = employeeSchema.partial().parse(data);
  return await updateEmployeeRepo(employeeId, validatedData);
};

export const deleteEmployee = async (id: string | number) => {
  const employeeId = typeof id === 'number' ? id.toString() : id;
  const employee = await getEmployeeByIdRepo(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
  return await deleteEmployeeRepo(employeeId);
};
