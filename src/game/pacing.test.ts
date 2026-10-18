// A headless bot plays the real rules to check season length and balance.
// It plays faster than a human, so it targets the lower part of the spec's 30–60 min window.
import { describe, it, expect } from 'vitest'
import { LICENSE_UPGRADES, LOCATIONS, MATERIALS, PATTERNS, SPECIES } from './data'
import { sellAll, setRecipe, trash, travel, unlockLocation, unlockMaterial, unlockPattern } from './progress/economy'
import { buyHelper, helperCost } from './progress/helpers'
import { buyLicenseSpecies, buyLicenseUpgrade, canStartSeason, licenseUpgradeCost, startNewSeason } from './progress/prestige'
import { castPlayer, reelPlayer, tick } from './fishing/sim'
import { newGame, type GameState } from './state'
import { lcg } from './util/testutil'

// Vitest runs in Node; the project has no @types/node.
declare const process: { env: Record<string, string | undefined> }

const DT = 100
const MIN = 60_000

interface Run { minutes: number; purchases: { t: number; what: string }[]; earnings: { t: number; total: number }[]; end: GameState }

function purchaseOptions(s: GameState): { what: string; cost: number; buy: () => boolean }[] {
  const opts: { what: string; cost: number; buy: () => boolean }[] = []
  const pat = PATTERNS.find(p => !s.unlockedPatterns.includes(p.id))
  if (pat) opts.push({ what: `pattern ${pat.id}`, cost: pat.unlockCost, buy: () => unlockPattern(s, pat.id) })
  const mat = MATERIALS.find(m => !s.unlockedMaterials.includes(m.id))
  if (mat) opts.push({ what: `material ${mat.id}`, cost: mat.unlockCost, buy: () => unlockMaterial(s, mat.id) })
  const loc = LOCATIONS.find(l => !s.unlockedLocations.includes(l.id))
  if (loc) opts.push({ what: `location ${loc.id}`, cost: loc.unlockCost, buy: () => unlockLocation(s, loc.id) && travel(s, loc.id) })
  opts.push({ what: 'angler', cost: helperCost(s, 'angler')!, buy: () => buyHelper(s, 'angler') })
  if (s.bench * 3 < s.anglers.length - 1) opts.push({ what: 'bench', cost: helperCost(s, 'bench')!, buy: () => buyHelper(s, 'bench') })
  for (const k of ['bulkTrash', 'sorter', 'buyer'] as const) {
    const c = helperCost(s, k)
    if (c !== null) opts.push({ what: k, cost: c, buy: () => buyHelper(s, k) })
  }
  return opts
}

function playSeason(start: GameState, seed: number, maxMinutes = 120): Run {
  const s = start
  const rand = lcg(seed)
  const run: Run = { minutes: 0, purchases: [], earnings: [], end: s }
  for (let t = 0; t < maxMinutes * MIN; t += DT) {
    castPlayer(s, rand) || reelPlayer(s)
    if (!s.sorter) for (const c of s.basket.filter(c => c.kind === 'junk')) trash(s, c.id)
    if (!s.buyer && s.basket.length >= 10) sellAll(s)
    const best = purchaseOptions(s).filter(o => o.cost <= s.money).sort((a, b) => a.cost - b.cost)[0]
    if (best?.buy()) run.purchases.push({ t, what: best.what })
    const deepest = [...s.unlockedPatterns].sort((a, b) => PATTERNS.findIndex(p => p.id === a) - PATTERNS.findIndex(p => p.id === b)).at(-1)!
    setRecipe(s, { patternId: deepest, materialIds: [...s.unlockedMaterials] })
    tick(s, DT, rand)
    if (t % 1000 === 0) run.earnings.push({ t, total: s.seasonEarnings })
    if (canStartSeason(s)) { run.minutes = t / MIN; return run }
  }
  run.minutes = Infinity
  return run
}

function spendLicenses(s: GameState): void {
  for (;;) {
    const up = LICENSE_UPGRADES.map(u => ({ id: u.id, cost: licenseUpgradeCost(s, u.id) })).filter(u => u.cost !== null && u.cost <= s.licenses).sort((a, b) => a.cost! - b.cost!)[0]
    if (up) { buyLicenseUpgrade(s, up.id); continue }
    const sp = SPECIES.filter(x => x.licenseCost && !s.licenseSpecies.includes(x.id) && x.licenseCost <= s.licenses)[0]
    if (sp) { buyLicenseSpecies(s, sp.id); continue }
    return
  }
}

