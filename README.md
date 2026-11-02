# Polarity Marketplace

The list of add-ons shown in Polarity under **Settings → Marketplace**. The app
reads [`addons.json`](addons.json) straight from this repository, so a merged
pull request shows up for everyone within a few hours, no app update needed.

## Adding an add-on

1. Fork this repo and add an entry to `addons.json`:

   ```json
   {
     "id": "org.example.subtitles",
     "name": "Example Subtitles",
     "author": "Example",
     "about": "What it adds, in a sentence or two. Mention anything it needs, like an API key.",
     "category": "Subtitles",
     "tags": ["subtitles", "anime"],
     "manifest": "https://example.com/manifest.json"
   }
   ```

2. Run `node scripts/validate.mjs` (Node 20+, no install needed).
3. Open a pull request.

| Field | |
| --- | --- |
| `id` | The `id` from the add-on's own manifest. Polarity uses it to tell whether it's installed. |
| `name`, `author` | Up to 40 characters each. |
| `about` | Up to 200 characters. Plain and specific: what it adds, and what it needs. |
| `category` | `Subtitles`, `Streams`, `Metadata` or `Catalogs`. It must match what the add-on provides. |
| `tags` | Up to 8. Used by the Marketplace search. |
| `manifest` | HTTPS URL of the add-on's `manifest.json`. |
| `configure` | Optional. The add-on's setup page, if it takes an account, a key or options. |
| `setupRequired` | `true` if it can't be installed before it's set up. People open the setup page, then paste the link it gives them into **Add-ons → Install from URL**. |
| `homepage` | Optional. The project or service's site. |
| `minAppVersion` | Optional. Hides the entry from older versions of Polarity. |

## What gets listed

Add-ons for **lawful content only**: subtitles, metadata, catalogues, and streams
from sources that have the rights to them (official services, public broadcasters,
creators' own channels).

The Marketplace doesn't list torrent, debrid, scraper or piracy add-ons, or anything
that exists mainly to get around a paywall. The validator refuses the obvious ones, and
a person reviews every pull request. People can still install any add-on they like
from its link; that's their own choice and responsibility, and it doesn't belong here.

Entries are removed if the add-on goes offline for good, stops doing what it says, or
starts serving content it has no right to.
