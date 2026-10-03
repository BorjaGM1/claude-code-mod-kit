// Pixel art where there is no Raster (the desktop app): a frame of letters,
// one string per row, drawn as Boxes. Each row is a Box of runs, one Box per
// run of a letter, sized in whole percent of the Box you put it in, so the
// picture scales with that Box and stays a few dozen elements, not one per pixel.

import type { BoxProps, ElementConstructor } from 'claude-code'

/** Letters to colors. A letter it lacks (say '.') is see-through. */
export type Palette = Readonly<Record<string, string>>

/** A row as runs of one letter: [letter, first column, length]. */
export function runsOf(row: string): [string, number, number][] {
  const out: [string, number, number][] = []
  for (let x = 0; x < row.length; x += 1) {
    const letter = row.charAt(x)
    const last = out[out.length - 1]
    if (last !== undefined && last[0] === letter) last[2] += 1
    else out.push([letter, x, 1])
  }
  return out
}

/**
 * Cells `from` to `to` of `total`, in whole percent. A Box refuses a decimal
 * percent ("must be a number or a percentage"), so both edges are rounded:
 * a row still adds up to 100% and edges line up from row to row.
 */
export function span(from: number, to: number, total: number): string {
  return `${Math.round((to / total) * 100) - Math.round((from / total) * 100)}%`
}

/**
 * Draws `rows` (strings of palette letters, the same length) filling their
 * parent: put it in a Box sized in columns and rows, as
 * `<Box width={40} height={3}>{pixels(Box, rows, PALETTE)}</Box>`.
 * Up to 100 columns and 100 rows, so no pixel rounds down to nothing.
 */
export function pixels(Box: ElementConstructor<BoxProps>, rows: readonly string[], palette: Palette) {
  const columns = Math.max(1, ...rows.map(row => row.length))

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {rows.map((row, y) => (
        <Box key={`r${y}`} flexDirection="row" width="100%" height={span(y, y + 1, rows.length)}>
          {runsOf(row)
            // A see-through run at the row's end draws nothing: leave it out.
            .filter(([letter], i, all) => palette[letter] !== undefined || i < all.length - 1)
            .map(([letter, from, length]) => {
              const color = palette[letter]
              const width = span(from, from + length, columns)
              return color === undefined
                ? <Box key={`c${from}`} width={width} height="100%" />
                : <Box key={`c${from}`} width={width} height="100%" backgroundColor={color} />
            })}
        </Box>
      ))}
    </Box>
  )
}
