import type { Variable } from '@kit/types';

/** First 2 decimals; 3rd digit >= 5 → up, < 5 → down. */
export function to2Decimals(x: number): number {
  const scaled = x * 100;
  const frac = scaled % 1;
  const up = scaled >= 0 ? (frac >= 0.5 ? 1 : 0) : (frac <= -0.5 ? -1 : 0);
  return (Math.trunc(scaled) + up) / 100;
}

export function getEffectiveTransactionTaxRate(
  variables: Variable[] | undefined,
  code: string,
  dateStr: string
): number {
  if (!variables?.length || !code || !dateStr) return 0;
  const date = new Date(dateStr);
  const valid = variables.filter(
    (v) =>
      v.name === code &&
      (v.effectiveDate == null || v.effectiveDate === '' || new Date(v.effectiveDate) <= date) &&
      (v.endDate == null || v.endDate === '' || new Date(v.endDate) >= date)
  );
  valid.sort((a, b) => {
    if (!a.effectiveDate) return -1;
    if (!b.effectiveDate) return 1;
    return new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime();
  });
  return valid[0]?.value ?? 0;
}

/** When taxInclusive: unitPrice is incl. tax. Otherwise unitPrice is excl. tax. Returns lineTotalNet (excl.) and taxAmount. */
export function lineTaxAmount(
  quantity: number,
  unitPrice: number,
  taxRatePercent: number,
  taxInclusive: boolean
): { lineTotalNet: number; taxAmount: number } {
  if (taxInclusive && taxRatePercent > 0) {
    const lineTotalIncl = to2Decimals(quantity * unitPrice);
    const lineTotalNet = to2Decimals(lineTotalIncl / (1 + taxRatePercent / 100));
    const taxAmount = to2Decimals(lineTotalIncl - lineTotalNet);
    return { lineTotalNet, taxAmount };
  }
  const lineTotalNet = to2Decimals(quantity * unitPrice);
  const taxAmount = to2Decimals(lineTotalNet * (taxRatePercent / 100));
  return { lineTotalNet, taxAmount };
}

/** Price excl. tax from price incl. tax. */
export function netUnitPriceFromInclusive(grossUnitPrice: number, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return grossUnitPrice;
  const net = (grossUnitPrice * 100) / (100 + taxRatePercent);
  return to2Decimals(net);
}

/** Given total amount including tax and rate, return subtotal (excl.) and tax amount. */
export function splitInclusiveTotal(totalIncl: number, taxRatePercent: number): { subtotal: number; taxAmount: number } {
  if (taxRatePercent <= 0) return { subtotal: totalIncl, taxAmount: 0 };
  const subtotal = to2Decimals(totalIncl / (1 + taxRatePercent / 100));
  const taxAmount = to2Decimals(totalIncl - subtotal);
  return { subtotal, taxAmount };
}

/** Price incl. tax from price excl. tax (for display). */
export function unitPriceExclToIncl(unitPriceExcl: number, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return unitPriceExcl;
  return to2Decimals(unitPriceExcl * (1 + taxRatePercent / 100));
}
