const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

// Truncate (never round up) so a value never displays higher than it is.
// The epsilon absorbs float error like 1.15 * 100 = 114.999...
function trunc2(x: number): string {
  return (Math.floor(x * 100 + 1e-9) / 100).toFixed(2)
}

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return '0'
  if (n < 0) return '-' + formatNumber(-n)
  if (n === Infinity) return '∞'
  if (n < 1000) return String(Math.floor(n))
  const exp = Math.floor(Math.log10(n))
  const tier = Math.floor(exp / 3)
  if (tier < SUFFIXES.length) return trunc2(n / Number(`1e${tier * 3}`)) + SUFFIXES[tier]
  return trunc2(n / Number(`1e${exp}`)) + 'e' + exp
}
