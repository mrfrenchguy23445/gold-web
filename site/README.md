# Gold-Web website

The project's landing page: a single static HTML page describing what Gold-Web
is, its privacy stance, the Gold UI design language, the current status, and how
to build it.

No build step, no framework, no external requests. Open `index.html` directly,
or serve the folder:

```sh
python3 -m http.server 8000 --directory site
# then open http://127.0.0.1:8000/
```

## Files

| File | What it is |
|---|---|
| `index.html` | The whole page |
| `style.css` | Page styles, on top of the tokens |
| `assets/tokens.css` | A copy of `brand/gold-ui/tokens.css` — the shared design tokens |
| `assets/goldweb.png` | The wordmark |
| `assets/favicon.svg` | The gold diamond, matching the browser's logo mark |

`assets/tokens.css` is a copy, kept so the site is one self-contained folder.
If the tokens in `brand/gold-ui/tokens.css` change, re-copy them so the website
keeps matching the browser.

## Publishing

The folder is ready for GitHub Pages as-is: point Pages at `site/` (or copy its
contents to the branch/folder Pages serves). All asset paths are relative, so it
also works from any static host or straight off disk.

## Editing

Keep the copy honest and specific, the same rule the browser's own interface
follows: say what something does, and what it doesn't. "Blocks known trackers",
not "makes you anonymous". No superlatives, no emoji.
