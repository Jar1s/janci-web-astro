import { sk as commonSk, en as commonEn } from './common.js';
import { sk as homeSk, en as homeEn } from './home.js';
import { sk as pagesSk, en as pagesEn } from './pages.js';
import { sk as pricingSk, en as pricingEn } from './pricing.js';

export const sk = { ...commonSk, ...homeSk, ...pagesSk, ...pricingSk };
export const en = { ...commonEn, ...homeEn, ...pagesEn, ...pricingEn };
