# Edge Toolkit

A monorepo for small, independent Microsoft Edge extensions. Each extension is
an installable application under `apps/`; shared code can be introduced under
`packages/` when two applications genuinely need it.

## Applications

- [`apps/bgg-linker`](apps/bgg-linker) detects board-game product pages and adds
  a BoardGameGeek link and, when API access is configured, the game's rating.

## Development

```sh
npm install
npm test
npm run build
```

Load `apps/bgg-linker/dist` as an unpacked extension from
`edge://extensions` after enabling **Developer mode**.
