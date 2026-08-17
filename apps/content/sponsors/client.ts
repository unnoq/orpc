import type { AdSponsor } from './ads'
import { soldSponsors, trackedHref } from './ads'

// Imports ads.ts directly rather than data.ts so the sponsor wall's data never
// reaches this bundle. Only the inline slots rotate; the grid is static and
// carries no [data-sponsor-slot], so nothing here touches it.

/** Rewrite a server-rendered card in place. Geometry is fixed, so nothing moves. */
function apply(card: HTMLAnchorElement, sponsor: AdSponsor): void {
  card.href = trackedHref(sponsor.href)
  // The tagline truncates in the card, so it doubles as the hover tooltip.
  card.title = sponsor.description

  const logo = card.querySelector<HTMLImageElement>('[data-sponsor-logo]')
  if (logo) {
    logo.src = sponsor.logo
  }
  const name = card.querySelector('[data-sponsor-name]')
  if (name) {
    name.textContent = sponsor.name
  }
  const description = card.querySelector('[data-sponsor-desc]')
  if (description) {
    description.textContent = sponsor.description
  }

  // Mirrors AdCard.astro's inline tint; theme.css picks the mode. Cleared when
  // the incoming sponsor has none, or the outgoing one's colour would linger.
  for (const [property, value] of [
    ['--slot-bg', sponsor.background?.light],
    ['--slot-bg-dark', sponsor.background?.dark],
  ] as const) {
    if (value === undefined) {
      card.style.removeProperty(property)
    }
    else {
      card.style.setProperty(property, value)
    }
  }
}

/** `count` distinct sponsors in random order, or all of them if the pool is smaller. */
function sample(pool: AdSponsor[], count: number): AdSponsor[] {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return shuffled.slice(0, count)
}

/**
 * Give each inline slot a fresh set of sponsors. Runs on every page load (the
 * site is an MPA). Slots draw independently and without replacement, so one
 * slot never repeats a sponsor, though two slots on a page may overlap.
 */
function rotate(): void {
  const pool = soldSponsors()
  if (pool.length < 2) {
    // Nothing to vary: the server already rendered the only possible order.
    return
  }

  for (const slot of document.querySelectorAll('[data-sponsor-slot]')) {
    const cards = slot.querySelectorAll<HTMLAnchorElement>('[data-sponsor-card]')
    const picks = sample(pool, cards.length)
    cards.forEach((card, index) => {
      const sponsor = picks[index]
      if (sponsor) {
        apply(card, sponsor)
      }
    })
  }
}

// Blume injects this as a module script, so it runs after the document is
// parsed; the guard only covers a non-deferred injection.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rotate)
}
else {
  rotate()
}