const earnedBetween = (r: Run, from: number, to: number) => {
  const at = (t: number) => r.earnings.findLast(e => e.t <= t)?.total ?? 0
  return at(to) - at(from)
}

const season1 = playSeason(newGame(), 1)
function nextSeason(prev: Run, seed: number): Run {
  const s = startNewSeason(prev.end)
  spendLicenses(s)
  return playSeason(s, seed)
}

if (process.env.PACING_LOG) {
  const s2 = nextSeason(season1, 2)
  const s3 = nextSeason(s2, 3)
  const s4 = nextSeason(s3, 4)
  const s5 = nextSeason(s4, 5)
  const m = (t: number) => (t / MIN).toFixed(1)
  const r = season1
  const locs = r.purchases.filter(p => p.what.startsWith('location') || p.what === 'sorter' || p.what === 'buyer').map(p => `${p.what.replace('location ', '')}@${m(p.t)}`).join(' ')
  const times = [0, ...r.purchases.map(p => p.t)]
  const gaps = times.slice(1).map((t, i) => ({ g: t - times[i], at: t })).sort((a, b) => b.g - a.g)[0]
  const W = 2 * MIN
  const ratios = r.purchases.filter(p => p.t - W >= r.earnings.find(e => e.total > 0)!.t && p.t + W <= r.minutes * MIN).map(p => ({ p, x: earnedBetween(r, p.t, p.t + W) / Math.max(earnedBetween(r, p.t - W, p.t), 1) })).sort((a, b) => b.x - a.x)[0]
  const perMin = [5, 10, 15, 20, 25, 30, 35, 40].map(k => `${k}:${Math.round(earnedBetween(r, (k - 1) * MIN, k * MIN))}`).join(' ')
  const cum = [25, 30, 35, 38, 40, 45].map(k => `${k}:${earnedBetween(r, 0, k * MIN).toExponential(1)}`).join(" ")
  console.log(`cum ${cum}`)
  console.log(`S1 ${r.minutes.toFixed(1)}m lic=${startNewSeason(r.end).licenses} anglers=${r.end.anglers.length - 1} bench=${r.end.bench} | ${locs}\n maxGap ${m(gaps?.g ?? 0)}m ending ${m(gaps?.at ?? 0)} | maxRatio ${ratios?.x.toFixed(1)} (${ratios?.p.what}@${m(ratios?.p.t ?? 0)})\n income/min ${perMin}\n S2 ${s2.minutes.toFixed(1)}m lic=${s2.end.licenses} S3 ${s3.minutes.toFixed(1)}m S4 ${s4.minutes.toFixed(1)}m S5 ${s5.minutes.toFixed(1)}m levels ${JSON.stringify(s5.end.licenseLevels)}`)
}

describe('pacing bot', () => {
  it('first season, no licenses: bot reaches canStartSeason in 30–50 sim-minutes', () => {
    expect(season1.minutes).toBeGreaterThanOrEqual(30)
    expect(season1.minutes).toBeLessThanOrEqual(50)
  }, 60_000)

  it("second season after spending first season's licenses greedily (upgrades first) is faster than the first", () => {
    expect(nextSeason(season1, 2).minutes).toBeLessThan(season1.minutes)
  }, 60_000)

  it('no single purchase multiplies income per sim-minute by more than 10×', () => {
    const W = 2 * MIN
    const end = season1.minutes * MIN
    // Windows start after the first sale: the warm-up before it has no income to compare against.
    const firstSale = season1.earnings.find(e => e.total > 0)!.t
    for (const p of season1.purchases.filter(p => p.t - W >= firstSale && p.t + W <= end)) {
      const before = earnedBetween(season1, p.t - W, p.t)
      const after = earnedBetween(season1, p.t, p.t + W)
      expect(after / Math.max(before, 1), `${p.what} at ${(p.t / MIN).toFixed(1)} min`).toBeLessThanOrEqual(10)
    }
  }, 60_000)

  it('no gap longer than 8 sim-minutes between purchases in season 1', () => {
    const times = [0, ...season1.purchases.map(p => p.t), season1.minutes * MIN]
    for (let i = 1; i < times.length; i++) expect((times[i] - times[i - 1]) / MIN, `gap ending at ${(times[i] / MIN).toFixed(1)} min`).toBeLessThanOrEqual(8)
  }, 60_000)
})
