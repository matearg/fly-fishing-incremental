export type Layout = 'desktop' | 'sideways' | 'upright'

// Phone whenever the window can't fit the 340px side panel beside the river; tablets stay desktop.
export function layoutFor(w: number, h: number): Layout {
  if (w > 700 && h > 500) return 'desktop'
  return h > w ? 'upright' : 'sideways'
}
