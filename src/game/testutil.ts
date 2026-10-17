// Deterministic rand for tests: cycles through the given values.
export function seqRand(...values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

// Seeded LCG for statistical tests.
export function lcg(seed = 1): () => number {
  let x = seed >>> 0
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    return x / 2 ** 32
  }
}
