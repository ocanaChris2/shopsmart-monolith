import { 
  getAllCustomers as getAllCustomersRepo,
  getCustomerById as getCustomerByIdRepo,
  createCustomer as createCustomerRepo,
  updateCustomer as updateCustomerRepo,
  deleteCustomer as deleteCustomerRepo
} from '../repositories/customer.repository';
import { z } from 'zod';

const customerSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional()
});

export const getAllCustomers = async () => {
  return await getAllCustomersRepo();
};

export const getCustomer = async (id: string | number) => {
  const customerId = typeof id === 'string' ? parseInt(id) : id;
  const customer = await getCustomerByIdRepo(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }
  return customer;
};

export const createCustomer = async (data: unknown) => {
  const validatedData = customerSchema.parse(data);
  return await createCustomerRepo(validatedData);
};

export const updateCustomer = async (id: string | number, data: unknown) => {
  const customerId = typeof id === 'string' ? parseInt(id) : id;
  const customer = await getCustomerByIdRepo(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }
  const validatedData = customerSchema.partial().parse(data);
  return await updateCustomerRepo(customerId, validatedData);
};

export const deleteCustomer = async (id: string | number) => {
  const customerId = typeof id === 'string' ? parseInt(id) : id;
  const customer = await getCustomerByIdRepo(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }
  return await deleteCustomerRepo(customerId);
};
