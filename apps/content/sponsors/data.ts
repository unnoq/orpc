import ads from './ads'
import sponsors from './sponsors'

/** Ad slots in one side rail; the two rails are the whole inventory. */
export const RAIL_SLOTS_PER_SIDE = 5
export const AD_SLOT_COUNT = RAIL_SLOTS_PER_SIDE * 2

export type RailSide = 'left' | 'right'

/**
 * A rail position, e.g. `left-3`. Spelled as a union so a typo in `ads.ts` is a
 * type error rather than an ad that silently never renders.
 */
export type SlotId = `${RailSide}-${1 | 2 | 3 | 4 | 5}`

/** Everything a card renders, whether it is sold or is selling the slot itself. */
export interface AdCard {
  name: string
  /** Tagline shown under the name. */
  description: string
  /** Square icon URL (GitHub avatar works) or inline data URI. */
  logo: string
  href: string
  /**
   * The advertiser's brand color, which tints the card. `.orpc-ad-card` in
   * theme.css mixes it into the page background rather than painting it flat,
   * so a single value stays readable in both light and dark mode. Any CSS
   * color works, including a `var(--blume-*)` token.
   */
  color: string
}

/** An ad exactly as authored in `ads.ts`: a card plus the slot it holds. */
export interface Ad extends AdCard {
  /** The rail position this ad occupies, independent of its order in the file. */
  slot: SlotId
}

/** Adds the `ref=orpc` tracking param to an ad's link. */
export function withTracking(href: string): string {
  // mailto: links take no tracking param; authored hrefs may carry their own.
  if (!href.startsWith('http') || href.includes('ref=')) {
    return href
  }

  return `${href}${href.includes('?') ? '&' : '?'}ref=orpc`
}

export interface AdSlot {
  /** The position an ad claims with `slot`, e.g. `left-3`. */
  id: SlotId
  /** Position label, e.g. `Left rail #3`; quoted back in the mailto body. */
  place: string
  /** The booked ad, or `null` while the slot is still for sale. */
  ad: Ad | null
}

/**
 * One rail's slots, top to bottom, each holding whichever ad claims it in
 * `ads.ts`. Should two ads claim the same slot, the first one in the file keeps
 * it; the other still rotates through the in-article slot.
 */
export function railSlots(side: RailSide): AdSlot[] {
  return Array.from({ length: RAIL_SLOTS_PER_SIDE }, (_, index) => {
    const id = `${side}-${index + 1}` as SlotId

    return {
      id,
      place: `${side === 'left' ? 'Left' : 'Right'} rail #${index + 1}`,
      ad: ads.find(ad => ad.slot === id) ?? null,
    }
  })
}

/** Rail slots still for sale, across both rails. */
export function openSlotCount(): number {
  return AD_SLOT_COUNT - new Set(ads.map(ad => ad.slot)).size
}

const AD_CONTACT_EMAIL = 'dinwwwh@gmail.com'

/**
 * A pre-filled `mailto:` for one slot, carrying the slot's own label so the
 * reply says which position on the page it is about.
 */
export function advertiseHref(place: string): string {
  const body = [
    'Hi,',
    '',
    'I would like to book the ad slot below on orpc.dev.',
    '',
    `Slot: ${place}`,
    'Product name: ',
    'Website: ',
    'Logo URL: ',
  ].join('\n')

  return `mailto:${AD_CONTACT_EMAIL}?subject=${encodeURIComponent(`oRPC ads — book ${place}`)}&body=${encodeURIComponent(body)}`
}

/**
 * The link a rail offers once every slot is taken: nothing left to book, so it
 * asks to be told when one frees up.
 */
export function waitlistHref(): string {
  const body = [
    'Hi,',
    '',
    'Every ad slot on orpc.dev is booked. Please let me know when one opens up.',
    '',
    'Product name: ',
    'Website: ',
    'Logo URL: ',
  ].join('\n')

  return `mailto:${AD_CONTACT_EMAIL}?subject=${encodeURIComponent('oRPC ads — waitlist')}&body=${encodeURIComponent(body)}`
}

/** Where the in-article slot sits, as named in its mailto body. */
export const IN_ARTICLE_PLACE = 'In-article slot'

/** Megaphone glyph for the "advertise here" card, in the muted foreground gray. */
const ADVERTISE_LOGO = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238b8b8b%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m3 11 18-5v12L3 14v-3z%22/%3E%3Cpath d=%22M11.6 16.8a3 3 0 1 1-5.8-1.6%22/%3E%3C/svg%3E'

/**
 * What the in-article slot draws from, each entry equally likely. While the
 * rails still have slots for sale, an "advertise here" card joins the rotation,
 * so the inventory sells itself on the pages a reader is already scrolling.
 */
export function adPool(): AdCard[] {
  const pool: AdCard[] = [...ads]

  if (openSlotCount() > 0) {
    pool.push({
      name: 'Your product here',
      description: 'Advertise on oRPC, book an open slot',
      logo: ADVERTISE_LOGO,
      href: advertiseHref(IN_ARTICLE_PLACE),
      // Neutral gray: the card for an unsold slot has no brand to borrow.
      color: 'var(--blume-muted-foreground)',
    })
  }

  return pool
}

export interface Sponsor {
  /** Display name, already falling back to the GitHub login when unset. */
  name: string
  login: string
  avatar: string
  /** Sponsor's own link, carrying the `ref=orpc` tracking param. */
  link: string
  /** GitHub Sponsors tier label, e.g. `🏆 Platinum Sponsor`. */
  tierTitle: string
  /** Higher is a bigger tier; `0` marks a lapsed sponsor. */
  tierLevel: number
  org: boolean
}

export interface SponsorTier {
  title: string
  level: number
  sponsors: Sponsor[]
}

// Annotated, not cast: if the sync script ever changes the generated shape this
// has to fail type checking rather than quietly lie about it.
const allSponsors: Sponsor[] = sponsors

/**
 * Current sponsors grouped by tier, biggest tier first. The generated file is
 * already sorted, so grouping preserves that order within each tier.
 */
export function sponsorTiers(): SponsorTier[] {
  const tiers: SponsorTier[] = []

  for (const sponsor of allSponsors) {
    if (sponsor.tierLevel <= 0) {
      continue
    }

    const tier = tiers.at(-1)

    if (tier?.level === sponsor.tierLevel) {
      tier.sponsors.push(sponsor)
      continue
    }

    tiers.push({ title: sponsor.tierTitle, level: sponsor.tierLevel, sponsors: [sponsor] })
  }

  return tiers
}

/** Sponsors whose sponsorship has ended, still worth thanking. */
export function pastSponsors(): Sponsor[] {
  return allSponsors.filter(sponsor => sponsor.tierLevel <= 0)
}
