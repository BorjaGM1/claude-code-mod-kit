---
name: claude-code-mod-kit
description: Field-tested kit for Claude Code mods (function-hook plugins) that draw, animate and react in the Claude desktop app - native pixel art from Boxes, clock-driven redraws, reacting to the prompt box and tracking its caret, reading the effort level, lines under replies, and testing it all. Use alongside plugin-authoring whenever a mod draws UI (the AbovePrompt band, a Pane, the Spinner, CommandOutput) or reacts to typing, and whenever a mod renders wrong on the desktop.
---

# Claude Code mod kit

Start from the plugin-authoring skill for the API, scaffolding and loading. This
kit is what it leaves out: how the desktop app actually draws and behaves,
learned building token-printer (Clawd printing tokens above the prompt box while
Claude works). Every rule was seen on Claude Code 2.1.286 in Claude desktop
2.19675.0 on macOS, October 2026. When a newer app seems to disagree,
`reference/evidence.md` says what each rule rests on and how to check it again.

## The kit

Copy what the mod needs from this skill's `kit/` folder:

| File | Goes in | Gives |
|------|---------|-------|
| `kit/pixels.tsx` | `hooks/` | `pixels(Box, rows, palette)`: pixel art as Box runs, for surfaces with no Raster |
| `kit/caret.ts` | `hooks/` | `caretAt(text, cursor, width)` and `composerTextWidth(bodyColumns)`: where the caret is in the desktop prompt box |
| `kit/world.ts` | `tests/` | `world(on)`: engine stubs for `claude-code/testing` |

## Before anything

- Function hooks sit behind a rollout switch. If `claude plugin test` says hooks
  modules are turned off, the fix is `"CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"` in
  the `env` of `~/.claude/settings.json`. It is the person's settings file: ask first.
- On the desktop a dev mod reloads when Claude's turn ends, so the person sees a
  change after your reply, never during it. If they declined the hot-reload
  prompt, the mod loads the next time the session starts; `/reload-plugins` only
  reloads mods that were running when the session started.
- A reload resets module variables; `$.state` survives it and `$.store` survives
  sessions. Whatever a drawing must still know after a reload goes in `$.state`.
- The app's dev-mods folder belongs to the session: never `git init` in it. Keep
  the mod's repo elsewhere and sync into it with
  `rsync -a --delete --exclude '.git/' --exclude '.claude-plugin/types/'`.

## Rules the engine enforces

Each refusal below is quoted from the engine.

- **`$` goes only to top-level functions of the same file.** Passing it to a
  closure inside `register` fails the load: "$ is passed to "noteDraft", which is
  not a function declared at the top of this file (a function declaration, or a
  const bound to one)". Give inner helpers values, not `$`.
- **A render hook never writes state.** `$.state.set` while drawing is denied.
  An event hook or a clock writes; the render reads.
- **The types contract exports types and nothing else.** `export {}` in
  `types/index.d.ts` is refused; declare state in `interface PluginState` under
  `declare module 'claude-code'`, and the validator checks every atom against it.
- **A Box size is a number or a whole percent.** `"2.5%"` is refused: "Box prop
  "width" must be a number or a percentage". `span()` in `kit/pixels.tsx` rounds
  both edges, so rows still add up to 100%.

## Drawing on the desktop

- **The desktop has no Raster or Image.** Those are terminal-only, so a grid of
  colored cells is Box runs: `kit/pixels.tsx`. A 100×20 frame in
  `<Box width={40} height={3}>` drew crisp 3px pixels in the band, so a column
  there is about 7.5px and a row about 20px.
- **`Client` is listed for the desktop, but a Client module drew only a
  placeholder there.** Probe it before building on it.
- **Block characters (`▀▄█`) show seams between rows on the desktop.** Fine in
  the terminal; on the desktop draw with Boxes.
- **Svg on the desktop:**
  - Give it `width` and `height`. Without them the desktop drew a 300×150 frame, whatever the markup said.
  - Put `<style>:root{color-scheme:light dark}</style>` in the markup, or the frame paints an opaque white backdrop in dark mode.
  - `isInteractive` is what turns on SMIL animation, hover and `<title>` tooltips.
  - Any prop change reloads the frame and restarts its animations, so never animate by changing an Svg's props. Use Svg for still or self-running pictures, and Boxes for anything that reacts.
- **A row lines its items up by text baseline, not by center**, and
  `alignItems="center"` did not change that. Pin labels with `position="absolute"`
  and `top`/`right` instead.
- **A `role="dismiss"` Button drew as the band's small corner ✕ when it was the
  last item of a row**, and as a "Hide" pill over the content anywhere else.
- **The desktop's Spinner row is one line tall and goes away when the reply
  ends.** For something that stays, draw the `AbovePrompt` band:
  - `e.props.isWorking` says a turn is running.
  - `e.props.bodyColumns` is its width.
  - When `e.props.hasSurvey` is set, `return next(e)`.

## Animating

A clock ticks; on a tick that changes the picture, it bumps a `redraw` atom that
only the animated drawing reads. Verified pattern:

