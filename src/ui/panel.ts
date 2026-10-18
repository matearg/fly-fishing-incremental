import { JUNK, LICENSE_UPGRADES, LOCATIONS, MATERIALS, PATTERNS, SEASON, SPECIES, type LicenseUpgradeId, type LocationId } from '../game/data'
import { setRecipe, sellAll, trash, trashStack, travel, unlockLocation, unlockMaterial, unlockPattern } from '../game/progress/economy'
import { flyStats, tieFly } from '../game/fishing/flies'
import { benchCooldownMs, benchFull } from '../game/fishing/sim'
import { formatNumber as fmt } from '../game/util/format'
import { buyHelper, helperCost, type HelperKind } from '../game/progress/helpers'
import { buyLicenseSpecies, buyLicenseUpgrade, canStartSeason, licensesForSeason, licenseUpgradeCost, startNewSeason } from '../game/progress/prestige'
import type { CatchItem, GameState } from '../game/state'
import { FLY_ICONS, HELPER_ICONS, LICENSE_ICONS, MATERIAL_ICONS, PLACE_ICONS, UI_ICONS } from '../art/icons'
import { catchImg, icon } from './icons'
import { keepOpen, stackBasket, STACK_LIST_MAX, type Stack } from './basket'

type Act = (fn: (s: GameState) => unknown) => void

const HELPER_LABELS: Record<HelperKind, string> = { angler: 'Hire angler', bench: 'Tying bench', bulkTrash: 'Bulk trash', sorter: 'Junk sorter', buyer: 'Fish buyer' }
const catchName = (c: CatchItem) => (c.kind === 'fish' ? SPECIES : JUNK).find(d => d.id === c.defId)?.name ?? c.defId
const money = (n: number) => `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`
const pct = (x: number) => `${Math.round(x * 100)}%`
// Icon + text label for a flex button, so <small> and the price lay out beside the icon.
const lbl = (ico: string, text: string) => `${ico}<span class="txt">${text}</span>`
// Owned things are inert rows with a stamp, never a disabled button.
const owned = (ico: string, label: string, stamp = 'OWNED') => `<div class="owned">${ico}<span>${label}</span><span class="stamp">${stamp}</span></div>`
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

