import { Request, Response } from "express";
import * as customerService from "../services/customer.service";
import { Customer } from "@prisma/client";

export class CustomerController {
  async getAll(req: Request, res: Response) {
    try {
      const customers = await customerService.getAllCustomers();
      res.status(200).json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const customer = await customerService.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const customer = await customerService.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid customer data" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(200).json(customer);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid update data" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const result = await customerService.deleteCustomer(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  }
}

export const customerController = new CustomerController();
