# HYPERION — quick UI preview

## Fastest option on Windows

Double-click:

`START_PREVIEW.bat`

It starts a small local PowerShell web server and opens `OPEN_UI_FAST.html`, which redirects to the generated `quick-preview/` UI. No Node.js/npm installation is required for this preview path.

Close the PowerShell window (or press Ctrl+C) to stop the server.

## VS Code alternative

1. Right-click `OPEN_UI_FAST.html`.
2. Choose **Open with Live Server**.
3. The page redirects to `quick-preview/index.html`.

You can also open `quick-preview/index.html` directly with Live Server.

> Do not use the root source `index.html` with plain Live Server. It is the Vite source entry.

## Source ownership

- `index.html` is the canonical source application entry.
- `src/` is source of truth.
- `quick-preview/` and `dist/` are generated outputs and must not be edited as source.
- `OPEN_UI_FAST.html` is only a launcher.

Regenerate the dependency-free review preview after source changes:

```sh
npm run build:static-preview
```

For the normal optimized Vite build on a correctly installed Node environment:

```sh
npm ci
npm run build
npm run build:quick-preview
```
