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
  { id: 'river', name: 'River', unlockCost: 2_000, maxDepth: 2, junkWeight: 0.8 },
  { id: 'bigRiver', name: 'Big River', unlockCost: 50_000, maxDepth: 2, junkWeight: 0.6 },
  { id: 'mountainLake', name: 'Mountain Lake', unlockCost: 1e6, maxDepth: 3, junkWeight: 0.5 },
  { id: 'greatLake', name: 'Great Lake', unlockCost: 3e7, maxDepth: 3, junkWeight: 0.4 },
]

export const PATTERNS: PatternDef[] = [
  { id: 'basicDry', name: 'Basic Dry', cls: 'dry', maxDepth: 0, wear: 3, oddsBonus: 0, tieCost: 0, unlockCost: 0 },
  { id: 'elkHair', name: 'Elk Hair Caddis', cls: 'dry', maxDepth: 0, wear: 5, oddsBonus: 0.1, tieCost: 2, unlockCost: 50 },
  { id: 'pheasantTail', name: 'Pheasant Tail', cls: 'nymph', maxDepth: 1, wear: 4, oddsBonus: 0.1, tieCost: 5, unlockCost: 300 },
  { id: 'haresEar', name: "Hare's Ear", cls: 'nymph', maxDepth: 1, wear: 6, oddsBonus: 0.2, tieCost: 15, unlockCost: 2_000 },
  { id: 'woollyBugger', name: 'Woolly Bugger', cls: 'streamer', maxDepth: 2, wear: 5, oddsBonus: 0.25, tieCost: 60, unlockCost: 15_000 },
  { id: 'zonker', name: 'Zonker', cls: 'streamer', maxDepth: 2, wear: 8, oddsBonus: 0.4, tieCost: 300, unlockCost: 150_000 },
]

export const MATERIALS: MaterialDef[] = [
  { id: 'copperWire', name: 'Copper Wire', depthBonus: 0, wearBonus: 1, oddsBonus: 0, sizeBonus: 0, tieCost: 1, unlockCost: 100 },
  { id: 'peacockHerl', name: 'Peacock Herl', depthBonus: 0, wearBonus: 0, oddsBonus: 0.15, sizeBonus: 0, tieCost: 3, unlockCost: 800 },
  { id: 'goldBead', name: 'Gold Bead', depthBonus: 1, wearBonus: 0, oddsBonus: 0, sizeBonus: 0, tieCost: 10, unlockCost: 5_000 },
  { id: 'marabou', name: 'Marabou', depthBonus: 0, wearBonus: 0, oddsBonus: 0, sizeBonus: 0.5, tieCost: 20, unlockCost: 25_000 },
  { id: 'flashabou', name: 'Flashabou', depthBonus: 0, wearBonus: 0, oddsBonus: 0.3, sizeBonus: 0, tieCost: 80, unlockCost: 200_000 },
  { id: 'tungstenBead', name: 'Tungsten Bead', depthBonus: 1, wearBonus: 1, oddsBonus: 0.1, sizeBonus: 0, tieCost: 400, unlockCost: 2e6 },
]

