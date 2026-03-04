export async function getTaxRateFor(
  supabase: { from: (t: string) => any },
  code: string,
  dateStr: string
): Promise<number> {
  const { data } = await supabase
    .from('variables')
    .select('value')
    .eq('type', 'transaction_tax')
    .eq('name', code)
    .eq('is_active', true)
    .lte('effective_date', dateStr)
    .or(`end_date.is.null,end_date.gte.${dateStr}`)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.value != null) return parseFloat(String(data.value));
  return 0;
}
