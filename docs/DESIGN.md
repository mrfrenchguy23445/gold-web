# Design language

Espionage should look like a carefully engineered desktop application, not a
generic dashboard. Every control, panel and animation earns its place.

## Core principles

**Pure black.** True black surfaces (`#000`), solid panels, sharp contrast. No
gradients, no glassmorphism, no decorative blur, no drop shadows for effect.

**Intentional UI.** Compact controls, clean tabs, consistent spacing, quiet
motion. Motion communicates state; it is never ornamental.

**Visible privacy.** Protection status is always legible: what is blocked, what
is shared, what a permission allows. Controls are transparent and reversible.

**Purposeful speed.** Low overhead, responsive navigation, minimal background
activity. The UI never blocks on network work.

## Colour

| Token | Value | Use |
|-------|-------|-----|
| `--bg-void` | `#000000` | App background, chrome |
| `--bg-surface` | `#0a0a0a` | Panels, cards, menus |
| `--bg-raised` | `#141414` | Hover / selected surfaces |
| `--border-subtle` | `#1f1f1f` | Dividers, control borders |
| `--text-primary` | `#f5f5f5` | Primary text |
| `--text-secondary` | `#a3a3a3` | Secondary / metadata |
| `--text-disabled` | `#5c5c5c` | Disabled states |
| `--accent` | `#3ddc97` | Interactive accent, protection "on" |
| `--danger` | `#ff5c5c` | Destructive, blocked, warnings |
| `--warning` | `#f5b942` | Caution states |

Dark is the only theme in v0.1. A light theme may be added later if it can meet
the same contrast bar; it is not a priority and must never be the default.

## Typography

- System UI stack for chrome and our web UI (`system-ui`, then platform
  fallbacks). No bundled webfonts in chrome.
- Two weights only: regular and medium/semibold.
- Monospace only for technical values (fingerprints, hashes, URLs in the
  privacy centre).
- Comfortable line length and generous line height in content surfaces; tight
  and precise in chrome.

## Spacing & geometry

- 4 px base spacing scale (`4 / 8 / 12 / 16 / 24 / 32`).
- Corner radii: `4 px` controls, `6 px` panels, `8 px` large surfaces. Never
  fully rounded "pill" controls except where a native control requires it.
- 1 px borders in `--border-subtle`; hierarchy comes from surface luminance and
  spacing, not from shadow.

## Motion

- Durations `120 ms` (state) / `200 ms` (panel), ease-out.
- Honour `prefers-reduced-motion` everywhere — no exceptions.
- No looping or attention-grabbing animation in chrome.

## Iconography

- Single-weight line icons, 16 px grid in chrome, 24 px in content.
- Icons are monochrome and inherit current colour; accent is reserved for state.

## Voice & copy

- Plain, direct, specific. Say what a thing does and what it does not do.
- Never claim protection we cannot verify. "Blocks known trackers" — not
  "makes you anonymous".
- No exclamation marks, no marketing superlatives, no emoji.

## The honest-privacy rule

Any surface that reports protection must state its limits. The private-browsing
explanation and the fingerprinting self-test are the canonical examples: they
limit local records / reduce exposure, and they say that plainly.
