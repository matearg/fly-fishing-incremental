import { JUNK, LICENSE_UPGRADES, LOCATIONS, MATERIALS, PATTERNS, RODS, GUIDE, SEASON, SPECIES, TROPHY, WADERS, type LicenseUpgradeId, type LocationId } from '../game/data'
import { price, saleValue, setRecipe, sellAll, trash, trashStack, travel, unlockLocation, unlockMaterial, unlockPattern, wadersDiscount } from '../game/progress/economy'
import { buyRod, buyWaders, equipRod, wearWaders } from '../game/progress/gear'
import { chumPrice, chumReach, throwChum } from '../game/progress/powerups'
import { flyStats, tieFly } from '../game/fishing/flies'
import { benchCooldownMs, benchFull } from '../game/fishing/sim'
import { formatNumber as fmt } from '../game/util/format'
import { buyHelper, helperCost, toggleBuyerPause, type HelperKind } from '../game/progress/helpers'
import { LEGENDARY_IDS, trophyMult } from '../game/progress/trophies'
import { buyLicenseSpecies, buyLicenseUpgrade, canStartSeason, licensesForSeason, licenseUpgradeCost, startNewSeason } from '../game/progress/prestige'
import type { CatchItem, GameState } from '../game/state'
import { FLY_ICONS, HELPER_ICONS, LICENSE_ICONS, MATERIAL_ICONS, PLACE_ICONS, ROD_ICONS, UI_ICONS, WADERS_ICONS } from '../art/icons'
import { catchImg, icon } from './icons'
import { keepOpen, stackBasket, STACK_LIST_MAX, type Stack } from './basket'
import { logPlaces } from './log'
import { panelCue } from '../audio/cues'
import type { SoundId } from '../audio/sounds'

type Act = (fn: (s: GameState) => unknown) => unknown

const pct = (x: number) => `${Math.round(x * 100)}%`
const HELPER_LABELS: Record<HelperKind, string> = { angler: 'Hire angler', bench: 'Tying bench', bulkTrash: 'Bulk trash', sorter: 'Junk sorter', buyer: 'Fish buyer', release: 'Catch & Release', taxidermist: 'Taxidermist', guide: 'Guide' }
const HELPER_DESC: Record<HelperKind, string> = {
  angler: 'Fishes on its own with flies from the box',
  bench: 'Ties flies from your recipe; more benches tie faster',
  bulkTrash: 'Adds Trash all to an open stack',
  sorter: 'Throws junk away before it reaches the basket',
  buyer: 'Sells the basket every 5 s; can be paused',
  release: 'Trashed fish add to your next Sell all, up to +100%',
  taxidermist: `Mounts your first legendary of each species: +${pct(TROPHY.pctEach)} on every fish sold`,
  guide: `Your hired anglers find rarer fish: odds +${pct(GUIDE.oddsBonus)}`,
}
const patternDesc = (p: (typeof PATTERNS)[number]) => `${p.cls}, depth ${p.maxDepth}, wear ${p.wear}, odds +${pct(p.oddsBonus)} · tie $${fmt(p.tieCost)}`
const materialDesc = (m: (typeof MATERIALS)[number]) => [m.depthBonus && `depth +${m.depthBonus}`, m.wearBonus && `wear +${m.wearBonus}`, m.oddsBonus && `odds +${pct(m.oddsBonus)}`, m.sizeBonus && `size +${pct(m.sizeBonus)}`].filter(Boolean).join(', ') + ` · tie $${fmt(m.tieCost)}`
const rodDesc = (r: (typeof RODS)[number]) => r.tiers.length ? `+${pct(r.bonus)} on ${r.tiers.join(' and ')} fish` : 'No bonus'
const wadersDesc = (w: (typeof WADERS)[number]) => w.discount ? `${pct(w.discount)} off the shop` : 'No discount'
const catchName = (c: CatchItem) => (c.kind === 'fish' ? SPECIES : JUNK).find(d => d.id === c.defId)?.name ?? c.defId
const money = (n: number) => `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`
// Icon + text label for a flex button, so <small> and the price lay out beside the icon.
const lbl = (ico: string, text: string) => `${ico}<span class="txt">${text}</span>`
// Owned things are inert rows with a stamp, never a disabled button; they keep the description they had for sale.
const owned = (ico: string, label: string, stamp = 'OWNED', desc?: string) => `<div class="owned">${ico}<span>${label}${desc ? ` <small>${desc}</small>` : ''}</span><span class="stamp">${stamp}</span></div>`
const ticket = (n: number) => `${n}${icon('ui', 'license', UI_ICONS.license, 1)}`

