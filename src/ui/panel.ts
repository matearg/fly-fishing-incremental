import { JUNK, LICENSE_UPGRADES, LOCATIONS, MATERIALS, PATTERNS, SEASON, SPECIES, type LicenseUpgradeId, type LocationId } from '../game/data'
import { setRecipe, sellAll, trash, travel, unlockLocation, unlockMaterial, unlockPattern } from '../game/progress/economy'
import { flyStats, tieFly } from '../game/fishing/flies'
import { formatNumber as fmt } from '../game/util/format'
import { buyHelper, helperCost, type HelperKind } from '../game/progress/helpers'
import { buyLicenseSpecies, buyLicenseUpgrade, canStartSeason, licensesForSeason, licenseUpgradeCost, startNewSeason } from '../game/progress/prestige'
import type { CatchItem, GameState } from '../game/state'

type Act = (fn: (s: GameState) => unknown) => void

const HELPER_LABELS: Record<HelperKind, string> = { angler: 'Hire angler', bench: 'Tying bench', sorter: 'Junk sorter', buyer: 'Fish buyer' }
const catchName = (c: CatchItem) => (c.kind === 'fish' ? SPECIES : JUNK).find(d => d.id === c.defId)?.name ?? c.defId
const pct = (x: number) => `${Math.round(x * 100)}%`

