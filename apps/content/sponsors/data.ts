import type { AdSponsor } from './ads'
import ads, { AD_POSITIONS } from './ads'
import sponsors from './sponsors'

export type { AdPosition, AdSponsor } from './ads'
export { soldSponsors, trackedHref } from './ads'

export interface AdSlot {
  /** Fixed 1-based position a sponsor buys; empty ones quote it in the mailto. */
  position: number
  sponsor: AdSponsor | null
}

/** Every position in order, empty ones included. */
export function adSlots(): AdSlot[] {
  return AD_POSITIONS.map(position => ({ position, sponsor: ads[position] ?? null }))
}

const ADVERTISE_EMAIL = 'dinwwwh@gmail.com'

/**
 * Prefilled enquiry. Pass a position only from the grid, where cells map to
 * positions a sponsor actually buys; the inline slots rotate at random, so
 * naming the cell they happened to click would point at an unrelated slot.
 * The position goes in the body rather than only the subject so it survives
 * clients that let the sender rewrite the subject line.
 */
export function advertiseHref(position?: number): string {
  const subject = position === undefined
    ? 'Advertise on oRPC'
    : `Advertise on oRPC (sponsor slot #${position})`
  const body = [
    'Hi,',
    '',
    position === undefined
      ? 'I would like to advertise on orpc.dev.'
      : `I would like to advertise on orpc.dev in sponsor slot #${position}.`,
    '',
    'Product name: ',
    'Website: ',
    'Logo URL: ',
    'Tagline: ',
  ].join('\n')

  return `mailto:${ADVERTISE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
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
