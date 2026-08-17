/**
 * Hand-maintained ad inventory. Unlike sponsors.ts (synced from GitHub
 * Sponsors), this file is edited by hand: slots are sold individually, so a
 * sponsor picks the position it wants and keeps it until it lapses.
 *
 * Positions are fixed and 1-based. Whatever is left empty renders as a
 * dimmed "+ Advertise here" cell linking to a prefilled mailto that names
 * the position, so an interested buyer asks for a slot that is actually free.
 */

export interface AdSponsor {
  name: string
  /** Tagline shown under the name; keep it to a few words, it truncates. */
  description: string
  /** Square icon URL (a GitHub avatar works) or an inline data URI. */
  logo: string
  href: string
  /**
   * Optional brand tint behind the card. Both modes are required together so a
   * sponsor never ships a colour that only works in one theme. Aim for the
   * lightness of Blume's muted surface (#f6f6f7 light, #2f343e dark) carrying
   * a hint of the brand hue — roughly the brand mixed 6% into the page in
   * light mode and 10% in dark — so the card reads as a surface rather than a
   * banner and --blume-muted-foreground still clears AA on top. Omit for none.
   */
  background?: { light: string, dark: string }
}

/** The grid is a fixed 8 cells; positions outside this range are a type error. */
export const AD_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export type AdPosition = typeof AD_POSITIONS[number]

// Annotated rather than `satisfies` so the type stays indexable by any
// AdPosition — an out-of-range or misspelled key is still a type error.
const slots: Partial<Record<AdPosition, AdSponsor>> = {
  1: {
    name: 'ScreenshotOne',
    description: 'The screenshot API for developers',
    logo: 'https://github.com/screenshotone.png',
    href: 'https://screenshotone.com?ref=orpc&utm_source=orpc&utm_medium=sponsor',
    background: { light: '#f7f5ff', dark: '#303147' },
  },
  2: {
    name: 'MisskeyHQ',
    description: 'Decentralized microblogging SNS born on Earth',
    logo: 'https://github.com/MisskeyIO.png',
    href: 'https://misskey.io?ref=orpc&utm_source=orpc&utm_medium=sponsor',
    background: { light: '#f8faf0', dark: '#313a2e' },
  },
}

export default slots

/** Sold sponsors in position order — the pool the inline slots draw from. */
export function soldSponsors(): AdSponsor[] {
  return AD_POSITIONS.map(position => slots[position]).filter(sponsor => sponsor !== undefined)
}

/**
 * Sponsor link carrying the `ref=orpc` param. Applied at render rather than
 * stored above so a hand-written entry cannot forget it.
 */
export function trackedHref(href: string): string {
  if (!href.startsWith('http') || href.includes('ref=')) {
    return href
  }
  return `${href}${href.includes('?') ? '&' : '?'}ref=orpc`
}
