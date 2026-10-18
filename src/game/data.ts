// All content and tuning numbers. Rebalancing means editing this file, not logic.

export type Tier = 'common' | 'uncommon' | 'rare' | 'legendary'
export const TIERS: Tier[] = ['common', 'uncommon', 'rare', 'legendary']

export type LocationId = 'creek' | 'river' | 'bigRiver' | 'mountainLake' | 'greatLake'
export interface LocationDef { id: LocationId; name: string; unlockCost: number; maxDepth: number; junkWeight: number }
export interface PatternDef { id: string; name: string; cls: 'dry' | 'nymph' | 'streamer'; maxDepth: number; wear: number; oddsBonus: number; tieCost: number; unlockCost: number }
export interface MaterialDef { id: string; name: string; depthBonus: number; wearBonus: number; oddsBonus: number; sizeBonus: number; tieCost: number; unlockCost: number }
// licenseCost set ⇒ absent from the water until bought with licenses
export interface SpeciesDef { id: string; name: string; location: LocationId; depth: number; tier: Tier; weight: number; baseValue: number; licenseCost?: number }
export interface JunkDef { id: string; name: string; value: number; weight: number }
export type LicenseUpgradeId = 'startPattern' | 'extraWear' | 'valueMult' | 'helperDiscount' | 'startLocation'
// max level = costs.length
export interface LicenseUpgradeDef { id: LicenseUpgradeId; name: string; costs: number[]; perLevel: number }

export const LOCATIONS: LocationDef[] = [
  { id: 'creek', name: 'Creek', unlockCost: 0, maxDepth: 1, junkWeight: 1 },
  { id: 'river', name: 'River', unlockCost: 1000, maxDepth: 2, junkWeight: 0.8 },
  { id: 'bigRiver', name: 'Big River', unlockCost: 12000, maxDepth: 2, junkWeight: 0.6 },
  { id: 'mountainLake', name: 'Mountain Lake', unlockCost: 200000, maxDepth: 3, junkWeight: 0.5 },
  { id: 'greatLake', name: 'Great Lake', unlockCost: 2500000, maxDepth: 3, junkWeight: 0.4 },
]

export const PATTERNS: PatternDef[] = [
  { id: 'basicDry', name: 'Basic Dry', cls: 'dry', maxDepth: 0, wear: 3, oddsBonus: 0, tieCost: 0, unlockCost: 0 },
  { id: 'elkHair', name: 'Elk Hair Caddis', cls: 'dry', maxDepth: 0, wear: 5, oddsBonus: 0.1, tieCost: 1, unlockCost: 30 },
  { id: 'pheasantTail', name: 'Pheasant Tail', cls: 'nymph', maxDepth: 1, wear: 4, oddsBonus: 0.1, tieCost: 3, unlockCost: 150 },
  { id: 'haresEar', name: "Hare's Ear", cls: 'nymph', maxDepth: 1, wear: 6, oddsBonus: 0.2, tieCost: 10, unlockCost: 1500 },
  { id: 'woollyBugger', name: 'Woolly Bugger', cls: 'streamer', maxDepth: 2, wear: 5, oddsBonus: 0.25, tieCost: 50, unlockCost: 30000 },
  { id: 'zonker', name: 'Zonker', cls: 'streamer', maxDepth: 2, wear: 8, oddsBonus: 0.4, tieCost: 400, unlockCost: 400000 },
]

export const MATERIALS: MaterialDef[] = [
  { id: 'copperWire', name: 'Copper Wire', depthBonus: 0, wearBonus: 1, oddsBonus: 0, sizeBonus: 0, tieCost: 1, unlockCost: 60 },
  { id: 'peacockHerl', name: 'Peacock Herl', depthBonus: 0, wearBonus: 0, oddsBonus: 0.15, sizeBonus: 0, tieCost: 3, unlockCost: 500 },
  { id: 'goldBead', name: 'Gold Bead', depthBonus: 1, wearBonus: 0, oddsBonus: 0, sizeBonus: 0, tieCost: 8, unlockCost: 3000 },
  { id: 'marabou', name: 'Marabou', depthBonus: 0, wearBonus: 0, oddsBonus: 0, sizeBonus: 0.5, tieCost: 30, unlockCost: 40000 },
  { id: 'flashabou', name: 'Flashabou', depthBonus: 0, wearBonus: 0, oddsBonus: 0.3, sizeBonus: 0, tieCost: 150, unlockCost: 600000 },
  { id: 'tungstenBead', name: 'Tungsten Bead', depthBonus: 1, wearBonus: 1, oddsBonus: 0.1, sizeBonus: 0, tieCost: 1000, unlockCost: 5000000 },
]

