# claude-code-mod-kit

A Claude Code skill for building mods that draw, animate and react in the Claude
desktop app, packed with everything the docs don't tell you.

It came out of building **token-printer**: Clawd prints tokens above your prompt
box while Claude works. He startles awake when you start typing, follows your
cursor with his eyes, and puts on shades at Max effort. Getting there meant
finding out by trial and error how the desktop actually draws. This kit is that
knowledge, so your mod doesn't have to start from zero.

## What's inside

- **`SKILL.md`**: the rules. It covers:
  - what the engine refuses, in its own words
  - how the desktop really draws
  - animating without reloads
  - reacting to the prompt box
  - reading the effort level
  - adding lines under replies
  - testing
- **`kit/pixels.tsx`**: native pixel art built from Boxes. The desktop has no
  Raster, and its pictures reload on every change.
- **`kit/caret.ts`**: where the caret sits in the desktop prompt box. It's
  modeled on the box's own font and wrapping, and lands within about a pixel on macOS.
- **`kit/world.ts`**: engine stubs for `claude-code/testing`, so a mod's tests
  run in a few lines.
- **`reference/evidence.md`**: what each rule rests on, and how to check it again
  when the app changes.

## Install

Copy this folder to `~/.claude/skills/claude-code-mod-kit` (or clone it there).
Then ask Claude Code for a mod. It reaches for the kit whenever a mod draws UI
or reacts to typing, alongside the built-in `plugin-authoring` skill.

## Good to know

- Everything was seen on Claude Code 2.1.286 in Claude desktop 2.19675.0, on
  macOS, in October 2026. Mods are young, and some of these behaviors will change.
  Each rule says how to check it again.
- The font widths in `kit/caret.ts` are macOS's. Other systems draw another
  font, and `reference/evidence.md` shows how to measure yours.
- Function hooks may need `"CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"` in the
  `env` of `~/.claude/settings.json`.
