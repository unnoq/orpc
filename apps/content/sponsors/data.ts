import ads from './ads'
import sponsors from './sponsors'

export interface AdSponsor {
  name: string
  /** Tagline shown under the name. */
  description: string
  /** Square icon URL (GitHub avatar works) or inline data URI. */
  logo: string
  href: string
  /** Relative appearance frequency (normalized to > 0 by the sync script). */
  weight: number
}

export function adPool(): AdSponsor[] {
  return ads
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
