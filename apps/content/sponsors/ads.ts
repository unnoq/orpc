/**
 * Hand-maintained ad inventory, plus the helpers that shape it for rendering.
 * Unlike sponsors.ts (synced from GitHub Sponsors), the map below is edited by
 * hand: slots are sold individually, so a sponsor picks the position it wants
 * and keeps it until it lapses. Positions are fixed and 1-based; whatever is
 * left empty renders as a dimmed `+` opening a mailto that names it.
 *
 * Deliberately free of any sponsors.ts import: client.ts needs this module, and
 * the sponsor wall's data has no business in the browser bundle.
 */

export interface AdSponsor {
  name: string
  /** Tagline shown under the name; keep it to a few words, it truncates. */
  description: string
  /** Square icon URL (a GitHub avatar works) or an inline data URI. */
  logo: string
  /** Destination, tracking params and all — write `ref`/`utm_*` into it here. */
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
const inventory: Partial<Record<AdPosition, AdSponsor>> = {
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

export interface AdSlot {
  /** The position a sponsor buys. Absent inline, where cells rotate at random. */
  position?: AdPosition
  sponsor: AdSponsor | null
}

/** Every position in order, unsold ones included — what the grid renders. */
export function adSlots(): AdSlot[] {
  return AD_POSITIONS.map(position => ({ position, sponsor: inventory[position] ?? null }))
}

/** Sold sponsors in position order — the pool an inline slot draws from. */
export function soldSponsors(): AdSponsor[] {
  return AD_POSITIONS.map(position => inventory[position]).filter(sponsor => sponsor !== undefined)
}

/**
 * The cells one inline slot renders, padded with unsold ones when the pool is
 * short. client.ts reshuffles which sponsor sits where on every view.
 */
export function inlineAdSlots(count: number): AdSlot[] {
  const pool = soldSponsors()
  return Array.from({ length: count }, (_, index) => ({ sponsor: pool[index] ?? null }))
}

/**
 * Inline custom properties carrying the brand tint. The colours are per-sponsor
 * data, so there is nothing for Tailwind to scan; theme.css resolves the pair
 * against [data-theme]. Shared with client.ts so a rewritten card matches what
 * the server rendered exactly.
 */
export function tintStyle(sponsor: AdSponsor): string | undefined {
  const { background } = sponsor
  return background && `--slot-bg:${background.light};--slot-bg-dark:${background.dark}`
}

const ADVERTISE_EMAIL = 'dinwwwh@gmail.com'

/**
 * Prefilled enquiry. A position is passed only from the grid, where cells map
 * to something a sponsor can actually buy; inline cells rotate, so naming the
 * one that was clicked would point at an unrelated slot. The position goes in
 * the body rather than only the subject so it survives clients that let the
 * sender rewrite the subject line.
 */
export function advertiseHref(position?: AdPosition): string {
  const slot = position === undefined ? '' : ` (sponsor slot #${position})`
  const body = [
    'Hi,',
    '',
    `I would like to advertise on orpc.dev${position === undefined ? '' : ` in sponsor slot #${position}`}.`,
    '',
    'Product name: ',
    'Website: ',
    'Logo URL: ',
    'Tagline: ',
  ].join('\n')

  return `mailto:${ADVERTISE_EMAIL}?subject=${encodeURIComponent(`Advertise on oRPC${slot}`)}&body=${encodeURIComponent(body)}`
}
