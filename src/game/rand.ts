// Seeded LCG: reproducible randomness for tests and for art layouts.
export function lcg(seed = 1): () => number {
  let x = seed >>> 0
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    return x / 2 ** 32
  }
}
