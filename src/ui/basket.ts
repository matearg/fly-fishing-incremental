import type { CatchItem } from '../game/state'

// The basket bar shows one tile per species or junk kind; an open tile lists its catches.
export interface Stack { key: string; kind: 'fish' | 'junk'; defId: string; count: number; total: number; items: CatchItem[] }

export const STACK_LIST_MAX = 50

// Stacks keep the order of their oldest catch so tiles don't jump; items are newest first.
export function stackBasket(basket: CatchItem[]): Stack[] {
  const stacks = new Map<string, Stack>()
  for (const c of basket) {
    const key = `${c.kind}:${c.defId}`
    let st = stacks.get(key)
    if (!st) stacks.set(key, st = { key, kind: c.kind, defId: c.defId, count: 0, total: 0, items: [] })
    st.count++
    st.total += c.value
    st.items.push(c)
  }
  for (const st of stacks.values()) st.items.reverse()
  return [...stacks.values()]
}

export const keepOpen = (stacks: Stack[], key: string | null): string | null => stacks.some(s => s.key === key) ? key : null
