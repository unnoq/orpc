import type { AdCard } from './data'
import { adPool, withTracking } from './data'
import { mountAdRails } from './rails'

/**
 * Clone the slot's server-rendered <template> card (its markup and Tailwind
 * classes live in SponsorSlot.astro, which Blume scans) and fill it with the
 * given sponsor.
 */
function buildCard(slot: Element, sponsor: AdCard): Element | null {
  const template = slot.querySelector<HTMLTemplateElement>('template[data-sponsor-template]')
  const card = template?.content.firstElementChild?.cloneNode(true) as HTMLAnchorElement | undefined
  if (!card) {
    return null
  }

  card.href = withTracking(sponsor.href)
  const logo = card.querySelector<HTMLImageElement>('[data-sponsor-logo]')
  if (logo) {
    logo.src = sponsor.logo
  }
  const name = card.querySelector('[data-sponsor-name]')
  if (name) {
    name.textContent = sponsor.name
  }
  const desc = card.querySelector('[data-sponsor-desc]')
  if (desc) {
    desc.textContent = sponsor.description
  }
  return card
}

/**
 * Fill every server-rendered sponsor skeleton with a randomly picked sponsor.
 * Runs on each page load (the site is an MPA), so every view gets a fresh pick.
 * Each slot draws independently and uniformly, so the same ad can appear more
 * than once on a page.
 */
function fillSlots(): void {
  const slots = document.querySelectorAll<HTMLElement>('[data-sponsor-slot]')
  if (slots.length === 0) {
    return
  }

  const pool = adPool()
  if (pool.length === 0) {
    slots.forEach(slot => slot.remove())
    return
  }

  slots.forEach((slot) => {
    const sponsor = pool[Math.floor(Math.random() * pool.length)]!
    // The tint sits on the slot, not the card: the slot draws the border, and a
    // custom property only inherits downward.
    slot.style.setProperty('--orpc-ad-color', sponsor.color)
    const card = buildCard(slot, sponsor)
    slot.querySelector('[data-sponsor-body]')?.replaceWith(card ?? '')
  })
}

function fillAds(): void {
  fillSlots()
  mountAdRails()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fillAds)
}
else {
  fillAds()
}
