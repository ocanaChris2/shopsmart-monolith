import { Request, Response } from "express";
import * as employeeService from "../services/employee.service";
import { NotFoundError } from "../errors";
import { Employee } from "@prisma/client";

export class EmployeeController {
  async getAll(req: Request, res: Response) {
    try {
      const employees = await employeeService.getAllEmployees();
      res.status(200).json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const employee = await employeeService.getEmployee(req.params.id);
      res.status(200).json(employee);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const employee = await employeeService.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid employee data" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const employee = await employeeService.updateEmployee(req.params.id, req.body);
      res.status(200).json(employee);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(400).json({ error: error.message || "Invalid update data" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await employeeService.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(500).json({ error: "Failed to delete employee" });
    }
  }
}

export const employeeController = new EmployeeController();