export function mountPanel(root: HTMLElement, getState: () => GameState, act: Act, setState: (s: GameState) => void): { render(): void } {
  let confirmSeason = false
  let stacks: Stack[] = []
  let openStack: string | null = null // key of the one tile whose catches are listed

  root.innerHTML = `
    <aside class="side">
      <div class="money" data-sec="money"></div>
      <section><h2>${icon('ui', 'fly', UI_ICONS.fly, 1)}Fly</h2><div data-sec="fly"></div><div data-sec="recipe"></div></section>
      <section><h2>${icon('ui', 'fly', UI_ICONS.fly, 1)}Shop</h2><div data-sec="shop"></div></section>
      <section><h2>${icon('helper', 'angler', HELPER_ICONS.angler, 1)}Helpers</h2><div data-sec="helpers"></div></section>
      <section><h2>${icon('place', 'creek', PLACE_ICONS.creek, 1)}Places</h2><div data-sec="places"></div></section>
      <section><h2>${icon('ui', 'season', UI_ICONS.season, 1)}New Season</h2><div data-sec="season"></div></section>
      <section><h2>${icon('ui', 'license', UI_ICONS.license, 1)}Licenses</h2><div data-sec="licenses"></div></section>
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
    shop: s => {
      const pats = PATTERNS.map(p => s.unlockedPatterns.includes(p.id) ? owned(icon('fly', p.id, FLY_ICONS[p.id]), p.name) : btn('unlockPattern', p.id, `${lbl(icon('fly', p.id, FLY_ICONS[p.id]), `${p.name} <small>${p.cls}, depth ${p.maxDepth}, wear ${p.wear}, odds +${pct(p.oddsBonus)} · tie $${fmt(p.tieCost)}</small>`)}<b>$${fmt(p.unlockCost)}</b>`, { disabled: s.money < p.unlockCost }))
      const mats = MATERIALS.map(m => {
        if (s.unlockedMaterials.includes(m.id)) return owned(icon('mat', m.id, MATERIAL_ICONS[m.id]), m.name)
        const fx = [m.depthBonus && `depth +${m.depthBonus}`, m.wearBonus && `wear +${m.wearBonus}`, m.oddsBonus && `odds +${pct(m.oddsBonus)}`, m.sizeBonus && `size +${pct(m.sizeBonus)}`].filter(Boolean).join(', ')
        return btn('unlockMaterial', m.id, `${lbl(icon('mat', m.id, MATERIAL_ICONS[m.id]), `${m.name} <small>${fx} · tie $${fmt(m.tieCost)}</small>`)}<b>$${fmt(m.unlockCost)}</b>`, { disabled: s.money < m.unlockCost })
      })
      return [...pats, ...mats].join('')
    },
    helpers: s => (Object.keys(HELPER_LABELS) as HelperKind[]).map(k => {
      const cost = helperCost(s, k)
      const count = k === 'angler' ? ` (${s.anglers.length - 1})` : k === 'bench' ? ` (${s.bench})` : ''
      return cost === null ? owned(icon('helper', k, HELPER_ICONS[k]), HELPER_LABELS[k]) : btn('hire', k, `${lbl(icon('helper', k, HELPER_ICONS[k]), HELPER_LABELS[k] + count)}<b>$${fmt(cost)}</b>`, { disabled: s.money < cost })
    }).join(''),
    places: s => {
      const next = LOCATIONS.find(l => !s.unlockedLocations.includes(l.id))
      return `<div class="row">${s.unlockedLocations.map(id => btn('travel', id, lbl(icon('place', id, PLACE_ICONS[id], 1), LOCATIONS.find(l => l.id === id)!.name), { pressed: s.location === id })).join('')}</div>`
        + (next ? btn('unlockLocation', next.id, `${lbl(icon('place', next.id, PLACE_ICONS[next.id]), `Unlock ${next.name}`)}<b>$${fmt(next.unlockCost)}</b>`, { disabled: s.money < next.unlockCost, cls: 'wide' }) : '')
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
        ? owned(catchImg('fish', sp.id), sp.name, 'IN THE WATER')
        : btn('licenseSpecies', sp.id, `${lbl(catchImg('fish', sp.id), `Release ${sp.name} at ${LOCATIONS.find(l => l.id === sp.location)!.name}`)}<b>${ticket(sp.licenseCost!)}</b>`, { disabled: s.licenses < sp.licenseCost! })).join(''),
    basketHead: s => {
      const total = s.basket.reduce((a, c) => a + c.value, 0)
      return btn('sell', '', `Sell all (${s.basket.length}) <b>${money(total)}</b>`, { disabled: !s.basket.length })
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

  root.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
    if (!b || b.disabled) return
    const id = b.dataset.id!
    const a = b.dataset.action!
    if (a !== 'season') confirmSeason = false
    switch (a) {
      case 'tie': return act(s => tieFly(s))
      case 'recipePattern': return act(s => setRecipe(s, { ...s.recipe, patternId: id }))
      case 'recipeMaterial': return act(s => setRecipe(s, { ...s.recipe, materialIds: s.recipe.materialIds.includes(id) ? s.recipe.materialIds.filter(m => m !== id) : [...s.recipe.materialIds, id] }))
      case 'unlockPattern': return act(s => unlockPattern(s, id))
      case 'unlockMaterial': return act(s => unlockMaterial(s, id))
      case 'hire': return act(s => buyHelper(s, id as HelperKind))
      case 'unlockLocation': return act(s => unlockLocation(s, id as LocationId))
      case 'travel': return act(s => travel(s, id as LocationId))
      case 'licenseUpgrade': return act(s => buyLicenseUpgrade(s, id as LicenseUpgradeId))
      case 'licenseSpecies': return act(s => buyLicenseSpecies(s, id))
      case 'sell': return act(s => sellAll(s))
      case 'trash': return act(s => trash(s, Number(id)))
      case 'trashStack': { const st = stacks.find(x => x.key === id); return st && act(s => trashStack(s, st.kind, st.defId)) }
      case 'toggleStack': openStack = openStack === id ? null : id; return render()
      case 'season':
        if (e.detail > 1) return // a double-click must not skip the confirmation
        if (!confirmSeason) { confirmSeason = true; return render() }
        confirmSeason = false
        return setState(startNewSeason(getState()))
    }
  })

  render()
  return { render }
}
