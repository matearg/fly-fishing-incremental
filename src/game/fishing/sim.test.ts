import { describe, it, expect } from 'vitest'
import { tick, castPlayer, reelPlayer, benchFull, castOdds } from './sim'
import { basicRecipe, newGame, type Angler, type GameState } from '../state'
import { CHUM, GUIDE, HATCH, PATTERNS, SPECIES, TIERS, TIMING } from '../data'
import { setRecipe, travel } from '../progress/economy'
import { lcg, seqRand } from '../util/testutil'
import { bountyOf } from '../progress/log'
import { comboMult } from '../progress/combo'

const r = seqRand(0.1, 0.3, 0.5)
const run = (s: GameState, ms: number) => { for (let t = 0; t < ms; t += 100) tick(s, 100, r) }
const autoAngler = () => ({ auto: true, phase: 'idle' as const, timerMs: 0, fly: null, pending: null })

describe('player', () => {
  it('broke with an empty box can still cast (never stuck)', () => {
    const s = newGame()
    expect(castPlayer(s, r)).toBe(true)
    expect(s.anglers[0].phase).toBe('waiting')
    expect(s.anglers[0].fly?.patternId).toBe(PATTERNS[0].id)
  })
  it('spam clicks while waiting do nothing', () => {
    const s = newGame()
    castPlayer(s, r)
    const before = structuredClone(s)
    expect(castPlayer(s, r)).toBe(false)
    expect(reelPlayer(s)).toBe(false)
    expect(s).toEqual(before)
  })
  it('cast → bite → reel → basket, wear down by 1', () => {
    const s = newGame()
    castPlayer(s, r)
    const wear = s.anglers[0].fly!.wearLeft
    run(s, TIMING.biteMaxMs + 100)
    expect(s.anglers[0].phase).toBe('bite')
    expect(reelPlayer(s)).toBe(true)
    expect(s.anglers[0].phase).toBe('reeling')
    run(s, TIMING.reelMs + 100)
    expect(s.basket).toHaveLength(1)
    expect(s.anglers[0].phase).toBe('idle')
    expect(s.anglers[0].fly!.wearLeft).toBe(wear - 1)
  })
  it('last wear breaks the fly', () => {
    const s = newGame()
    castPlayer(s, r)
    s.anglers[0].fly!.wearLeft = 1
    run(s, TIMING.biteMaxMs + 100)
    reelPlayer(s)
    run(s, TIMING.reelMs + 100)
    expect(s.anglers[0].fly).toBeNull()
  })
  it('player waits on a bite instead of auto-reeling', () => {
    const s = newGame()
    castPlayer(s, r)
    run(s, 30_000)
    expect(s.anglers[0].phase).toBe('bite')
    expect(s.basket).toHaveLength(0)
  })
})

describe('catch picked at cast', () => {
  const toBite = (s: GameState) => { castPlayer(s, r); run(s, TIMING.biteMaxMs + 100) }
  it('the catch is picked at cast and is what lands', () => {
    const s = newGame()
    castPlayer(s, r)
    const p = s.anglers[0].pending!
    expect(p.location).toBe(s.location)
    run(s, TIMING.biteMaxMs + 100)
    reelPlayer(s)
    run(s, TIMING.reelMs + 100)
    expect(s.basket[0]).toMatchObject({ kind: p.kind, defId: p.defId, value: p.value, size: p.size })
    expect(s.anglers[0].pending).toBeNull()
  })
  it('travel while waiting re-picks for the new place', () => {
    const s = newGame()
    s.unlockedLocations.push('river')
    castPlayer(s, r)
    travel(s, 'river')
    tick(s, 100, r)
    const p = s.anglers[0].pending!
    expect(p.location).toBe('river')
    if (p.kind === 'fish') expect(SPECIES.find(x => x.id === p.defId)!.location).toBe('river')
  })
  it('travel during a bite keeps the hooked catch', () => {
    const s = newGame()
    s.unlockedLocations.push('river')
    toBite(s)
    const p = structuredClone(s.anglers[0].pending)
    travel(s, 'river')
    run(s, 1000)
    expect(s.anglers[0].pending).toEqual(p)
  })
  // rand 0 picks the Creek's first species, Puyen, a common fish
  it('only the player fishes with the rod, and switching keeps the picked catch', () => {
    const base = (p: { defId: string; size: number }) => SPECIES.find(x => x.id === p.defId)!.baseValue * p.size
    const s = newGame(); s.rods.push('bambooCane'); s.rod = 'bambooCane'
    s.anglers.push(autoAngler())
    for (let i = 0; i < 2; i++) s.flyBox.push({ patternId: 'basicDry', materialIds: [], wearLeft: 3 })
    castPlayer(s, seqRand(0, 0.5, 0.5)); tick(s, 100, seqRand(0, 0.5, 0.5))
    const [me, helper] = [s.anglers[0].pending!, s.anglers[1].pending!]
    expect(me.value).toBeCloseTo(base(me) * 1.4)
    expect(helper.value).toBeCloseTo(base(helper))
    s.rod = 'plainRod'; tick(s, 100, seqRand(0.5))
    expect(s.anglers[0].pending!.value).toBeCloseTo(me.value)
  })
  it('helpers pick at cast too', () => {
    const s = newGame()
    s.anglers.push(autoAngler())
    s.flyBox.push({ patternId: PATTERNS[0].id, materialIds: [], wearLeft: 1 })
    tick(s, 100, r)
    expect(s.anglers[1].phase).toBe('waiting')
    expect(s.anglers[1].pending).not.toBeNull()
  })
})

