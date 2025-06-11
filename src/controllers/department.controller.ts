import * as departmentService from '../services/department.service';
import { Request, Response } from 'express';
import { Department } from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors';

class DepartmentController {
  async getAll(req: Request, res: Response) {
    try {
      const departments = await departmentService.getAllDepartments();
      res.json(departments);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch departments' });
      }
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const department = await departmentService.getDepartment(id);
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
      res.json(department);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch department' });
      }
    }
  }

  async create(req: Request, res: Response) {
    try {
      const department = await departmentService.createDepartment(req.body);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create department' });
      }
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const department = await departmentService.updateDepartment(id, req.body);
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
      res.json(department);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update department' });
      }
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const department = await departmentService.deleteDepartment(id);
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete department' });
      }
    }
  }
}

export const departmentController = new DepartmentController();
