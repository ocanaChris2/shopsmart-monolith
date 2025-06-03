import { BaseController } from './base.controller';
import * as customerService from '../services/customer.service';
import { Customer } from '@prisma/client';

class CustomerController extends BaseController<Customer> {
  constructor() {
    super({
      getAll: customerService.getAllCustomers,
      getById: customerService.getCustomer,
      create: customerService.createCustomer,
      update: customerService.updateCustomer,
      delete: customerService.deleteCustomer
    });
  }
}

export const customerController = new CustomerController();
