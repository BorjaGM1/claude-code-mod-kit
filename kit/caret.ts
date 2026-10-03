// Where the caret sits on screen in the desktop app's prompt box, worked out
// the way the box lays text out: words wrap whole at its width, measured in
// the box's own font. Only the text and the caret's offset reach a mod
// (`prompt.edit`); this is the rest.
//
// Measured on Claude desktop 2.19675.0, macOS (system-ui is SF Pro there).
// Another OS draws another font: measure again (reference/evidence.md).

/**
 * Advance widths, in CSS px, of ' ' to '~' in the prompt box's font (14px
 * system-ui), measured in the browser engine the desktop app runs on.
 */
const WIDTHS = [
  3.79, 4.2, 6.54, 8.67, 8.67, 12.8, 9.81, 4.01, 5.2, 5.2, 6.45, 8.67, 4.01, 6.45, 4.01, 4.12,
  8.67, 6.34, 8.3, 8.63, 8.86, 8.5, 8.76, 7.82, 8.79, 8.76, 4.01, 4.01, 8.67, 8.67, 8.67, 7.03,
  12.7, 9.28, 9.05, 9.87, 10.02, 8.19, 7.86, 10.3, 10.24, 3.6, 7.38, 9.07, 7.8, 12.09, 10.24, 10.65,
  8.74, 10.65, 9, 8.77, 8.72, 10.17, 9.28, 13.4, 9.35, 9.02, 9.11, 5.2, 4.12, 5.2, 8.67, 8.02,
  6.85, 7.57, 8.45, 7.68, 8.45, 7.85, 4.92, 8.38, 8.09, 3.31, 3.3, 7.45, 3.39, 12.03, 8.02, 8.12,
  8.39, 8.38, 5.18, 7.18, 4.94, 8.02, 7.44, 10.69, 7.19, 7.45, 7.4, 5.2, 3.47, 5.2, 8.67,
] as const

/** Measured the same way: punctuation the box puts in for you, and common accented letters. */
const OTHER_WIDTHS: Readonly<Record<string, number>> = {
  '‘': 4.01, '’': 4.01, '“': 6.28, '”': 6.28, '…': 11.12, '–': 8.02, '—': 12.09, '•': 6.45, '·': 4.01,
  'é': 7.85, 'è': 7.85, 'á': 7.57, 'à': 7.57, 'í': 3.31, 'ó': 8.12, 'ú': 8.02, 'ñ': 8.02, 'ü': 8.02,
  'ö': 8.12, 'ä': 7.57, 'ç': 7.68, 'É': 8.19, '¿': 7.03, '¡': 4.2, '€': 8.67, '£': 8.67, '°': 6.45,
  '×': 8.67, '→': 12.53, '←': 12.53, '«': 9.11, '»': 9.11,
}

/**
 * The box kerns its text (letters like o and k tuck together), which measuring
 * letters one by one leaves out: whole lines measure 0.992 of their letters' sum.
 */
const KERNING = 0.992

/** How many UTF-16 units the character at `i` takes: 2 for an astral one (most emoji). */
const unitsAt = (text: string, i: number) => {
  const code = text.charCodeAt(i)
  return code >= 0xd800 && code <= 0xdbff ? 2 : 1
}

/** How wide the character at `i` draws: measured where known, else by its script. */
function widthAt(text: string, i: number): number {
  if (unitsAt(text, i) === 2) return 18
  const code = text.charCodeAt(i)
  const width = WIDTHS[code - 32] ?? OTHER_WIDTHS[text.charAt(i)]
    ?? (code >= 0xac00 && code <= 0xd7af ? 12.11 : code >= 0x3000 && code <= 0x9fff ? 13.89 : 8)
  return width * KERNING
}

/**
 * Where the caret lands on screen: its visual line, and how far into it in
 * CSS px, with lines `width` px wide wrapping whole words as the box does (a
 * word wider than a line breaks where it overflows; spaces hang at its end).
 */
export function caretAt(text: string, cursor: number, width: number): { line: number; x: number } {
  // A caret past the text (the box and the mod disagreeing) stops at its end.
  const end = Math.min(cursor, text.length)
  let line = 0
  let x = 0

  for (let i = 0; i < end;) {
    const c = text.charAt(i)

    if (c === '\n') {
      line += 1
      x = 0
      i += 1
      continue
    }

    if (c === ' ') {
      x += widthAt(text, i)
      i += 1
      continue
    }

    // A word that will not fit on this line starts the next one.
    let after = i
    let wordWidth = 0
    while (after < text.length && text.charAt(after) !== ' ' && text.charAt(after) !== '\n') {
      wordWidth += widthAt(text, after)
      after += unitsAt(text, after)
    }
    if (x > 0 && x + wordWidth > width) {
      line += 1
      x = 0
    }

    // Through the word up to the caret, breaking it where it overflows a line.
    for (const stop = Math.min(after, end); i < stop; i += unitsAt(text, i)) {
      const w = widthAt(text, i)
      if (x > 0 && x + w > width) {
        line += 1
        x = 0
      }
      x += w
    }
  }

  return { line, x }
}

/**
 * The prompt box's text width in px, from the `bodyColumns` of the band above
 * it (AbovePrompt), which is as wide as the box. Fitted on the desktop: a band
 * of 95 columns is 768px wide and one of 69 is 565px; the box's padding and
 * send button take 46px of that.
 */
export function composerTextWidth(bodyColumns: number): number {
  const pxPerColumn = (768 - 565) / (95 - 69)
  return 768 + (bodyColumns - 95) * pxPerColumn - 46
}
