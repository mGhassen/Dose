import type { Variable } from '@kit/types';

/** First 2 decimals; 3rd digit > 5 → up, <= 5 → down. */
function to2Decimals(x: number): number {
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

export function lineTaxAmount(
  quantity: number,
  unitPrice: number,
  taxRatePercent: number,
  taxInclusive: boolean
): { lineTotalNet: number; taxAmount: number } {
  const gross = to2Decimals(quantity * unitPrice);
  if (taxInclusive && taxRatePercent > 0) {
    const factor = 1 + taxRatePercent / 100;
    const lineTotalNet = to2Decimals(gross / factor);
    const taxAmount = to2Decimals(gross - lineTotalNet);
    return { lineTotalNet, taxAmount };
  }
  const lineTotalNet = gross;
  const taxAmount = to2Decimals(lineTotalNet * (taxRatePercent / 100));
  return { lineTotalNet, taxAmount };
}

/** Price excl. tax = Price incl. tax / (1 + tax). E.g. 10% → divisor 1.10. */
export function netUnitPriceFromInclusive(grossUnitPrice: number, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return grossUnitPrice;
  const factor = 1 + taxRatePercent / 100;
  return to2Decimals(grossUnitPrice / factor);
}
