# Gold UI

The visual language for Gold-Web. It should look like a carefully engineered
desktop application, not a dashboard — and it should never dress up a privacy
claim it can't back up.

## The ideas behind it

**Black and gold.** Deep black surfaces, solid panels, sharp contrast, with a
single gold accent for anything interactive or "on". No gradients, no glass,
no decorative shadow.

**Deliberate.** Compact controls, clean tabs, even spacing, quiet motion.
Motion shows state; it never performs.

**Legible privacy.** You can always see what's protected and what isn't: what
was blocked, what a permission allows, what's being sent. Controls are plain
and reversible.

**Quiet speed.** Low overhead, fast navigation, nothing running that doesn't
need to be.

## Colour

| Token | Value | Used for |
|---|---|---|
| `--bg-void` | `#000000` | Background and chrome |
| `--bg-surface` | `#0a0a0a` | Panels, cards, menus |
| `--bg-raised` | `#141414` | Hover and selected states |
| `--border-subtle` | `#1f1f1f` | Dividers and control borders |
| `--text-primary` | `#f5f5f5` | Main text |
| `--text-secondary` | `#a3a3a3` | Secondary text and metadata |
| `--text-disabled` | `#5c5c5c` | Disabled states |
| `--accent` | `#e0b84c` | Gold: interactive, protection "on" |
| `--danger` | `#ff5c5c` | Destructive, blocked, warnings |
| `--warning` | `#f5b942` | Caution states |

Dark is the only theme for now. A light theme can come later if it can meet the
same contrast bar, and it will never be the default. Gold is used sparingly —
if everything glows, nothing communicates.

## Type

- System UI fonts for chrome and our pages. No bundled webfonts in the browser
  chrome.
- Two weights: regular and medium/semibold.
- Monospace only for technical values — fingerprints, hashes, raw URLs.
- Roomy line height in content, tight and precise in chrome.

## Spacing and shape

- A 4 px spacing scale: `4 / 8 / 12 / 16 / 24 / 32`.
- Corner radii: `4 px` controls, `6 px` panels, `8 px` large surfaces. No
  pill-shaped controls unless a native control is one.
- Hierarchy comes from surface shade and spacing, not from borders everywhere.

## Motion

- `120 ms` for state changes, `200 ms` for panels, ease-out.
- `prefers-reduced-motion` is honoured everywhere.
- Nothing loops or pulses for attention in the chrome.

## Icons and copy

- Single-weight line icons; 16 px in chrome, 24 px in content. Monochrome,
  inheriting current colour.
- Copy is plain and specific: say what a control does and what it doesn't.
- "Blocks known trackers" — not "makes you anonymous". No exclamation marks,
  no superlatives, no emoji.

## The honesty rule

Every surface that reports protection states its limits. The private-browsing
explanation and the fingerprinting self-test are the models: they explain what
they change and, just as clearly, what they don't.
