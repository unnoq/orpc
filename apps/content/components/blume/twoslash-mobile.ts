// Mobile twoslash popups: theme.css makes them fixed, readable-width, and
// horizontally centered; this anchors each one just below its hovered or
// tapped token (or above it when the token sits near the bottom of the
// screen). The popup's own height is never measured — the available space
// becomes its max-height and longer signatures scroll internally — so late
// reflows of the nested code signature can't push it offscreen.
//
// Placement is only ever written, never proactively cleared: a popup is
// re-placed (or reset, on desktop widths) at the moment it is revealed, so
// stale styles on a hidden popup are harmless. Clearing eagerly — on outside
// tap or on touch pointerout, which fires the moment a tap ends — made the
// still-visible popup flash at its fallback position.
const MOBILE = '(max-width: 48rem)'
const EDGE = 8
const GAP = 6
const MIN_SPACE = 160

function popupFor(target: EventTarget | null): { hover: Element, popup: HTMLElement } | null {
  const element = target instanceof Element ? target : null
  const hover = element?.closest('.twoslash-hover')
  const popup = hover?.querySelector<HTMLElement>('.twoslash-popup-container')
  return hover && popup ? { hover, popup } : null
}

function place(hover: Element, popup: HTMLElement): void {
  const rect = hover.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE
  const spaceAbove = rect.top - GAP - EDGE
  if (spaceBelow >= MIN_SPACE || spaceBelow >= spaceAbove) {
    popup.style.top = `${rect.bottom + GAP}px`
    popup.style.bottom = 'auto'
    popup.style.maxHeight = `${Math.max(spaceBelow, 80)}px`
  }
  else {
    popup.style.top = 'auto'
    popup.style.bottom = `${window.innerHeight - rect.top + GAP}px`
    popup.style.maxHeight = `${Math.max(spaceAbove, 80)}px`
  }
  popup.style.marginTop = '0'
}

function reset(popup: HTMLElement): void {
  popup.style.top = ''
  popup.style.bottom = ''
  popup.style.maxHeight = ''
  popup.style.marginTop = ''
}

function reveal(target: EventTarget | null): void {
  const found = popupFor(target)
  if (!found) {
    return
  }
  if (window.matchMedia(MOBILE).matches) {
    place(found.hover, found.popup)
  }
  else {
    // Desktop reveal: drop any placement left over from a mobile-width
    // session, so the absolute-positioned popup anchors normally.
    reset(found.popup)
  }
}

// Hover shows the popup via CSS :hover; touch taps show it via sticky
// :hover but with unreliable pointerover/pointerout sequencing, so the tap
// itself also places.
document.addEventListener('pointerover', event => reveal(event.target))
document.addEventListener('pointerdown', event => reveal(event.target))