describe('auto anglers', () => {
  it('idle without flies, fishes alone with one', () => {
    const s = newGame()
    s.anglers.push(autoAngler())
    run(s, 10_000)
    expect(s.anglers[1].phase).toBe('idle')
    expect(s.basket).toHaveLength(0)
    s.flyBox.push({ patternId: PATTERNS[0].id, materialIds: [], wearLeft: 1 })
    run(s, 10_000)
    expect(s.basket).toHaveLength(1)
  })
  it('a huge dt is clamped (no burst after sleep)', () => {
    const s = newGame()
    s.anglers.push(autoAngler())
    s.flyBox.push({ patternId: PATTERNS[0].id, materialIds: [], wearLeft: 99 })
    tick(s, 3_600_000, r)
    expect(s.basket.length).toBeLessThanOrEqual(1)
    expect(s.anglers[1].phase).toBe('waiting')
  })
})

describe('chum bucket', () => {
  const rareShare = (chum: boolean) => {
    const s = newGame(); s.location = 'bigRiver'; s.money = 1e9
    s.unlockedPatterns.push('woollyBugger'); s.recipe = { patternId: 'woollyBugger', materialIds: [] }
    s.chumMs = chum ? 1e9 : 0
    const rand = lcg(3); let rare = 0
    for (let i = 0; i < 500; i++) {
      castPlayer(s, rand)
      const p = s.anglers[0]
      if (p.pending!.kind === 'fish' && TIERS.indexOf(SPECIES.find(d => d.id === p.pending!.defId)!.tier) >= 2) rare++
      p.phase = 'idle'
    }
    return rare
  }
  it('chum raises the player\'s rare odds', () => {
    expect(rareShare(true)).toBeGreaterThan(2 * rareShare(false))
  })
  it('chum doesn\'t change a helper\'s rolls', () => {
    const helperBasket = (chum: boolean) => {
      const s = newGame(); s.location = 'bigRiver'; s.chumMs = chum ? 1e9 : 0
      s.anglers.push(autoAngler())
      s.flyBox.push({ patternId: 'woollyBugger', materialIds: [], wearLeft: 99 })
      const rand = lcg(5)
      for (let t = 0; t < 120_000; t += 100) tick(s, 100, rand)
      return s.basket.map(c => c.defId)
    }
    const on = helperBasket(true)
    expect(on.length).toBeGreaterThan(10)
    expect(on).toEqual(helperBasket(false))
  })
  it('chum runs out after 60 s of ticks', () => {
    const s = newGame(); s.chumMs = CHUM.ms
    for (let t = 0; t < CHUM.ms; t += 250) tick(s, 250, () => 0.5)
    expect(s.chumMs).toBe(0)
  })
})

