# BGG Linker

BGG Linker is a Manifest V3 extension for Microsoft Edge. On likely product-detail
pages it extracts the product name from structured metadata and displays a small
BoardGameGeek card in the bottom-right corner.

## Detection strategy

Signals are ranked instead of relying on a single vendor's markup:

1. `schema.org/Product` JSON-LD
2. product-specific metadata or microdata
3. Open Graph title and the page's `h1`, but only when other product evidence exists

This deliberately avoids activating on every page with a heading. Vendor adapters
can be added later for stores whose markup defeats these generic signals.

## BGG access

The direct BGG search link works without configuration. Ratings use XML API2 and
require an approved application bearer token. Open the extension settings by
clicking its toolbar icon, test the connection, and store the token locally.

BGG advises client applications to minimize calls and cache responses. The extension
serializes API calls with a five-second interval and caches successful lookups for
seven days. Before distributing a public build, register the application with BGG
and decide whether API calls should move behind a small caching service so the
application token is not shipped to clients.

## Build and load

From the repository root:

```sh
npm install
npm test
npm run build
```

Then open `edge://extensions`, enable **Developer mode**, choose **Load unpacked**,
and select `apps/bgg-linker/dist`.
