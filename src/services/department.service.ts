import { 
  getAllDepartments as getAllDepartmentsRepo,
  getDepartmentById as getDepartmentByIdRepo,
  createDepartment as createDepartmentRepo,
  updateDepartment as updateDepartmentRepo,
  deleteDepartment as deleteDepartmentRepo
} from '../repositories/department.repository';
import { z } from 'zod';

const departmentSchema = z.object({
  department_id: z.string().min(1),
  name: z.string().min(2),
  manager_id: z.string().optional()
});

export const getAllDepartments = async () => {
  return await getAllDepartmentsRepo();
};

export const getDepartment = async (id: string | number) => {
  const departmentId = typeof id === 'number' ? id.toString() : id;
  const department = await getDepartmentByIdRepo(departmentId);
  if (!department) {
    throw new Error('Department not found');
  }
  return department;
};

export const createDepartment = async (data: unknown) => {
  const validatedData = departmentSchema.parse(data);
  return await createDepartmentRepo(validatedData);
};

export const updateDepartment = async (id: string | number, data: unknown) => {
  const departmentId = typeof id === 'number' ? id.toString() : id;
  const department = await getDepartmentByIdRepo(departmentId);
  if (!department) {
    throw new Error('Department not found');
  }
  const validatedData = departmentSchema.partial().parse(data);
  return await updateDepartmentRepo(departmentId, validatedData);
};

export const deleteDepartment = async (id: string | number) => {
  const departmentId = typeof id === 'number' ? id.toString() : id;
  const department = await getDepartmentByIdRepo(departmentId);
  if (!department) {
    throw new Error('Department not found');
  }
  return await deleteDepartmentRepo(departmentId);
};
