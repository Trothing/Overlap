# Overlap slot page

A static page that opens a shared call slot in the viewer's own time zone and offers an `.ics` file for any calendar. No server, no build step, no dependencies: `index.html`, `styles.css`, `app.js` and the IBM Plex fonts in `fonts/`, which are served from the same host so the page makes no requests to third parties.

## Link format

```
<base>?v=1&t=<UTC milliseconds>&d=<minutes>&n=<title>
```

| Parameter | Meaning |
| --- | --- |
| `v` | Link version, currently `1`. Other values show the invalid-link state. |
| `t` | Start of the slot as a UTC timestamp in milliseconds, between 2020 and 2100. |
| `d` | Length in minutes, 5 to 480. Defaults to 60. |
| `n` | Optional title, up to 60 characters. |
| `theme` | Optional `light` or `dark`. Without it the page follows the browser appearance (`prefers-color-scheme`). |
| `lang` | Optional page language: `en`, `uk` or `es`. Without it the browser language is used. |

The app builds the same link with the same rules (`src/domain/share/slotLink.ts`). The `.ics` builder in `app.js` mirrors `src/domain/share/ics.ts`; change both together.

## Run locally

```bash
npx serve web
```

Then open `http://localhost:3000/?v=1&t=1793192400000&d=45&n=Weekly%20sync`.

## Publish

Any static host works. With GitHub Pages, publish the `web/` folder, then put its public address in `.env` for the environment it serves:

```
EXPO_PUBLIC_APP_ENV=prod
EXPO_PUBLIC_SHARE_URL_PROD=https://<user>.github.io/<repo>/
```

With a web address set for the active environment, Share includes the link after the message and Copy link copies it. With `EXPO_PUBLIC_APP_ENV=expogo` (the default), Copy link copies `exp://<host>:8081/--/s?...`, which works only on a phone running the same dev server and only from the browser address bar or a QR code, because chat apps do not make `exp://` links tappable. When the active environment has no web address the link is `overlap://s?...` and Share leaves it out.

The page's **Open in the Overlap app** button uses the `overlap://s` scheme. Opening an `https` link directly in the app (Android App Links, iOS universal links) needs domain verification files on the host and is not set up.
