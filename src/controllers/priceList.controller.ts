import { BaseController } from './base.controller';
import * as priceListService from '../services/priceList.service';
import { PriceList } from '@prisma/client';

class PriceListController extends BaseController<PriceList> {
  constructor() {
    super({
      getAll: priceListService.getAllPriceLists,
      getById: priceListService.getPriceList,
      create: priceListService.createPriceList,
      update: priceListService.updatePriceList,
      delete: priceListService.deletePriceList
    });
  }
}

export const priceListController = new PriceListController();
