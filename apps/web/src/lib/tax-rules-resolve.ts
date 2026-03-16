/**
 * Tax rate result type. Tax resolution is done via item_taxes only (see item-taxes-resolve).
 */

export interface TaxRateAndRule {
  rate: number;
  variableName?: string;
  conditionType?: string | null;
  conditionValue?: string | null;
  taxInclusive?: boolean;
}
