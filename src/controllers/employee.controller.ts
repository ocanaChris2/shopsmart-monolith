import { BaseController } from './base.controller';
import * as employeeService from '../services/employee.service';
import { Employee } from '@prisma/client';

class EmployeeController extends BaseController<Employee> {
  constructor() {
    super({
      getAll: employeeService.getAllEmployees,
      getById: employeeService.getEmployee,
      create: employeeService.createEmployee,
      update: employeeService.updateEmployee,
      delete: employeeService.deleteEmployee
    });
  }
}

export const employeeController = new EmployeeController();
