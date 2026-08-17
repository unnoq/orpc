import type { Ad } from './data'

/**
 * The ad inventory, hand-maintained: add an entry to book a slot, remove one to
 * free it up. `slot` is the position that advertiser holds — the rails read it
 * directly, so a booking stays put no matter what is added or removed around
 * it. Every ad here also rotates through the in-article slot.
 *
 * `color` is the advertiser's brand color, taken from their logo; theme.css
 * mixes it into the page background, so one value tints the card in both light
 * and dark mode.
 */
const ads: Ad[] = [
  {
    name: 'ScreenshotOne',
    description: 'The screenshot API for developers',
    logo: 'https://github.com/screenshotone.png',
    href: 'https://screenshotone.com?ref=orpc&utm_source=orpc&utm_medium=sponsor',
    color: '#7a39ea',
    slot: 'left-1',
  },
  {
    name: 'MisskeyHQ',
    description: 'Decentralized micro blogging SNS born on Earth',
    logo: 'https://github.com/MisskeyIO.png',
    href: 'https://misskey.io?ref=orpc&utm_source=orpc&utm_medium=sponsor',
    color: '#56c6fd',
    slot: 'right-1',
  },
]

export default ads
