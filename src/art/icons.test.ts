import { describe, it, expect } from 'vitest'
import { LICENSE_UPGRADES, LOCATIONS, MATERIALS, PATTERNS, RODS, WADERS } from '../game/data'
import { FLY_ICONS, HELPER_ICONS, ROD_ICONS, WADERS_ICONS, LICENSE_ICONS, MATERIAL_ICONS, PLACE_ICONS, SCENE_ICONS, UI_ICONS, ICON_MAX, iconBitmap, type Icon } from './icons'

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
  checkIcons('places', PLACE_ICONS, LOCATIONS.map(l => l.id))
  checkIcons('helpers', HELPER_ICONS, ['angler', 'bench', 'bulkTrash', 'sorter', 'buyer', 'release'])
  checkIcons('licenses', LICENSE_ICONS, LICENSE_UPGRADES.map(u => u.id))
  checkIcons('ui', UI_ICONS, ['coin', 'fly', 'season', 'license', 'basket', 'trash'])
  checkIcons('rods', ROD_ICONS, RODS.map(r => r.id))
  checkIcons('waders', WADERS_ICONS, WADERS.map(w => w.id))
  checkIcons('scene', SCENE_ICONS, ['menuButton', 'cursor'])
})
