export const STORE_CURRENCY = 'THB';

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: STORE_CURRENCY,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
