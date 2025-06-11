import { Request, Response } from 'express';
import * as salesOrderHeaderService from '../services/salesOrderHeader.service';
import { SalesOrderHeader } from '@prisma/client';

class SalesOrderHeaderController {
  async getAll(req: Request, res: Response) {
    try {
      const salesOrderHeaders = await salesOrderHeaderService.getSalesOrderHeaders();
      res.json(salesOrderHeaders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales order headers' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const salesOrderHeader = await salesOrderHeaderService.getSalesOrderHeader(req.params.id);
      if (!salesOrderHeader) {
        return res.status(404).json({ error: 'Sales order header not found' });
      }
      res.json(salesOrderHeader);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales order header' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const salesOrderHeader = await salesOrderHeaderService.createSalesOrderHeader(req.body);
      res.status(201).json(salesOrderHeader);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create sales order header' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const salesOrderHeader = await salesOrderHeaderService.updateSalesOrderHeader(req.params.id, req.body);
      if (!salesOrderHeader) {
        return res.status(404).json({ error: 'Sales order header not found' });
      }
      res.json(salesOrderHeader);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update sales order header' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const salesOrderHeader = await salesOrderHeaderService.deleteSalesOrderHeader(req.params.id);
      if (!salesOrderHeader) {
        return res.status(404).json({ error: 'Sales order header not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete sales order header' });
    }
  }
}

export const salesOrderHeaderController = new SalesOrderHeaderController();
