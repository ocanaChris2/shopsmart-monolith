import { 
  getAllCompanies as getAllCompaniesRepo,
  getCompanyById as getCompanyByIdRepo,
  createCompany as createCompanyRepo,
  updateCompany as updateCompanyRepo,
  deleteCompany as deleteCompanyRepo
} from '../repositories/company.repository';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(2),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional()
});

export const getAllCompanies = async () => {
  return await getAllCompaniesRepo();
};

const validateCompanyId = (id: string | number): number => {
  const companyId = typeof id === 'string' ? parseInt(id) : id;
  if (isNaN(companyId)) {
    throw new Error('Invalid company ID');
  }
  return companyId;
};

export const getCompany = async (id: string | number) => {
  const companyId = validateCompanyId(id);
  const company = await getCompanyByIdRepo(companyId);
  if (!company) {
    throw new Error('Company not found');
  }
  return company;
};

export const createCompany = async (data: unknown) => {
  const validatedData = companySchema.parse(data);
  return await createCompanyRepo(validatedData);
};

export const updateCompany = async (id: string | number, data: unknown) => {
  const companyId = validateCompanyId(id);
  const company = await getCompanyByIdRepo(companyId);
  if (!company) {
    throw new Error('Company not found');
  }
  const validatedData = companySchema.partial().parse(data);
  return await updateCompanyRepo(companyId, validatedData);
};

export const deleteCompany = async (id: string | number) => {
  const companyId = validateCompanyId(id);
  const company = await getCompanyByIdRepo(companyId);
  if (!company) {
    throw new Error('Company not found');
  }
  return await deleteCompanyRepo(companyId);
};
