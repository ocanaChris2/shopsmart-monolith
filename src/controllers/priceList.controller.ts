import { Request, Response } from 'express';
import * as priceListService from '../services/priceList.service';
import { PriceList } from '@prisma/client';

class PriceListController {
  async getAll(req: Request, res: Response) {
    try {
      const priceLists = await priceListService.getAllPriceLists();
      res.json(priceLists);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price lists' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const priceList = await priceListService.getPriceList(req.params.id);
      if (!priceList) {
        return res.status(404).json({ error: 'Price list not found' });
      }
      res.json(priceList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price list' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const priceList = await priceListService.createPriceList(req.body);
      res.status(201).json(priceList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create price list' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const priceList = await priceListService.updatePriceList(req.params.id, req.body);
      if (!priceList) {
        return res.status(404).json({ error: 'Price list not found' });
      }
      res.json(priceList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update price list' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const priceList = await priceListService.deletePriceList(req.params.id);
      if (!priceList) {
        return res.status(404).json({ error: 'Price list not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete price list' });
    }
  }
}

export const priceListController = new PriceListController();
