import { describe, it, expect } from 'vitest'
import { MATERIALS, PATTERNS } from '../game/data'
import { FLY_ICONS, MATERIAL_ICONS, ICON_MAX, iconBitmap, type Icon } from './icons'

function checkIcons(name: string, set: Record<string, Icon>, ids: string[]): void {
  it(`${name}: one icon per id`, () => expect(Object.keys(set).sort()).toEqual([...ids].sort()))
  it(`${name}: each paints, fits ${ICON_MAX}×${ICON_MAX}, has opaque pixels`, () => {
    for (const id of ids) {
      const b = iconBitmap(set[id])
      expect(b.w, id).toBeLessThanOrEqual(ICON_MAX)
      expect(b.h, id).toBeLessThanOrEqual(ICON_MAX)
      expect(b.data.some((v, i) => i % 4 === 3 && v === 255), id).toBe(true)
    }
  })
}

describe('icons', () => {
  checkIcons('flies', FLY_ICONS, PATTERNS.map(p => p.id))
  checkIcons('materials', MATERIAL_ICONS, MATERIALS.map(m => m.id))
})
