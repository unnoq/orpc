import type { Ad } from './data'
import { AD_SLOT_COUNT, advertiseHref, openSlotCount, railSlots, waitlistHref, withTracking } from './data'

/**
 * The ad rails: two columns fixed in the page's flanks, built on the client so
 * no ad markup ships in the prerendered HTML. client.ts (which blume.config.ts
 * injects into every page) mounts them, which is also why the rails need no
 * per-page wiring.
 *
 * Each rail carries its five sellable slots plus a call to action that is always
 * there — twelve cards in all. A booked slot shows its ad; an unsold one shows a
 * dimmed "Advertise here" card that brightens when the reader looks at the
 * group. Card styling lives in theme.css under `.orpc-ad-*`.
 *
 * Where a rail goes is measured rather than declared: the site has four content
 * layouts (docs with and without the contents column, blog posts, landing pages)
 * whose columns differ, and a rule per layout is a rule to get wrong the next
 * time one is added. `layOutRails` reads the article and whatever columns flank
 * it, and shows the rails only where they genuinely fit.
 */

const SIDES = ['left', 'right'] as const

/** Clear space kept on each side of a rail, from the article and from the column beyond it. */
const RAIL_GAP = 16

/** Narrower than this and a card cannot hold a logo, a name and a tagline. */
const MIN_RAIL_WIDTH = 136

/** Wide enough to read as a sidebar; past this the flank becomes breathing room. */
const MAX_RAIL_WIDTH = 192

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className

  return node
}

/** The shared card body: a 2rem mark, a name, and a tagline. */
function card(className: string, href: string, mark: Node, name: string, description: string): HTMLAnchorElement {
  const anchor = element('a', `orpc-ad-card orpc-ad-rail-card ${className}`)
  anchor.href = href

  const title = element('span', 'orpc-ad-name')
  title.textContent = name

  const tagline = element('span', 'orpc-ad-description')
  tagline.textContent = description

  anchor.append(mark, title, tagline)

  return anchor
}

/** The mark an unsold card shows where an advertiser's logo would go. */
function plusMark(): HTMLElement {
  const mark = element('span', 'orpc-ad-open-plus')
  mark.textContent = '+'
  mark.setAttribute('aria-hidden', 'true')

  return mark
}

/** A booked slot: the advertiser's card. */
function bookedCard(ad: Ad): HTMLLIElement {
  const item = document.createElement('li')

  const logo = element('img', 'orpc-ad-logo')
  logo.src = ad.logo
  logo.alt = ''
  logo.loading = 'lazy'
  logo.setAttribute('data-no-zoom', '')

  const anchor = card('', withTracking(ad.href), logo, ad.name, ad.description)
  anchor.target = '_blank'
  anchor.rel = 'sponsored noopener'
  anchor.style.setProperty('--orpc-ad-color', ad.color)

  item.append(anchor)

  return item
}

/**
 * An unsold slot, the same shape and size as a booked one — a slot is worth what
 * the card beside it is worth, so it should look like one. Opens a booking
 * message naming this exact position.
 */
function openCard(place: string): HTMLLIElement {
  const item = element('li', 'orpc-ad-open-slot')

  const anchor = card('orpc-ad-open', advertiseHref(place), plusMark(), 'Advertise here', 'Book this slot')
  anchor.title = `Advertise on oRPC — ${place}`

  item.append(anchor)

  return item
}

/**
 * The rail's twelfth-and-second card: the one that is always there. It sells an
 * open slot while any remain, and takes names for the next one once they are all
 * booked.
 */
function actionCard(openSlots: number): HTMLLIElement {
  const item = element('li', 'orpc-ad-action')

  const anchor = openSlots > 0
    ? card('orpc-ad-open', advertiseHref('Any open slot'), plusMark(), 'Advertise here', 'Book an open slot')
    : card('orpc-ad-open', waitlistHref(), plusMark(), 'Get notified', 'Tell me when a slot opens')

  anchor.title = openSlots > 0 ? 'Advertise on oRPC' : 'Get notified when an oRPC ad slot opens'

  item.append(anchor)

  return item
}

