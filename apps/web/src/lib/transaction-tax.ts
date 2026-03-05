import type { Variable } from '@kit/types';

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
  const gross = Math.round(quantity * unitPrice * 100) / 100;
  if (taxInclusive && taxRatePercent > 0) {
    const lineTotalNet = Math.round((gross / (1 + taxRatePercent / 100)) * 100) / 100;
    const taxAmount = Math.round((gross - lineTotalNet) * 100) / 100;
    return { lineTotalNet, taxAmount };
  }
  const lineTotalNet = gross;
  const taxAmount = Math.round(lineTotalNet * (taxRatePercent / 100) * 100) / 100;
  return { lineTotalNet, taxAmount };
}

export function netUnitPriceFromInclusive(grossUnitPrice: number, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return grossUnitPrice;
  return Math.round((grossUnitPrice / (1 + taxRatePercent / 100)) * 100) / 100;
}
