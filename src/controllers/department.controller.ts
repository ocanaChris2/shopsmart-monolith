import { BaseController } from './base.controller';
import * as departmentService from '../services/department.service';
import { Department } from '@prisma/client';

class DepartmentController extends BaseController<Department> {
  constructor() {
    super({
      getAll: departmentService.getAllDepartments,
      getById: departmentService.getDepartment,
      create: departmentService.createDepartment,
      update: departmentService.updateDepartment,
      delete: departmentService.deleteDepartment
    });
  }
}

export const departmentController = new DepartmentController();
