import { LICENSE_UPGRADES, type LicenseUpgradeId } from './data'

export interface LicenseEffects { startPatterns: number; extraWear: number; valueMult: number; helperDiscount: number; startLocation: number }

export function licenseEffects(levels: Record<LicenseUpgradeId, number>): LicenseEffects {
  const v = (id: LicenseUpgradeId) => (levels[id] ?? 0) * LICENSE_UPGRADES.find(u => u.id === id)!.perLevel
  return {
    startPatterns: Math.floor(v('startPattern')),
    extraWear: v('extraWear'),
    valueMult: 1 + v('valueMult'),
    helperDiscount: Math.min(0.9, v('helperDiscount')),
    startLocation: Math.floor(v('startLocation')),
  }
}