describe('hatch', () => {
  const nymph = () => ({ patternId: 'pheasantTail', materialIds: [], wearLeft: 4 })
  const elk = () => ({ patternId: 'elkHair', materialIds: [], wearLeft: 5 })
  // The player waiting on a nymph during a hatch, recipe still the nymph.
  const waitingOnNymph = () => {
    const s = newGame(); s.money = 100; s.unlockedPatterns.push('elkHair', 'pheasantTail')
    s.recipe = { patternId: 'pheasantTail', materialIds: [] }
    castPlayer(s, r); s.hatchMs = HATCH.ms
    return s
  }
  const onLine = (s: GameState) => s.flyBox.length + (s.anglers[0].fly ? 1 : 0)

  it('a hatch starts when its countdown runs out and lasts 45 s', () => {
    const s = newGame(); s.nextHatchMs = 1_000
    tick(s, 250, () => 0.5); tick(s, 250, () => 0.5); tick(s, 250, () => 0.5); tick(s, 250, () => 0.5)
    expect(s.hatchMs).toBe(HATCH.ms)
    for (let t = 0; t < HATCH.ms; t += 250) tick(s, 250, () => 0.5)
    expect(s.hatchMs).toBe(0)
    expect(s.nextHatchMs).toBe(HATCH.gapMinMs + 0.5 * (HATCH.gapMaxMs - HATCH.gapMinMs))
  })
  it('travelling ends a hatch for good; the countdown to the next one runs', () => {
    const s = newGame(); s.unlockedLocations.push('river'); s.nextHatchMs = 100
    tick(s, 100, () => 0.5); tick(s, 100, () => 0.5)
    expect(s.hatchMs).toBeGreaterThan(0)
    travel(s, 'river'); tick(s, 100, () => 0.5)
    expect(s.hatchMs).toBe(0)
    expect(s.nextHatchMs).toBeGreaterThan(HATCH.gapMinMs - 1_000)
  })
  it('hatch waits are 1.5–2 s, only for the player on a dry fly', () => {
    expect(HATCH.waitMaxMs).toBeGreaterThan(TIMING.biteMinMs)
    const hi = () => 0.999
    const dry = newGame(); dry.hatchMs = HATCH.ms
    castPlayer(dry, hi)
    expect(dry.anglers[0].timerMs).toBeCloseTo(TIMING.biteMinMs + 0.999 * (HATCH.waitMaxMs - TIMING.biteMinMs))
    const wet = newGame(); wet.hatchMs = HATCH.ms; wet.money = 100; wet.unlockedPatterns.push('pheasantTail')
    wet.recipe = { patternId: 'pheasantTail', materialIds: [] }
    castPlayer(wet, hi)
    expect(wet.anglers[0].timerMs).toBeCloseTo(TIMING.biteMinMs + 0.999 * (TIMING.biteMaxMs - TIMING.biteMinMs))
    const helper = newGame(); helper.hatchMs = HATCH.ms; helper.anglers.push(autoAngler())
    helper.flyBox.push({ patternId: 'basicDry', materialIds: [], wearLeft: 3 })
    tick(helper, 100, hi)
    expect(helper.anglers[1].timerMs).toBeCloseTo(TIMING.biteMinMs + 0.999 * (TIMING.biteMaxMs - TIMING.biteMinMs))
  })
  it('switching to a dry recipe mid-hatch swaps the fly on the line and recasts', () => {
    const s = waitingOnNymph(), p = s.anglers[0], old = p.fly!
    s.flyBox.push(nymph())
    const marker = { kind: 'fish' as const, defId: 'creekChub', value: 4, size: 1, location: s.location }
    p.pending = marker
    setRecipe(s, basicRecipe()); tick(s, 100, r)
    expect(p.fly!.patternId).toBe('basicDry')
    expect(s.flyBox[0]).toBe(old)
    expect(onLine(s)).toBe(3) // two nymphs plus the newly tied dry fly
    expect(p.phase).toBe('waiting')
    expect(p.pending).not.toBe(marker)
    if (p.pending!.kind === 'fish') expect(SPECIES.find(d => d.id === p.pending!.defId)!.depth).toBe(0)
    expect(p.timerMs).toBeLessThanOrEqual(HATCH.waitMaxMs)
  })
  it('the swap prefers a dry fly already in the box', () => {
    const s = waitingOnNymph(), p = s.anglers[0], old = p.fly!, box = elk()
    s.flyBox.push(nymph(), box)
    const money = s.money
    setRecipe(s, { patternId: 'elkHair', materialIds: [] }); tick(s, 100, r)
    expect(p.fly).toBe(box)
    expect(s.flyBox.map(f => f.patternId)).toEqual(['pheasantTail', 'pheasantTail'])
    expect(s.flyBox[0]).toBe(old)
    expect(s.money).toBe(money)
  })
  it('a broke player with an empty box gets the free basic dry fly', () => {
    const s = newGame(); s.hatchMs = HATCH.ms; s.unlockedPatterns.push('elkHair')
    s.recipe = { patternId: 'elkHair', materialIds: [] }
    s.anglers[0].fly = nymph()
    expect(castPlayer(s, r)).toBe(true)
    expect(s.anglers[0].fly!.patternId).toBe('basicDry')
    expect(s.flyBox.map(f => f.patternId)).toEqual(['pheasantTail'])
    expect(s.anglers[0].timerMs).toBeLessThanOrEqual(HATCH.waitMaxMs)
  })
  it('no swap during bite or reeling; it happens before the next cast', () => {
    const s = waitingOnNymph(), p = s.anglers[0], old = p.fly!
    run(s, TIMING.biteMaxMs + 100)
    expect(p.phase).toBe('bite')
    setRecipe(s, basicRecipe()); tick(s, 100, r)
    expect(p.fly).toBe(old)
    reelPlayer(s); tick(s, 100, r)
    expect(p.phase).toBe('reeling'); expect(p.fly).toBe(old)
    run(s, TIMING.reelMs + 100)
    castPlayer(s, r)
    expect(p.fly!.patternId).toBe('basicDry')
    expect(s.flyBox).toContain(old)
  })
  it('no swap without a hatch, or with a non-dry recipe', () => {
    const s = waitingOnNymph(), old = s.anglers[0].fly!
    s.hatchMs = 0; s.nextHatchMs = 1e9
    setRecipe(s, basicRecipe()); tick(s, 100, r)
    expect(s.anglers[0].fly).toBe(old)
    const t = waitingOnNymph(), told = t.anglers[0].fly!
    tick(t, 100, r)
    expect(t.anglers[0].fly).toBe(told)
  })
})

