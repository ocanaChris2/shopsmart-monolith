import { Request, Response } from "express";
import * as companyService from "../services/company.service";
import { AuthService } from "../services/auth.service";

export class CompanyController {
  static async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const companies = await companyService.getAllCompanies();
      res.status(200).json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
    return;
  }

  static async getCompany(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const company = await companyService.getCompany(id);
      if (!company) {
        res.status(404).json({ error: "Not Found" });
        return;
      }
      res.status(200).json(company);
    } catch (error: any) {
      if (error.message === "Company not found") {
        res.status(404).json({ error: "Not Found" });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
    return;
  }

  static async createCompany(req: Request, res: Response): Promise<void> {
    try {
      const company = await companyService.createCompany(req.body);
      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid data" });
    }
    return;
  }

  static async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const company = await companyService.updateCompany(id, req.body);
      res.status(200).json(company);
    } catch (error: any) {
      if (error.message === "Company not found") {
        res.status(404).json({ error: "Not Found" });
      } else {
        res.status(400).json({ error: error.message || "Invalid data" });
      }
    }
    return;
  }

  static async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      await companyService.deleteCompany(id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Company not found") {
        res.status(404).json({ error: "Not Found" });
      } else {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
    return;
  }
}

export const companyController = {
  getAll: CompanyController.getAllCompanies,
  getById: CompanyController.getCompany,
  create: CompanyController.createCompany,
  update: CompanyController.updateCompany,
  delete: CompanyController.deleteCompany
};