export const SPECIES: SpeciesDef[] = [
  { id: 'dace', name: 'Puyen', location: 'creek', depth: 0, tier: 'common', weight: 60, baseValue: 2 },
  { id: 'brookTrout', name: 'Brook Trout', location: 'creek', depth: 0, tier: 'uncommon', weight: 25, baseValue: 8 },
  { id: 'creekChub', name: 'Otuno', location: 'creek', depth: 1, tier: 'common', weight: 40, baseValue: 4 },
  { id: 'brownTrout', name: 'Brown Trout', location: 'creek', depth: 1, tier: 'rare', weight: 8, baseValue: 30 },

  { id: 'grayling', name: 'Peladilla', location: 'river', depth: 0, tier: 'common', weight: 60, baseValue: 10 },
  { id: 'rainbowTrout', name: 'Rainbow Trout', location: 'river', depth: 0, tier: 'uncommon', weight: 25, baseValue: 40 },
  { id: 'pike', name: 'Bigmouth Perch', location: 'river', depth: 2, tier: 'rare', weight: 8, baseValue: 150 },

  { id: 'perch', name: 'Creole Perch', location: 'bigRiver', depth: 0, tier: 'common', weight: 60, baseValue: 35 },
  { id: 'walleye', name: 'Chinook Salmon', location: 'bigRiver', depth: 1, tier: 'uncommon', weight: 25, baseValue: 150 },
  { id: 'catfish', name: 'Velvet Catfish', location: 'bigRiver', depth: 2, tier: 'rare', weight: 10, baseValue: 500 },
  { id: 'muskie', name: 'Limay King', location: 'bigRiver', depth: 2, tier: 'legendary', weight: 2, baseValue: 2500 },

  { id: 'cutthroat', name: 'Big Puyen', location: 'mountainLake', depth: 0, tier: 'common', weight: 60, baseValue: 180 },
  { id: 'goldenTrout', name: 'Landlocked Salmon', location: 'mountainLake', depth: 1, tier: 'uncommon', weight: 25, baseValue: 700 },
  { id: 'arcticChar', name: 'Glacier Trout', location: 'mountainLake', depth: 3, tier: 'legendary', weight: 3, baseValue: 14000 },
  { id: 'tigerTrout', name: 'Andes Tiger', location: 'mountainLake', depth: 3, tier: 'legendary', weight: 2, baseValue: 70000, licenseCost: 5 },

  { id: 'whitefish', name: 'Pejerrey', location: 'greatLake', depth: 0, tier: 'common', weight: 60, baseValue: 900 },
  { id: 'cisco', name: 'Steelhead', location: 'greatLake', depth: 1, tier: 'uncommon', weight: 25, baseValue: 3500 },
  { id: 'steelhead', name: 'Sea-run Brown Trout', location: 'greatLake', depth: 2, tier: 'rare', weight: 10, baseValue: 14000 },
  { id: 'lakeSturgeon', name: 'El Cuero', location: 'greatLake', depth: 3, tier: 'legendary', weight: 2, baseValue: 70000 },
  { id: 'ghostSturgeon', name: 'Nahuelito', location: 'greatLake', depth: 3, tier: 'legendary', weight: 1, baseValue: 350000, licenseCost: 15 },
]

export const JUNK: JunkDef[] = [
  { id: 'can', name: 'Old Can', value: 0, weight: 15 },
  { id: 'tangledLine', name: 'Tangled Line', value: -1, weight: 10 },
  { id: 'boot', name: 'Old Boot', value: -2, weight: 10 },
  { id: 'tire', name: 'Tire', value: -10, weight: 4 },
]

export const LICENSE_UPGRADES: LicenseUpgradeDef[] = [
  { id: 'startPattern', name: 'Start with an extra pattern', costs: [1, 3, 8, 20], perLevel: 1 },
  { id: 'extraWear', name: 'Extra wear per fly', costs: [1, 2, 4, 8, 16], perLevel: 1 },
  { id: 'valueMult', name: 'Fish value +50%', costs: [1, 2, 4, 8, 16, 32], perLevel: 0.5 },
  { id: 'helperDiscount', name: 'Helpers 10% cheaper', costs: [2, 5, 12, 30], perLevel: 0.1 },
  { id: 'startLocation', name: 'Start one place further', costs: [3, 10, 30, 80], perLevel: 1 },
]

export const TIMING = { biteMinMs: 1_500, biteMaxMs: 4_000, reelMs: 800, benchTieMs: 10_000, buyerIntervalMs: 5_000, maxTickMs: 250 }
export const HELPERS = {
  angler: { baseCost: 40, growth: 1.4 },
  bench: { baseCost: 30, growth: 1.6 },
  bulkTrash: { cost: 300 },
  sorter: { cost: 450 },
  buyer: { cost: 800 },
}
// fish size multiplier = 1 + rand * (spread + sizeBonus)
export const SIZE = { spread: 1 }
export const SEASON = { minEarnings: 5e7, licenseDivisor: 5e5 }
// each bench past the first cuts the tie cooldown by this fraction
export const BENCH_SPEEDUP = 0.25
