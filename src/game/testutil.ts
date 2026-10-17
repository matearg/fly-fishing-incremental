// Deterministic rand for tests: cycles through the given values.
export function seqRand(...values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

export { lcg } from './rand'