function btn(action: string, id: string, label: string, opts: { disabled?: boolean; pressed?: boolean; expanded?: boolean; label?: string; cls?: string } = {}): string {
  const pressed = opts.pressed === undefined ? '' : ` aria-pressed="${opts.pressed}"`
  const expanded = opts.expanded === undefined ? '' : ` aria-expanded="${opts.expanded}"`
  const aria = opts.label === undefined ? '' : ` aria-label="${opts.label}"`
  return `<button data-action="${action}" data-id="${id}"${opts.disabled ? ' disabled' : ''}${pressed}${expanded}${aria} class="${opts.cls ?? ''}">${label}</button>`
}

// Update a section in place so the button under the cursor is never swapped mid-click
// (a replaced node loses the click when mousedown and mouseup land on different elements).
function patch(el: Element, html: string): void {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  morph(el, tpl.content)
}

function morph(from: ParentNode, to: ParentNode): void {
  const olds = [...from.childNodes]
  const news = [...to.childNodes]
  news.forEach((n, i) => {
    const o = olds[i]
    if (!o) return from.appendChild(n)
    const same = o.nodeName === n.nodeName && (!(o instanceof Element) || (o.getAttribute('data-action') === (n as Element).getAttribute('data-action') && o.getAttribute('data-id') === (n as Element).getAttribute('data-id')))
    if (!same) return from.replaceChild(n, o)
    if (o instanceof Element) {
      const ne = n as Element
      for (const a of [...o.attributes]) if (!ne.hasAttribute(a.name)) o.removeAttribute(a.name)
      for (const a of [...ne.attributes]) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value)
      morph(o, ne)
    } else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue
  })
  for (const o of olds.slice(news.length)) o.remove()
}

function benchBar(s: GameState): string {
  const full = benchFull(s), n = Math.min(100, Math.round(100 * s.benchTimerMs / benchCooldownMs(s)))
  return `<div class="bar${full ? ' paused' : ''}" role="progressbar" aria-label="Bench" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}"><span style="width:${n}%"></span></div><p class="label">${full ? 'Box full' : 'Tying…'}</p>`
}

