# What each rule rests on

Seen on Claude Code 2.1.286 in Claude desktop 2.19675.0, macOS, October 2026,
while building the token-printer mod. "Refused" rules quote the engine. "Seen"
rules come from the app's screen or from what the mod's hooks recorded. When a
newer app seems to disagree, run the check next to the rule before working
around it, and update this file.

## Refused by the engine

| Rule | The engine's words | Check |
|------|--------------------|-------|
| `$` only to top-level functions of the file | `$ is passed to "noteDraft", which is not a function declared at the top of this file (a function declaration, or a const bound to one); ... $ is always spelled $.noun.event(...) at the call site` | `claude plugin validate`: the hooks module fails to load |
| Render hooks never write state | Engine docs: `$.state.set` while drawing is denied | Same |
| Types contract exports only types | `` `export` at the top level is followed by `type` or `interface`: a contract exports types and nothing else `` | Same |
| Every state atom is declared | `<plugin>.<key> is not declared: the manifest's types contract must name it in interface PluginState { <plugin>: { <key>: ... } }` | Same |
| Box sizes: numbers or whole percents | `Box prop "width" must be a number or a percentage` (for `"5.56%"`) | `claude plugin test` with a mounted drawing |
| Function hooks switched off | `hooks modules are turned off in this process: CLAUDE_CODE_ENABLE_FUNCTION_HOOKS is 0 in a settings file or in its environment, or the rollout switch served off` | `claude plugin test` |

## Seen on the desktop

| Rule | What was seen | Check |
|------|---------------|-------|
| No Raster or Image | The engine's `Elements` table lists them for `terminal` only | `grep -n "desktop: {" -A 12` in the generated `.claude-plugin/types/claude-code/index.d.ts` |
| `Client` shows a placeholder | A three-way lab (percent-sized boxes, the same grid as a live Client module, block characters): the Client candidate drew a placeholder, never ran | Draw a Client with a visible clock in the band |
| Block characters seam | In the same lab, block-character art showed gaps and seams between rows; the boxes drew a solid grid | Draw a few rows of `█` in the band |
| Svg frame defaults to 300×150 | A 136-unit-wide scene drew 300px wide, centered in a 150px-tall box, its markup's width ignored | Draw an Svg without `width`/`height`; screenshot |
| Svg white backdrop | An opaque white rectangle behind the picture in dark mode until the markup carried `color-scheme:light dark` | Toggle the app to dark mode |
| Svg prop change reloads the frame | Changing a picture's `width` as the person typed replayed its SMIL intro on every change | Change one prop on a timer; watch an animation restart |
| Baseline alignment | A caption's baseline sat on the bottom edge of the picture beside it; `alignItems="center"` had no effect | A row of a 60px picture and a Text |
| Dismiss Button placement | Last item of a row: the band's corner ✕. Outside the row: a "Hide" pill over the content | Move the Button; screenshot |
| Band pixel size | 100×20 frame in `<Box width={40} height={3}>`: 3px pixels, so a column is about 7.5px, a row about 20px | Screenshot, measure |
| Spinner row height | An 84px picture in the desktop Spinner row was clipped to one line | — |
| `isDraft` missing | With PromptHint's `isDraft` as the only signal, the band never reacted to typing on the desktop; `prompt.edit` fired on every keystroke | Record `e.props` to `$.store` from the PromptHint hook |
| Empty-text edits | One `prompt.edit` came with `e.text === ''` while the box held a draft | Record `e.text.length`, `e.inputText`, `e.key` per edit |
| Effort only per request | `effort` appears in the engine types on `turn.step` (and agent definitions), nowhere a picker change could raise it | `grep -n -i effort` in the generated types |
| Hot reload at turn end | Edits went live once Claude's reply finished; module variables restarted, `$.state` kept | — |

## Measuring the prompt box again

`kit/caret.ts` models the desktop prompt box: 14px `system-ui`, words wrapping
whole, a kerning factor, and the box's width from the band's `bodyColumns`. On
another OS or app version, measure in this order:

1. **Character widths.** In any Chromium page (the browser pane works), run:
   ```js
   const c = document.createElement('canvas').getContext('2d')
   c.font = '14px system-ui'
   JSON.stringify(Array.from({ length: 95 }, (_, i) => +c.measureText(String.fromCharCode(32 + i)).width.toFixed(2)))
   ```
   That replaces `WIDTHS` (`' '` to `'~'`). Measure `OTHER_WIDTHS` the same way.
2. **Kerning.** Measure a few long sentences whole with `measureText`, and divide
   by the sum of their letters' widths. That gives `KERNING` (0.992 on macOS).
3. **Box width.** Record `e.props.bodyColumns` from the AbovePrompt hook into
   `$.store`. At two window widths, screenshot the prompt box and measure its
   width in px. The two (columns, px) pairs fit the line in `composerTextWidth`.
   The inset is the box's width minus the width its text can use (46px on macOS:
   padding plus the send button).
4. **Check against the screen.** Type a long draft that wraps. Compare where the
   app breaks lines and where its caret sits with
   `caretAt(text, cursor, composerTextWidth(columns))`. On macOS the model landed
   within about a pixel of the screenshots.

## Recording what the desktop sends

```ts
on('prompt.edit', async ($, e, next) => {
  const box = await next(e)
  await $.store.set('probe', { text: e.text.length, inputText: e.inputText, key: e.key?.key, box })
  return box
})
```

Then read `~/.claude/plugins/store/<plugin>_*.json`. Delete the probe keys on the
next `session.start` (`void $.store.delete('probe')`), so nothing is left behind.
