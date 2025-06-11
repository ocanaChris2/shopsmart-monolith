import { Request, Response } from "express";
import * as companyService from "../services/company.service";

interface Company {
  company_id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CompanyController {
  async getAll(req: Request, res: Response) {
    try {
      const companies = await companyService.getAllCompanies();
      // Let responseFormatter handle date serialization
      res.status(200).json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const company = await companyService.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.status(200).json(company);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const company = await companyService.createCompany(req.body);
      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid company data" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const company = await companyService.updateCompany(req.params.id, req.body);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.status(200).json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid update data" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const result = await companyService.deleteCompany(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.status(204).json();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  }
}

export const companyController = new CompanyController();