export const SPECIES: SpeciesDef[] = [
  { id: 'dace', name: 'Dace', location: 'creek', depth: 0, tier: 'common', weight: 60, baseValue: 1 },
  { id: 'brookTrout', name: 'Brook Trout', location: 'creek', depth: 0, tier: 'uncommon', weight: 25, baseValue: 5 },
  { id: 'creekChub', name: 'Creek Chub', location: 'creek', depth: 1, tier: 'common', weight: 40, baseValue: 2 },
  { id: 'brownTrout', name: 'Brown Trout', location: 'creek', depth: 1, tier: 'rare', weight: 8, baseValue: 25 },

  { id: 'grayling', name: 'Grayling', location: 'river', depth: 0, tier: 'common', weight: 60, baseValue: 8 },
  { id: 'rainbowTrout', name: 'Rainbow Trout', location: 'river', depth: 0, tier: 'uncommon', weight: 25, baseValue: 40 },
  { id: 'smallmouthBass', name: 'Smallmouth Bass', location: 'river', depth: 1, tier: 'common', weight: 40, baseValue: 16 },
  { id: 'pike', name: 'Pike', location: 'river', depth: 2, tier: 'rare', weight: 8, baseValue: 250 },

  { id: 'perch', name: 'Perch', location: 'bigRiver', depth: 0, tier: 'common', weight: 60, baseValue: 60 },
  { id: 'walleye', name: 'Walleye', location: 'bigRiver', depth: 1, tier: 'uncommon', weight: 25, baseValue: 300 },
  { id: 'catfish', name: 'Catfish', location: 'bigRiver', depth: 2, tier: 'rare', weight: 10, baseValue: 2_000 },
  { id: 'muskie', name: 'Muskie', location: 'bigRiver', depth: 2, tier: 'legendary', weight: 2, baseValue: 15_000 },

  { id: 'cutthroat', name: 'Cutthroat Trout', location: 'mountainLake', depth: 0, tier: 'common', weight: 60, baseValue: 500 },
  { id: 'goldenTrout', name: 'Golden Trout', location: 'mountainLake', depth: 1, tier: 'uncommon', weight: 25, baseValue: 3_000 },
  { id: 'lakeTrout', name: 'Lake Trout', location: 'mountainLake', depth: 2, tier: 'rare', weight: 10, baseValue: 20_000 },
  { id: 'arcticChar', name: 'Arctic Char', location: 'mountainLake', depth: 3, tier: 'legendary', weight: 2, baseValue: 150_000 },
  { id: 'tigerTrout', name: 'Tiger Trout', location: 'mountainLake', depth: 3, tier: 'legendary', weight: 2, baseValue: 1e6, licenseCost: 5 },

  { id: 'whitefish', name: 'Whitefish', location: 'greatLake', depth: 0, tier: 'common', weight: 60, baseValue: 5_000 },
  { id: 'cisco', name: 'Cisco', location: 'greatLake', depth: 1, tier: 'uncommon', weight: 25, baseValue: 30_000 },
  { id: 'steelhead', name: 'Steelhead', location: 'greatLake', depth: 2, tier: 'rare', weight: 10, baseValue: 250_000 },
  { id: 'lakeSturgeon', name: 'Lake Sturgeon', location: 'greatLake', depth: 3, tier: 'legendary', weight: 2, baseValue: 2e6 },
  { id: 'ghostSturgeon', name: 'Ghost Sturgeon', location: 'greatLake', depth: 3, tier: 'legendary', weight: 1, baseValue: 2e7, licenseCost: 15 },
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
  { id: 'valueMult', name: 'Fish value +25%', costs: [1, 2, 4, 8, 16, 32], perLevel: 0.25 },
  { id: 'helperDiscount', name: 'Helpers 10% cheaper', costs: [2, 5, 12, 30], perLevel: 0.1 },
  { id: 'startLocation', name: 'Start one place further', costs: [3, 10, 30, 80], perLevel: 1 },
]

export const TIMING = { biteMinMs: 1_500, biteMaxMs: 4_000, reelMs: 800, benchTieMs: 4_000, buyerIntervalMs: 5_000, maxTickMs: 250 }
export const HELPERS = {
  angler: { baseCost: 150, growth: 1.35 },
  bench: { baseCost: 400, growth: 1.5 },
  sorter: { cost: 2_000 },
  buyer: { cost: 5_000 },
}
// fish size multiplier = 1 + rand * (spread + sizeBonus)
export const SIZE = { spread: 1 }
export const SEASON = { minEarnings: 1e8, licenseDivisor: 1e6 }
// the bench stops tying when flyBox.length >= anglers.length * this
export const BENCH_BOX_PER_ANGLER = 3
