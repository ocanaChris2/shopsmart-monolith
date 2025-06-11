import { 
  getAllDepartmentsRepo,
  getDepartmentByIdRepo,
  createDepartmentRepo,
  updateDepartmentRepo,
  deleteDepartmentRepo
} from '../repositories/department.repository';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../errors';

interface DepartmentInput {
  name: string;
  description?: string;
  manager_id?: string;
}

const departmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  manager_id: z.string().optional()
}) satisfies z.ZodType<DepartmentInput>;

export const getAllDepartments = async () => {
  return await getAllDepartmentsRepo();
};

export const getDepartment = async (id: string) => {
  try {
    const department = await getDepartmentByIdRepo(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return department;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error accessing department:', error);
    throw new Error('Failed to fetch department');
  }
};

export const createDepartment = async (data: DepartmentInput) => {
  let validatedData;
  try {
    validatedData = departmentSchema.parse(data);
  } catch (err) {
    throw new ValidationError('Invalid department data');
  }
  return await createDepartmentRepo({
    ...validatedData,
    department_id: crypto.randomUUID()
  });
};

export const updateDepartment = async (id: string, data: unknown) => {
  try {
    const department = await getDepartmentByIdRepo(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    let validatedData;
    try {
      validatedData = departmentSchema.partial().parse(data);
    } catch (err) {
      throw new ValidationError('Invalid department data');
    }
    return await updateDepartmentRepo(id, validatedData);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    console.error('Error updating department:', error);
    throw new Error('Failed to update department');
  }
};

export const deleteDepartment = async (id: string) => {
  try {
    const department = await getDepartmentByIdRepo(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return await deleteDepartmentRepo(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error deleting department:', error);
    throw new Error('Failed to delete department');
  }
};
