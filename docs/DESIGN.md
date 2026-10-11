# Gold UI

The visual language for Gold-Web. It should look like a carefully engineered
desktop application, not a dashboard — and it should never dress up a privacy
claim it can't back up.

## The ideas behind it

**Black and gold by default.** Deep black surfaces, solid panels, sharp
contrast, and a single gold accent for anything interactive or "on". The
*default* theme is deliberately flat — no gradients, no glass, no decorative
shadow. It is a starting point, not a rule: the theme system below lets anyone
restyle the chrome without touching a line of CSS.

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

These are the defaults for the **Gold** preset. Gold is used sparingly — if
everything glows, nothing communicates.

## Theming

The default look is one preset of many. Everything above is expressed as CSS
custom properties in `brand/gold-ui/tokens.css`, and `ui/chrome/theme.js` is the
thing that writes them. That split matters:

- **The UI only ever reads tokens.** No component knows a setting exists, or
  what colour a preset picked. It asks for `--accent`, `--surface`, `--radius`,
  and gets a value. This is why a new preset is a data change, not a CSS change.
- **The theme engine owns the mapping.** It takes a preset plus any per-setting
  overrides, works out the derived values (hover shades, contrast-safe ink on
  top of the accent, glass tints), and applies them to `:root`.
- **Contrast is computed, not hardcoded.** Anything drawn on the accent picks
  its text colour by measuring contrast, so a light accent gets dark ink and a
  dark accent gets light ink. Presets can't accidentally become unreadable.

What you can change today, from **Settings → Appearance**:

| Setting | What it does |
|---|---|
| Preset | Twelve named themes — Gold, Obsidian, Midnight, Emerald, Crimson, Violet, Ocean, Sunset, Rose, Neon, Mono, Daylight |
| Accent | Any colour; the rest of the accent scale is derived from it |
| Tone | How black the surfaces are: black, onyx, charcoal, slate |
| Corners | Square, soft or round |
| Density | Compact, comfortable, spacious — drives control and row heights |
| Motion | Full, reduced, or off (and `prefers-reduced-motion` is honoured regardless) |
| Transparency | Opaque or glass, with a blur slider |
| Background | Solid, aura, mesh, grid or image — the decorative shapes are tinted from your accent, with a strength slider |

Dark presets are the defaults, with one optional light theme (`Daylight`); the
light theme has to meet the same contrast bar and will never be the default.
Choices are saved locally and reapplied on load. The stored shape is a flat
`settings` object — the same shape the native settings store will read and write
later, so nothing has to be rewritten when the shell takes it over.

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

Spacing and radii are defaults for the *comfortable* density and the *soft*
corner style; the other options are derived from the same scales so nothing
drifts out of alignment.

## Motion

- `120 ms` for state changes, `200 ms` for panels, ease-out.
- `prefers-reduced-motion` is honoured everywhere.
- Nothing loops or pulses for attention in the chrome.

Motion duration is a theme setting; "reduced" shortens it and "off" removes it,
but the system setting always wins.

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
