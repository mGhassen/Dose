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
      new Date(v.effectiveDate) <= date &&
      (v.endDate == null || v.endDate === '' || new Date(v.endDate) >= date)
  );
  valid.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  return valid[0]?.value ?? 0;
}