function rail(side: typeof SIDES[number], openSlots: number): HTMLElement {
  const slots = railSlots(side)
  const aside = element('aside', `orpc-ad-rail orpc-ad-rail-${side}`)
  aside.setAttribute('aria-label', `Sponsors (${side})`)

  const inner = element('div', 'orpc-ad-rail-inner')

  const label = element('p', 'orpc-ad-rail-label')
  label.textContent = 'Sponsors'
  inner.append(label)

  const list = element('ul', 'orpc-ad-list')
  list.append(...slots.map(slot => (slot.ad ? bookedCard(slot.ad) : openCard(slot.place))))

  // The one card a short viewport is allowed to drop, so the call to action
  // below still fits. Always an unsold slot: a paid ad never gets dropped, and
  // the rail scrolls instead when every slot is booked.
  const droppable = [...list.querySelectorAll('.orpc-ad-open-slot')].at(-1)
  droppable?.classList.add('orpc-ad-droppable')

  list.append(actionCard(openSlots))
  inner.append(list)

  const count = element('p', 'orpc-ad-count')
  count.textContent = openSlots > 0
    ? `${openSlots} of ${AD_SLOT_COUNT} slots open`
    : `All ${AD_SLOT_COUNT} slots booked`
  inner.append(count)

  aside.append(inner)

  return aside
}

/** The element's box, or null when it is not laid out — hidden, or parked off-canvas. */
function visibleBox(selector: string): DOMRect | null {
  const element = document.querySelector(selector)
  if (!element || getComputedStyle(element).display === 'none') {
    return null
  }

  const box = element.getBoundingClientRect()

  // The nav is a drawer below `lg`: still in the DOM, translated out of the
  // window. A box that starts off the left edge is not flanking anything.
  return box.width > 0 && box.left >= 0 ? box : null
}

interface Band {
  from: number
  to: number
}

function widest(bands: Band[]): Band {
  return bands.reduce((best, band) => (band.to - band.from > best.to - best.from ? band : best))
}

/**
 * Put each rail in the widest clear space on its side of the article, and hide
 * both when the narrower side cannot hold a card. There are two candidates per
 * side, and which one wins moves with the window: the gap between the article
 * and the column beside it (a 13-inch laptop's whole flank), or the page margin
 * outside that column (where a wide monitor's room actually is). Both rails
 * take the same width — one fat rail and one thin one just looks broken.
 */
function layOutRails(): void {
  const rails = [...document.querySelectorAll<HTMLElement>('.orpc-ad-rail')]
  // The reading column, or — on a landing page built of full-bleed sections —
  // the header's own frame, which every page centres its content against.
  const article = visibleBox('.prose') ?? visibleBox('main article') ?? visibleBox('header > div')
  const hide = (): void => {
    for (const rail of rails) {
      rail.style.display = 'none'
    }
  }

  if (rails.length === 0) {
    return
  }

  if (!article) {
    hide()
    return
  }

  const viewport = document.documentElement.clientWidth
  const nav = visibleBox('[data-blume-nav-drawer]')
  const contents = visibleBox('[data-blume-toc]')

  const sides = {
    left: widest([
      { from: 0, to: nav ? nav.left : article.left },
      { from: nav ? nav.right : 0, to: article.left },
    ]),
    right: widest([
      { from: contents ? contents.right : article.right, to: viewport },
      { from: article.right, to: contents ? contents.left : viewport },
    ]),
  }

  const flank = Math.min(sides.left.to - sides.left.from, sides.right.to - sides.right.from)
  const width = Math.min(MAX_RAIL_WIDTH, flank - 2 * RAIL_GAP)

  if (width < MIN_RAIL_WIDTH) {
    hide()
    return
  }

  for (const rail of rails) {
    const band = rail.classList.contains('orpc-ad-rail-left') ? sides.left : sides.right

    rail.style.display = 'flex'
    rail.style.width = `${width}px`
    // Centred in its band: the whitespace either side of a card is what keeps
    // it from reading as part of whatever it sits next to.
    rail.style.left = `${Math.round(band.from + (band.to - band.from - width) / 2)}px`
  }
}

/**
 * Mount both rails, then place them. Idempotent, and cheap on the viewports that
 * never show them: the rails start hidden, and a lazy image inside a hidden
 * element is never fetched.
 */
export function mountAdRails(): void {
  if (document.querySelector('.orpc-ad-rail')) {
    return
  }

  const openSlots = openSlotCount()
  const fragment = document.createDocumentFragment()

  for (const side of SIDES) {
    fragment.append(rail(side, openSlots))
  }

  document.body.append(fragment)
  layOutRails()

  // The flanks change with the window, and with the columns the window brings
  // in and out. One measurement per frame, at most.
  let pending = 0
  window.addEventListener('resize', () => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(layOutRails)
  })
}