```tsx
import { atom, read } from 'claude-code'
import type { Register, Timer } from 'claude-code'
import { pixels } from './pixels'

const redraw = atom({ plugin: 'my-mod', key: 'redraw' } as const, 0)
const redrawRef = { plugin: 'my-mod', key: 'redraw' } as const
const PALETTE = { O: '#D97757', E: '#2B1D18' }
const FACE = ['.OOOOOO.', 'OOEOOEOO', 'OOOOOOOO', '.O.OO.O.']
const BLINK = ['.OOOOOO.', 'OOOOOOOO', 'OOOOOOOO', '.O.OO.O.']

export const register: Register = on => {
  let clock: Timer | undefined
  let tick = 0
  let redraws = 0

  on('session.start', async ($, e, next) => {
    clock ??= $.clock.every(125, () => {
      tick += 1
      void $.state.set(redrawRef, (redraws += 1))
    })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'desktop' || e.props.hasSurvey) return next(e)
    await read($, redraw) // subscribes this drawing, and only this one
    const { Box } = $.ui.resolve(e)
    return <Box width={8} height={2}>{pixels(Box, tick % 24 >= 22 ? BLINK : FACE, PALETTE)}</Box>
  })
}
```

(`redraw: number` must be declared in the mod's `types/index.d.ts`.)

- Don't use `$.ui.invalidate('ui.render')` to animate: it redraws every instance
  the plugin draws. The atom redraws only the drawings that read it.
- The engine documents a cap on redraws: 30 a second for the band and a shown
  pane, 10 elsewhere, and sooner calls fold. A 125ms tick (8 a second) stays
  under it. Bump the atom only when the frame changes; a still scene should cost nothing.
- A render hook that wants a redraw sets a flag, and the clock's next tick
  writes the atom.
- Keep the picture a pure `frame(state): string[]`. Tests can then check it
  letter by letter, and the hook only draws it.

## Reacting to the prompt box

- **`prompt.edit` fires on every keystroke.** `const box = await next(e)` is the
  draft after the edit: `box.text` and `box.cursor`. Bump the redraw atom right
  there, and the drawing moves on the keystroke itself.
- **On the desktop, typing never reached the mod through PromptHint's
  `isDraft`; `prompt.edit` did.** Tell whether there is a draft from `prompt.edit`.
- **Once, an edit arrived with `e.text === ''` while the box held a draft.**
  Keep your own copy of the draft. In that case apply `e.inputText` to it, or on
  Backspace (`e.key?.key === 'backspace'`) drop its last character. Clear the
  copy on `turn.start`, because the draft was just sent.
- **To place the caret on screen:**
  - In the AbovePrompt render, take `width = composerTextWidth(e.props.bodyColumns)`.
  - Then `caretAt(text, cursor, width)` gives `{ line, x }`, and `x / width` is how far across the box it is.
  - Run it again whenever `bodyColumns` changes, because the draft re-wraps on a resize with no keystroke.
- **The widths in `kit/caret.ts` are macOS (SF Pro) at 14px.** On another OS,
  measure them again (`reference/evidence.md`).

## Effort

`turn.step` is the only place a mod sees effort: `e.effort` is `'low'`, `'medium'`,
`'high'`, `'xhigh'`, `'max'`, or a number. It arrives once per request. There is
no event when the person changes the picker and no getter, so a change shows
from the next request (in practice, their next message). `turn.step` streams, so its hook is an async generator:

```ts
on('turn.step', async function* ($, e, next) {
  if (e.agentId === undefined) void update($, isMax, () => e.effort === 'max')
  return yield* next(e)
})
```

`e.agentId === undefined` keeps this to the main loop; subagents raise their own steps.

## Lines under a reply, and toasts

- A `turn.complete` hook can add a line under the reply: `const done = await next(e)`
  then `return { ...done, text: 'your line' }`. Only do it on the main loop
  (`e.agentId === undefined`). `e.usage?.output_tokens` is what that turn printed.
- `$.ui.toast(text)` shows a one-off notice.

## Testing

- Call `world(on)` from `kit/world.ts` first in each test.
- `$.ui.mount({ plugin, surface, component, props })` draws a component.
  `JSON.stringify(await ui.drawn())` is a string to search for colors and captions.
- Write the body once and loop it over `['terminal', 'desktop'] as const`.
- `clock.advance(ms)` (from `world`) runs `$.clock.every` timers.
  `ui.redraw(props)` draws again with new props, and `ui.press({ key })` presses a keyed Button.
- To drive effort: `for await (const chunk of $.turn.step({ turnId: 't1', index: 0, model, effort: 'max', messageCount: 1 })) void chunk`.
- To type: `$.prompt.edit({ origin: { kind: 'composer' }, text, cursor, start, end, inputText })`.
  `start`, `end` and `cursor` must lie within `text`.
- JSX splits `caret at {n}%` into separate children, so a search for
  `'caret at 37%'` misses it. Draw captions as one string (`{`caret at ${n}%`}`).
- This test kit has no `toBeCloseTo`: round before comparing.
- Run `claude plugin validate <dir>` and `claude plugin test <dir>` before every
  hand-off. A load error in the validator means nothing of the mod runs.

## When the app and this kit disagree

Probe, don't guess. `reference/evidence.md` has the recipes:
- Make the hook record what the desktop actually sends with `$.store.set`, then
  read `~/.claude/plugins/store/<plugin>_*.json`. Delete the probe keys on the
  next `session.start`.
- Measure text the way the app does. It is Chromium, so use `measureText` in a
  Chromium page with the same font.
- Ask the person for a screenshot, and compare in pixels.