export function mountPanel(root: HTMLElement, getState: () => GameState, act: Act, setState: (s: GameState) => void, play: (id: SoundId) => void): { render(): void } {
  let confirmSeason = false
  let stacks: Stack[] = []
  let openStack: string | null = null // key of the one tile whose catches are listed
  let logOpen = false

  root.innerHTML = `
    <aside class="side">
      <div class="money" data-sec="money"></div>
      <section><h2>${icon('ui', 'fly', UI_ICONS.fly, 1)}Fly</h2><div data-sec="fly"></div><div data-sec="recipe"></div></section>
      <section><h2>${icon('ui', 'basket', UI_ICONS.basket, 1)}Power-ups</h2><div data-sec="powerups"></div></section>
      <section><h2>${icon('ui', 'fly', UI_ICONS.fly, 1)}Shop</h2><div data-sec="shop"></div></section>
      <section><h2>${icon('ui', 'fly', UI_ICONS.fly, 1)}Gear</h2><div data-sec="gear"></div></section>
      <section><h2>${icon('helper', 'angler', HELPER_ICONS.angler, 1)}Helpers</h2><div data-sec="helpers"></div></section>
      <section><h2>${icon('place', 'creek', PLACE_ICONS.creek, 1)}Places</h2><div data-sec="places"></div></section>
      <section><h2>${icon('ui', 'season', UI_ICONS.season, 1)}New Season</h2><div data-sec="season"></div></section>
      <section><h2>${icon('ui', 'license', UI_ICONS.license, 1)}Licenses</h2><div data-sec="licenses"></div></section>
      <section><h2>${icon('ui', 'license', UI_ICONS.license, 1)}Species log</h2><div data-sec="log"></div></section>
    </aside>
    <footer class="basket">
      <div data-sec="basketHead"></div>
      <ul class="items" aria-label="Basket" data-sec="basket"></ul>
      <div class="stack-list" data-sec="stackList"></div>
    </footer>`

  const sections: Record<string, (s: GameState) => string> = {
    money: s => `${icon('ui', 'coin', UI_ICONS.coin)}$${fmt(s.money)}`,
    fly: s => {
      const f = s.anglers[0].fly
      if (!f) return `<p>No fly on the line. Box: ${s.flyBox.length}</p>`
      const max = flyStats(s, f).wear
      const name = PATTERNS.find(p => p.id === f.patternId)!.name + f.materialIds.map(m => ' + ' + MATERIALS.find(x => x.id === m)!.name).join('')
      return `<p class="row">${icon('fly', f.patternId, FLY_ICONS[f.patternId])}<span class="txt">${name}</span></p><div class="bar" role="meter" aria-label="Wear" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${f.wearLeft}"><span style="width:${pct(f.wearLeft / max)}"></span></div><p>Wear ${f.wearLeft}/${max} · Box: ${s.flyBox.length}</p>`
    },
    recipe: s => {
      const st = flyStats(s, s.recipe)
      return `<p class="label">Pattern</p><div class="row">${s.unlockedPatterns.map(id => btn('recipePattern', id, lbl(icon('fly', id, FLY_ICONS[id], 1), PATTERNS.find(p => p.id === id)!.name), { pressed: s.recipe.patternId === id })).join('')}</div>`
        + (s.unlockedMaterials.length ? `<p class="label">Materials</p><div class="row">${s.unlockedMaterials.map(id => btn('recipeMaterial', id, lbl(icon('mat', id, MATERIAL_ICONS[id], 1), MATERIALS.find(m => m.id === id)!.name), { pressed: s.recipe.materialIds.includes(id) })).join('')}</div>` : '')
        + `<p class="stats">Depth ${st.maxDepth} · Wear ${st.wear} · Odds +${pct(st.oddsBonus)}${st.sizeBonus ? ` · Size +${pct(st.sizeBonus)}` : ''}</p>`
        + btn('tie', '', `Tie fly ($${fmt(st.tieCost)})`, { disabled: s.money < st.tieCost, cls: 'wide' })
        + (s.bench > 0 ? benchBar(s) : '')
    },
    powerups: s => {
      const cost = chumPrice(s), reach = chumReach(s)
      // The reason goes under the description: the price slot doesn't wrap.
      const why = s.chumMs > 0 || reach ? '' : '<small>No rare fish within reach of your fly</small>'
      const right = s.chumMs > 0 ? `${Math.ceil(s.chumMs / 1000)} s left` : `$${fmt(cost)}`
      return btn('throwChum', '', `${lbl(icon('ui', 'basket', UI_ICONS.basket), `Chum bucket <small>Rare and legendary fish bite more for 60 s</small>${why}`)}<b>${right}</b>`, { disabled: s.chumMs > 0 || !reach || s.money < cost })
        + (s.hatchMs > 0 ? `<p>Hatch! Dry flies bite faster: ${Math.ceil(s.hatchMs / 1000)} s</p>` : '')
    },
    shop: s => {
      const pats = PATTERNS.map(p => s.unlockedPatterns.includes(p.id) ? owned(icon('fly', p.id, FLY_ICONS[p.id]), p.name, undefined, patternDesc(p)) : btn('unlockPattern', p.id, `${lbl(icon('fly', p.id, FLY_ICONS[p.id]), `${p.name} <small>${patternDesc(p)}</small>`)}<b>$${fmt(price(s, p.unlockCost))}</b>`, { disabled: s.money < price(s, p.unlockCost) }))
      const mats = MATERIALS.map(m => s.unlockedMaterials.includes(m.id) ? owned(icon('mat', m.id, MATERIAL_ICONS[m.id]), m.name, undefined, materialDesc(m)) : btn('unlockMaterial', m.id, `${lbl(icon('mat', m.id, MATERIAL_ICONS[m.id]), `${m.name} <small>${materialDesc(m)}</small>`)}<b>$${fmt(price(s, m.unlockCost))}</b>`, { disabled: s.money < price(s, m.unlockCost) }))
      return [...pats, ...mats].join('')
    },
    gear: s => {
      // Owned gear toggles which one is in use; the rest is for sale.
      const item = (def: { id: string; name: string; cost: number }, ico: string, desc: string, own: boolean, active: boolean, use: string, buy: string, inUse: string) => {
        const text = lbl(ico, `${def.name} <small>${desc}</small>`), cost = price(s, def.cost)
        return own ? btn(use, def.id, `${text}<b>${active ? inUse : 'OWNED'}</b>`, { pressed: active })
          : btn(buy, def.id, `${text}<b>$${fmt(cost)}</b>`, { disabled: s.money < cost })
      }
      return '<p class="label">Rods</p>' + RODS.map(r => item(r, icon('rod', r.id, ROD_ICONS[r.id]), rodDesc(r), s.rods.includes(r.id), s.rod === r.id, 'equipRod', 'buyRod', 'FISHING')).join('')
        + '<p class="label">Waders</p>' + WADERS.map(w => item(w, icon('waders', w.id, WADERS_ICONS[w.id]), wadersDesc(w), s.waders.includes(w.id), s.wearing === w.id, 'wearWaders', 'buyWaders', 'WEARING')).join('')
        + `<p class="stats">Discount now: ${pct(wadersDiscount(s))}</p>`
    },
    helpers: s => (Object.keys(HELPER_LABELS) as HelperKind[]).map(k => {
      const cost = helperCost(s, k)
      const count = k === 'angler' ? ` (${s.anglers.length - 1})` : k === 'bench' ? ` (${s.bench})` : ''
      const desc = k === 'taxidermist' && s.taxidermist ? `${HELPER_DESC[k]} · Trophies: ${s.trophies.length} of ${LEGENDARY_IDS.length}` : HELPER_DESC[k]
      return cost === null ? owned(icon('helper', k, HELPER_ICONS[k]), HELPER_LABELS[k], undefined, desc) : btn('hire', k, `${lbl(icon('helper', k, HELPER_ICONS[k]), `${HELPER_LABELS[k]}${count} <small>${HELPER_DESC[k]}</small>`)}<b>$${fmt(cost)}</b>`, { disabled: s.money < cost })
    }).join(''),
    places: s => {
      const next = LOCATIONS.find(l => !s.unlockedLocations.includes(l.id))
      return `<div class="row">${s.unlockedLocations.map(id => btn('travel', id, lbl(icon('place', id, PLACE_ICONS[id], 1), LOCATIONS.find(l => l.id === id)!.name), { pressed: s.location === id })).join('')}</div>`
        + (next ? btn('unlockLocation', next.id, `${lbl(icon('place', next.id, PLACE_ICONS[next.id]), `Unlock ${next.name}`)}<b>$${fmt(price(s, next.unlockCost))}</b>`, { disabled: s.money < price(s, next.unlockCost), cls: 'wide' }) : '')
    },
    season: s => {
      const can = canStartSeason(s)
      return `<p>Earned this season: $${fmt(s.seasonEarnings)} / $${fmt(SEASON.minEarnings)}</p>`
        + btn('season', '', can ? (confirmSeason ? `Are you sure? Reset for +${licensesForSeason(s)} licenses` : `Start New Season (+${licensesForSeason(s)} licenses)`) : 'Not ready yet', { disabled: !can, cls: 'wide' + (confirmSeason ? ' danger' : '') })
    },
    licenses: s => `<p>Licenses: <b>${ticket(s.licenses)}</b></p>`
      + LICENSE_UPGRADES.map(u => {
        const cost = licenseUpgradeCost(s, u.id)
        const lvl = `${s.licenseLevels[u.id]}/${u.costs.length}`
        return cost === null ? owned(icon('license', u.id, LICENSE_ICONS[u.id]), u.name, `MAX ${lvl}`) : btn('licenseUpgrade', u.id, `${lbl(icon('license', u.id, LICENSE_ICONS[u.id]), `${u.name} (${lvl})`)}<b>${ticket(cost)}</b>`, { disabled: s.licenses < cost })
      }).join('')
      + SPECIES.filter(sp => sp.licenseCost).map(sp => s.licenseSpecies.includes(sp.id)
        ? owned(catchImg('fish', sp.id), sp.name, 'IN THE WATER', `Release ${sp.name} at ${LOCATIONS.find(l => l.id === sp.location)!.name}`)
        : btn('licenseSpecies', sp.id, `${lbl(catchImg('fish', sp.id), `Release ${sp.name} at ${LOCATIONS.find(l => l.id === sp.location)!.name}`)}<b>${ticket(sp.licenseCost!)}</b>`, { disabled: s.licenses < sp.licenseCost! })).join(''),
    log: s => btn('toggleLog', '', `Caught ${s.speciesLog.length} of ${SPECIES.length}`, { expanded: logOpen, cls: 'wide' })
      + (logOpen ? logPlaces(s).map(p => `<p class="label">${p.name.toUpperCase()} ${p.logged}/${p.total}${p.locked ? ' · locked' : ''}</p>`
        + p.rows.map(r => `<div class="row-catch">${r.logged ? `${catchImg('fish', r.id)}<span>${SPECIES.find(d => d.id === r.id)!.name}</span>` : `<span>???${r.legendary ? ' (Taxidermist)' : ''}</span>`}</div>`).join('')).join('') : ''),
    basketHead: s => {
      const bonus = (s.releaseBonus > 0 ? ` +${pct(s.releaseBonus)}` : '') + (s.trophies.length ? ` Trophies +${pct(trophyMult(s) - 1)}` : '')
      return btn('sell', '', `Sell all (${s.basket.length}) <b>${money(saleValue(s, true))}</b>${bonus}`, { disabled: !s.basket.length })
        + (s.buyer ? btn('pauseBuyer', '', lbl(icon('helper', 'buyer', HELPER_ICONS.buyer, 1), 'Pause buyer'), { pressed: s.buyerPaused, label: 'Pause fish buyer' }) : '')
    },
    // A closed tile can't be thrown away whole, so one slip never loses a stack.
    basket: () => stacks.map(st => `<li>${btn('toggleStack', st.key, `${catchImg(st.kind, st.defId)}${catchName(st.items[0])} <span class="ct">×${st.count} · ${money(st.total)}</span>`, { expanded: st.key === openStack })}</li>`).join(''),
    stackList: s => {
      const st = stacks.find(x => x.key === openStack)
      if (!st) return ''
      const bin = icon('ui', 'trash', UI_ICONS.trash, 1)
      return (s.bulkTrash ? btn('trashStack', st.key, `${bin}Trash all ${catchName(st.items[0])} (×${st.count})`, { cls: 'wide' }) : '')
        + st.items.slice(0, STACK_LIST_MAX).map(c => `<div class="row-catch"><span>${catchName(c)}</span> <b>${money(c.value)}</b> ${btn('trash', String(c.id), bin, { cls: 'x', label: `Trash ${catchName(c)}` })}</div>`).join('')
        + (st.count > STACK_LIST_MAX ? `<p class="label">+${st.count - STACK_LIST_MAX} more</p>` : '')
    },
  }

  const last: Record<string, string> = {}
  function render(): void {
    const s = getState()
    stacks = stackBasket(s.basket)
    openStack = keepOpen(stacks, openStack)
    // Restore keyboard focus across re-renders.
    const focused = document.activeElement as HTMLElement | null
    const fKey = focused?.dataset.action ? `${focused.dataset.action}|${focused.dataset.id}` : null
    for (const [name, fn] of Object.entries(sections)) {
      const html = fn(s)
      if (last[name] === html) continue
      last[name] = html
      patch(root.querySelector(`[data-sec="${name}"]`)!, html)
    }
    if (fKey && !root.contains(focused)) {
      const [a, id] = fKey.split('|')
      root.querySelector<HTMLElement>(`[data-action="${a}"][data-id="${id}"]`)?.focus()
    }
  }

  // Runs a button's action and returns what it returned (a purchase's success, a sale's money), which picks its sound.
  function run(a: string, id: string): unknown {
    switch (a) {
      case 'tie': return act(s => tieFly(s))
      case 'throwChum': return act(s => throwChum(s))
      case 'recipePattern': return act(s => setRecipe(s, { ...s.recipe, patternId: id }))
      case 'recipeMaterial': return act(s => setRecipe(s, { ...s.recipe, materialIds: s.recipe.materialIds.includes(id) ? s.recipe.materialIds.filter(m => m !== id) : [...s.recipe.materialIds, id] }))
      case 'unlockPattern': return act(s => unlockPattern(s, id))
      case 'unlockMaterial': return act(s => unlockMaterial(s, id))
      case 'hire': return act(s => buyHelper(s, id as HelperKind))
      case 'buyRod': return act(s => buyRod(s, id))
      case 'equipRod': return act(s => equipRod(s, id))
      case 'buyWaders': return act(s => buyWaders(s, id))
      case 'wearWaders': return act(s => wearWaders(s, id))
      case 'unlockLocation': return act(s => unlockLocation(s, id as LocationId))
      case 'travel': return act(s => travel(s, id as LocationId))
      case 'licenseUpgrade': return act(s => buyLicenseUpgrade(s, id as LicenseUpgradeId))
      case 'licenseSpecies': return act(s => buyLicenseSpecies(s, id))
      case 'sell': return act(s => sellAll(s, true))
      case 'pauseBuyer': return act(s => toggleBuyerPause(s))
      case 'trash': return act(s => trash(s, Number(id)))
      case 'trashStack': { const st = stacks.find(x => x.key === id); return st && act(s => trashStack(s, st.kind, st.defId)) }
      case 'toggleStack': openStack = openStack === id ? null : id; return render()
      case 'toggleLog': logOpen = !logOpen; return render()
    }
  }

  root.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
    if (!b || b.disabled) return
    const id = b.dataset.id!
    const a = b.dataset.action!
    if (a === 'season') {
      if (e.detail > 1) return // a double-click must not skip the confirmation
      if (!confirmSeason) { confirmSeason = true; play('select'); return render() }
      confirmSeason = false
      play('season')
      return setState(startNewSeason(getState()))
    }
    confirmSeason = false
    play(panelCue(a, run(a, id)))
  })
  // Disabled buttons fire no click; a press on one (can't afford it) gets the "nope" buzz.
  root.addEventListener('pointerdown', e => {
    if ((e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')?.disabled) play('nope')
  })

  render()
  return { render }
}
