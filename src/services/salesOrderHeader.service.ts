import { 
  getAllSalesOrderHeaders as getSalesOrderHeadersRepo,
  getSalesOrderHeaderById as getSalesOrderHeaderByIdRepo,
  createSalesOrderHeader as createSalesOrderHeaderRepo,
  updateSalesOrderHeader as updateSalesOrderHeaderRepo,
  deleteSalesOrderHeader as deleteSalesOrderHeaderRepo
} from '../repositories/salesOrderHeader.repository';
import { z } from 'zod';
import { 
  getCustomerById as getCustomerByIdRepo 
} from '../repositories/customer.repository';
import { 
  getCompanyById as getCompanyByIdRepo 
} from '../repositories/company.repository';
import { 
  getCurrencyByCode as getCurrencyByCodeRepo 
} from '../repositories/currency.repository';
import { 
  getEmployeeById as getEmployeeByIdRepo 
} from '../repositories/employee.repository';

const salesOrderHeaderSchema = z.object({
  order_date: z.date(),
  customer_id: z.number(),
  employee_id: z.string().nullable().optional(),
  company_id: z.number(),
  currency_code: z.string().length(3),
  status: z.string(),
  total_amount: z.number().positive()
});

export const getSalesOrderHeaders = async () => {
  return await getSalesOrderHeadersRepo();
};

export const getSalesOrderHeader = async (order_id: string | number) => {
  const orderId = typeof order_id === 'string' ? parseInt(order_id) : order_id;
  const header = await getSalesOrderHeaderByIdRepo(orderId);
  if (!header) {
    throw new Error('SalesOrderHeader not found');
  }
  return header;
};

export const createSalesOrderHeader = async (data: unknown) => {
  const validatedData = salesOrderHeaderSchema.parse(data);
  
  // Validate relationships exist
  await validateRelationships(validatedData);

  return await createSalesOrderHeaderRepo(validatedData);
};

export const updateSalesOrderHeader = async (order_id: string | number, data: unknown) => {
  const orderId = typeof order_id === 'string' ? parseInt(order_id) : order_id;
  const header = await getSalesOrderHeaderByIdRepo(orderId);
  if (!header) {
    throw new Error('SalesOrderHeader not found');
  }

  const validatedData = salesOrderHeaderSchema.partial().parse(data);
  
  if (validatedData.customer_id || validatedData.company_id || validatedData.currency_code) {
    await validateRelationships({
      ...header,
      ...validatedData
    });
  }

  return await updateSalesOrderHeaderRepo(orderId, validatedData);
};

export const deleteSalesOrderHeader = async (order_id: string | number) => {
  const orderId = typeof order_id === 'string' ? parseInt(order_id) : order_id;
  const header = await getSalesOrderHeaderByIdRepo(orderId);
  if (!header) {
    throw new Error('SalesOrderHeader not found');
  }
  return await deleteSalesOrderHeaderRepo(orderId);
};

async function validateRelationships(data: {
  customer_id: number;
  company_id: number;
  currency_code: string;
  employee_id?: string | null;
}): Promise<void> {
  const [customer, company, currency] = await Promise.all([
    getCustomerByIdRepo(data.customer_id),
    getCompanyByIdRepo(data.company_id),
    getCurrencyByCodeRepo(data.currency_code)
  ]);

  if (!customer) throw new Error('Customer not found');
  if (!company) throw new Error('Company not found');
  if (!currency) throw new Error('Currency not found');

  if (data.employee_id != null) {
    const employee = await getEmployeeByIdRepo(data.employee_id);
    if (!employee) throw new Error('Employee not found');
  }
}
