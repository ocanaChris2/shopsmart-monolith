import { BaseController } from './base.controller';
import * as salesOrderHeaderService from '../services/salesOrderHeader.service';
import { SalesOrderHeader } from '@prisma/client';

class SalesOrderHeaderController extends BaseController<SalesOrderHeader> {
  constructor() {
    super({
      getAll: salesOrderHeaderService.getSalesOrderHeaders,
      getById: salesOrderHeaderService.getSalesOrderHeader,
      create: salesOrderHeaderService.createSalesOrderHeader,
      update: salesOrderHeaderService.updateSalesOrderHeader,
      delete: salesOrderHeaderService.deleteSalesOrderHeader
    });
  }
}

export const salesOrderHeaderController = new SalesOrderHeaderController();
