import { Request, Response } from "express";

export class BaseController<T> {
  constructor(
    protected service: {
      getAll: () => Promise<T[]>;
      getById: (id: string | number) => Promise<T | null>;
      create: (data: unknown) => Promise<T>;
      update: (id: string | number, data: unknown) => Promise<T>;
      delete: (id: string | number) => Promise<any>;
    }
  ) {}

  async getAll(req: Request, res: Response) {
    try {
      const items = await this.service.getAll();
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const item = await this.service.getById(id);
      if (!item) {
        return res.status(404).json({ error: "Not Found" });
      }
      res.status(200).json(item);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const item = await this.service.create(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid data" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const item = await this.service.update(id, req.body);
      res.json(item);
    } catch (error: any) {
      if (error.message === "Item not found" || error.message === "Company not found") {
        res.status(404).json({ error: "Not Found" });
      } else {
        res.status(400).json({ error: error.message || "Invalid data" });
      }
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Item not found' || error.message === 'Company not found') {
        res.status(404).json({ error: 'Not Found' });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
}