function btn(action: string, id: string, label: string, opts: { disabled?: boolean; pressed?: boolean; cls?: string } = {}): string {
  const pressed = opts.pressed === undefined ? '' : ` aria-pressed="${opts.pressed}"`
  return `<button data-action="${action}" data-id="${id}"${opts.disabled ? ' disabled' : ''}${pressed} class="${opts.cls ?? ''}">${label}</button>`
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

export function mountPanel(root: HTMLElement, getState: () => GameState, act: Act, setState: (s: GameState) => void): { render(): void } {
  let confirmSeason = false
  let dragging = false

  root.innerHTML = `
    <aside class="side">
      <div class="money" data-sec="money"></div>
      <section><h2>Fly</h2><div data-sec="fly"></div><div data-sec="recipe"></div></section>
      <section><h2>Shop</h2><div data-sec="shop"></div></section>
      <section><h2>Helpers</h2><div data-sec="helpers"></div></section>
      <section><h2>Places</h2><div data-sec="places"></div></section>
      <section><h2>New Season</h2><div data-sec="season"></div></section>
      <section><h2>Licenses</h2><div data-sec="licenses"></div></section>
    </aside>
    <footer class="basket">
      <div data-sec="basketHead"></div>
      <ul class="items" aria-label="Basket"></ul>
      <div class="trash" role="img" aria-label="Trash can: drop a catch here to throw it away">🗑️</div>
    </footer>`

  const sections: Record<string, (s: GameState) => string> = {
    money: s => `$${fmt(s.money)}`,
    fly: s => {
      const f = s.anglers[0].fly
      if (!f) return `<p>No fly on the line. Box: ${s.flyBox.length}</p>`
      const max = flyStats(s, f).wear
      const name = PATTERNS.find(p => p.id === f.patternId)!.name + f.materialIds.map(m => ' + ' + MATERIALS.find(x => x.id === m)!.name).join('')
      return `<p>${name}</p><div class="wear" role="meter" aria-label="Wear" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${f.wearLeft}"><span style="width:${pct(f.wearLeft / max)}"></span></div><p>Wear ${f.wearLeft}/${max} · Box: ${s.flyBox.length}</p>`
    },
    recipe: s => {
      const st = flyStats(s, s.recipe)
      return `<p class="label">Pattern</p><div class="row">${s.unlockedPatterns.map(id => btn('recipePattern', id, PATTERNS.find(p => p.id === id)!.name, { pressed: s.recipe.patternId === id })).join('')}</div>`
        + (s.unlockedMaterials.length ? `<p class="label">Materials</p><div class="row">${s.unlockedMaterials.map(id => btn('recipeMaterial', id, MATERIALS.find(m => m.id === id)!.name, { pressed: s.recipe.materialIds.includes(id) })).join('')}</div>` : '')
        + `<p class="stats">Depth ${st.maxDepth} · Wear ${st.wear} · Odds +${pct(st.oddsBonus)}${st.sizeBonus ? ` · Size +${pct(st.sizeBonus)}` : ''}</p>`
        + btn('tie', '', `Tie fly ($${fmt(st.tieCost)})`, { disabled: s.money < st.tieCost, cls: 'wide' })
    },
    shop: s => {
      const pats = PATTERNS.filter(p => !s.unlockedPatterns.includes(p.id))
        .map(p => btn('unlockPattern', p.id, `${p.name} <small>${p.cls}, depth ${p.maxDepth}, wear ${p.wear}, odds +${pct(p.oddsBonus)} · tie $${fmt(p.tieCost)}</small> <b>$${fmt(p.unlockCost)}</b>`, { disabled: s.money < p.unlockCost }))
      const mats = MATERIALS.filter(m => !s.unlockedMaterials.includes(m.id)).map(m => {
        const fx = [m.depthBonus && `depth +${m.depthBonus}`, m.wearBonus && `wear +${m.wearBonus}`, m.oddsBonus && `odds +${pct(m.oddsBonus)}`, m.sizeBonus && `size +${pct(m.sizeBonus)}`].filter(Boolean).join(', ')
        return btn('unlockMaterial', m.id, `${m.name} <small>${fx} · tie $${fmt(m.tieCost)}</small> <b>$${fmt(m.unlockCost)}</b>`, { disabled: s.money < m.unlockCost })
      })
      return [...pats, ...mats].join('') || '<p>Everything unlocked.</p>'
    },
    helpers: s => (Object.keys(HELPER_LABELS) as HelperKind[]).map(k => {
      const cost = helperCost(s, k)
      const owned = k === 'angler' ? ` (${s.anglers.length - 1})` : k === 'bench' ? ` (${s.bench})` : ''
      return cost === null ? `<p>${HELPER_LABELS[k]}: working</p>` : btn('hire', k, `${HELPER_LABELS[k]}${owned} <b>$${fmt(cost)}</b>`, { disabled: s.money < cost })
    }).join(''),
    places: s => {
      const next = LOCATIONS.find(l => !s.unlockedLocations.includes(l.id))
      return `<div class="row">${s.unlockedLocations.map(id => btn('travel', id, LOCATIONS.find(l => l.id === id)!.name, { pressed: s.location === id })).join('')}</div>`
        + (next ? btn('unlockLocation', next.id, `Unlock ${next.name} <b>$${fmt(next.unlockCost)}</b>`, { disabled: s.money < next.unlockCost, cls: 'wide' }) : '')
    },
    season: s => {
      const can = canStartSeason(s)
      return `<p>Earned this season: $${fmt(s.seasonEarnings)} / $${fmt(SEASON.minEarnings)}</p>`
        + btn('season', '', can ? (confirmSeason ? `Are you sure? Reset for +${licensesForSeason(s)} licenses` : `Start New Season (+${licensesForSeason(s)} licenses)`) : 'Not ready yet', { disabled: !can, cls: 'wide' + (confirmSeason ? ' danger' : '') })
    },
    licenses: s => `<p>Licenses: <b>${s.licenses}</b></p>`
      + LICENSE_UPGRADES.map(u => {
        const cost = licenseUpgradeCost(s, u.id)
        const lvl = `${s.licenseLevels[u.id]}/${u.costs.length}`
        return cost === null ? `<p>${u.name}: max (${lvl})</p>` : btn('licenseUpgrade', u.id, `${u.name} (${lvl}) <b>${cost}🎫</b>`, { disabled: s.licenses < cost })
      }).join('')
      + SPECIES.filter(sp => sp.licenseCost).map(sp => s.licenseSpecies.includes(sp.id)
        ? `<p>${sp.name}: in the water</p>`
        : btn('licenseSpecies', sp.id, `Release ${sp.name} at ${LOCATIONS.find(l => l.id === sp.location)!.name} <b>${sp.licenseCost}🎫</b>`, { disabled: s.licenses < sp.licenseCost! })).join(''),
    basketHead: s => {
      const total = s.basket.reduce((a, c) => a + c.value, 0)
      return btn('sell', '', `Sell all (${s.basket.length}) <b>${total < 0 ? '-' : ''}$${fmt(Math.abs(total))}</b>`, { disabled: !s.basket.length })
    },
  }

  const last: Record<string, string> = {}
  const list = root.querySelector<HTMLUListElement>('.items')!
  const chips = new Map<number, HTMLLIElement>()
  // shortcut: only the newest catches are shown; switch to grouping by species if baskets get huge.
  const MAX_CHIPS = 60

  function renderBasket(s: GameState): void {
    const shown = s.basket.slice(-MAX_CHIPS)
    const keep = new Set(shown.map(c => c.id))
    for (const [id, el] of chips) if (!keep.has(id)) { el.remove(); chips.delete(id) }
    for (const c of shown) {
      if (chips.has(c.id)) continue
      const li = document.createElement('li')
      li.className = `chip ${c.kind}`
      li.draggable = true
      li.dataset.catchId = String(c.id)
      li.innerHTML = `${catchName(c)} <b>${c.value < 0 ? '-' : ''}$${fmt(Math.abs(c.value))}</b> ${btn('trash', String(c.id), '✕', { cls: 'x' }).replace('>✕', ` aria-label="Trash ${catchName(c)}">✕`)}`
      list.append(li)
      chips.set(c.id, li)
    }
  }

  function render(): void {
    const s = getState()
    // Restore keyboard focus across re-renders.
    const focused = document.activeElement as HTMLElement | null
    const fKey = focused?.dataset.action ? `${focused.dataset.action}|${focused.dataset.id}` : null
    for (const [name, fn] of Object.entries(sections)) {
      const html = fn(s)
      if (last[name] === html) continue
      last[name] = html
      patch(root.querySelector(`[data-sec="${name}"]`)!, html)
    }
    if (!dragging) renderBasket(s)
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
      case 'season':
        if (e.detail > 1) return // a double-click must not skip the confirmation
        if (!confirmSeason) { confirmSeason = true; return render() }
        confirmSeason = false
        return setState(startNewSeason(getState()))
    }
  })

  const trashCan = root.querySelector<HTMLElement>('.trash')!
  list.addEventListener('dragstart', e => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li[data-catch-id]')
    if (!li) return
    dragging = true
    e.dataTransfer!.setData('text/plain', li.dataset.catchId!)
  })
  list.addEventListener('dragend', () => { dragging = false; trashCan.classList.remove('over'); render() })
  trashCan.addEventListener('dragover', e => { e.preventDefault(); trashCan.classList.add('over') })
  trashCan.addEventListener('dragleave', () => trashCan.classList.remove('over'))
  trashCan.addEventListener('drop', e => {
    e.preventDefault()
    trashCan.classList.remove('over')
    dragging = false
    act(s => trash(s, Number(e.dataTransfer!.getData('text/plain'))))
  })

  render()
  return { render }
}
