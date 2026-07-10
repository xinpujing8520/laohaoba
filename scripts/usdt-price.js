/**
 * AccountBoy CNY/USDT display prices -> site USDT settlement amount.
 * Default matches AccountBoy USD display: USDT_price / 7.2 (e.g. 28 -> 3.89 USD/USDT).
 */
function getUsdtCnyRate() {
  const rate = Number(process.env.USDT_CNY_RATE || process.env.USD_CNY_RATE || '7.2');
  return Number.isFinite(rate) && rate > 0 ? rate : 7.2;
}

function cnyToUsdt(cny) {
  const n = Number(cny);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / getUsdtCnyRate()) * 100) / 100;
}

module.exports = { getUsdtCnyRate, cnyToUsdt };
