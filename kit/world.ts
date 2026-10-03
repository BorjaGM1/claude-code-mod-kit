// The engine beneath a mod in a test (claude-code/testing): an answer for each
// event a mod commonly raises or passes on with `next(e)`, so its hooks run as
// they would in a session. Put this file in the mod's tests/ and call
// `world(on)` first thing in a test; add an `on(...)` stub for anything else
// the mod raises.

import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'

export function world(on: On) {
  const toasts: string[] = []

  // The engine's own drawing, for whatever the mod leaves to it.
  on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: `engine ${e.component}` }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  // A streaming event: its stub is a generator too. Drive it from a test with
  // `for await (const chunk of $.turn.step({ turnId, index: 0, model, effort: 'max', messageCount: 1 })) void chunk`.
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, percent: 40 }, rateLimits: [], cost: { usd: 1 } } }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', (_, e) => (toasts.push(e.text), { value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  // The prompt box applies the edit: type with
  // `$.prompt.edit({ origin: { kind: 'composer' }, text, cursor, start, end, inputText })`.
  on('prompt.edit', (_, e) => ({ text: e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end), cursor: e.start + e.inputText.length }))
  mock.store(on)

  // `clock.advance(ms)` runs the mod's `$.clock.every` timers.
  return { toasts, clock: mock.clock(on) }
}
