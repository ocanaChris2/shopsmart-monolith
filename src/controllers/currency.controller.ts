import { Request, Response } from 'express';
import * as currencyService from '../services/currency.service';
import { Currency } from '@prisma/client';

class CurrencyController {
  async getAll(req: Request, res: Response) {
    try {
      const currencies = await currencyService.getAllCurrencies();
      res.json(currencies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch currencies' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const currency = await currencyService.getCurrency(req.params.id);
      if (!currency) {
        return res.status(404).json({ error: 'Currency not found' });
      }
      res.json(currency);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch currency' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const currency = await currencyService.createCurrency(req.body);
      res.status(201).json(currency);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create currency' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const currency = await currencyService.updateCurrency(req.params.id, req.body);
      if (!currency) {
        return res.status(404).json({ error: 'Currency not found' });
      }
      res.json(currency);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update currency' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const currency = await currencyService.deleteCurrency(req.params.id);
      if (!currency) {
        return res.status(404).json({ error: 'Currency not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete currency' });
    }
  }
}

export const currencyController = new CurrencyController();
