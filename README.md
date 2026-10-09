# Gold-Web

A privacy-first desktop browser, built on Firefox.

Gold-Web isn't Firefox with a new paint job. It has its own look, its own
defaults and its own idea of what a browser should do with your data: as
little as possible, and never behind your back.

The name is about the interface — black and gold, calm and deliberate — but
the point of the project is the part you don't see. Tracking protection,
fingerprint resistance and encrypted DNS are on from the first launch. There's
no telemetry to switch off, no sponsored tiles to remove, no "recommended"
anything. What's still running in the background is listed and explained
instead of quietly hidden.

One promise we'll keep: we won't claim a privacy feature does more than it
actually does. Private browsing limits local records; it doesn't make you
anonymous. We'll say so plainly.

> **Where things stand:** early. The Firefox source is checked out and the
> build tooling is in place. The first build is running. There's no Gold-Web
> release yet — see `docs/ROADMAP.md` for what's next.

## Getting it running

Gold-Web is built from a normal Firefox checkout. This repo holds everything
*we* add — the brand, the UI, the patches — and nothing of Mozilla's 11 GB
source tree, so the two can move independently.

```sh
./scripts/bootstrap.sh   # find the Firefox checkout and check the toolchain
./scripts/apply.sh       # lay our brand and UI over it
./scripts/build.sh       # build
./scripts/run.sh         # try it
```

You'll need a Firefox source checkout somewhere on disk. `bootstrap.sh` finds
it, or set `GOLDWEB_UPSTREAM` to point at it. Full instructions, including
what to expect on a slow machine, are in `docs/BUILDING_LINUX.md`.

## What's in here

```
brand/     Our identity: the in-tree brand files, source art and the Gold UI theme
ui/        The pages we build — starting with the start page
patches/   Small, reviewable edits to Firefox itself
build/     Build configuration and the pinned Firefox revision
scripts/   The day-to-day helpers
docs/      Design, architecture and the roadmap
```

## Where it's headed

- **v0.1** — it boots as Gold-Web: black-and-gold interface, our start page,
  and privacy defaults on from the start.
- **v0.2** — a Privacy Control Centre that shows what's actually blocked and
  gives you real control over connections and stored data.
- **v0.3** — workspaces for keeping different parts of your life apart.
- **v0.4** — the rest of the everyday browser: bookmarks, history, downloads,
  passwords, settings.
- **v1.0** — Linux packages and a proper, signed update path.

## License

Gold-Web's own code is licensed separately from Mozilla's Firefox source, which
stays under the MPL 2.0. The license for our side is still being decided — see
`LICENSE`.