describe('benchFull', () => {
  it('is true once the box holds one fly per angler', () => {
    const s = newGame()
    s.bench = 1
    expect(benchFull(s)).toBe(false)
    s.flyBox = [{ patternId: 'basicDry', materialIds: [], wearLeft: 3 }]
    expect(benchFull(s)).toBe(true)
  })
  it("a hired angler's legendary is mounted and still goes to the basket", () => {
    const s = newGame(); s.taxidermist = true
    s.anglers.push({ auto: true, phase: 'reeling', timerMs: 1, fly: { patternId: 'basicDry', materialIds: [], wearLeft: 3 }, pending: { kind: 'fish', defId: 'muskie', value: 2500, size: 1, location: s.location } })
    tick(s, 10, seqRand(0.5))
    expect(s.trophies).toEqual(['muskie'])
    expect(s.basket.map(c => c.defId)).toEqual(['muskie'])
  })
  it("the player's first catch of a species pays its bounty once", () => {
    const s = newGame()
    const land = () => { Object.assign(s.anglers[0], { phase: 'reeling', timerMs: 1, fly: { patternId: 'basicDry', materialIds: [], wearLeft: 3 }, pending: { kind: 'fish', defId: 'brookTrout', value: 8, size: 1, location: s.location } }); tick(s, 10, seqRand(0.5)) }
    land()
    expect([s.money, s.speciesLog]).toEqual([bountyOf('brookTrout'), ['brookTrout']])
    land()
    expect(s.money).toBe(bountyOf('brookTrout'))
  })
  it("a helper's catch never logs, pays or touches the combo", () => {
    const s = newGame()
    s.anglers.push({ auto: true, phase: 'reeling', timerMs: 1, fly: { patternId: 'basicDry', materialIds: [], wearLeft: 3 }, pending: { kind: 'fish', defId: 'brookTrout', value: 8, size: 1, location: s.location } })
    tick(s, 10, seqRand(0.5))
    expect([s.speciesLog, s.money]).toEqual([[], 0])
    expect(s.combo).toEqual({ defId: null, count: 0 })
    expect(s.basket.map(c => c.value)).toEqual([8])
  })
  const landAs = (s: GameState, pending: NonNullable<Angler['pending']>) => {
    Object.assign(s.anglers[0], { phase: 'reeling', timerMs: 1, fly: { patternId: 'basicDry', materialIds: [], wearLeft: 3 }, pending })
    tick(s, 10, seqRand(0.5))
  }
  const dace = (s: GameState) => ({ kind: 'fish' as const, defId: 'dace', value: 2, size: 1, location: s.location })
  it("the player's streak raises each fish's stored value", () => {
    const s = newGame()
    for (let i = 0; i < 3; i++) landAs(s, dace(s))
    expect(s.basket.map(c => c.value)).toEqual([2, 2 * comboMult(2), 2 * comboMult(3)])
  })
  it.each([false, true])('junk leaves the streak alone (sorter %s)', sorter => {
    const s = newGame(); s.sorter = sorter
    landAs(s, dace(s))
    landAs(s, { kind: 'junk', defId: 'can', value: 0, size: 1, location: s.location })
    landAs(s, dace(s))
    expect(s.combo.count).toBe(2)
  })
  it('castOdds gives hired anglers the Guide bonus', () => {
    const s = newGame(), helper: Angler = { auto: true, phase: 'idle', timerMs: 0, fly: null, pending: null }
    expect(castOdds(s, helper)).toBe(0)
    s.guide = true
    expect(castOdds(s, helper)).toBe(GUIDE.oddsBonus)
  })
  it('castOdds is 0 for the player even with the Guide', () => {
    const s = newGame(); s.guide = true
    expect(castOdds(s, s.anglers[0])).toBe(0)
  })
})
