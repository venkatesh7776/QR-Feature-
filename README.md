# Wedding Memories (feature prototype)

Couples create a folder per event, print a QR card for it, and guests scan it
to share photos with optional notes, emoji reactions and voice notes. Every
contribution lands in the folder that the QR code belongs to. Couples can also
upload photos straight into a folder.

## Run it

```bash
npm install
npm run demo        # production build + server on 0.0.0.0:3000 (best for phones)
# or
npm run dev         # dev server on 0.0.0.0:3000
```

Open http://localhost:3000. It redirects to `/memories`.

For live voice notes on phones, also run this in a second terminal while the app is running:

```bash
npm run share       # temporary public https link (Cloudflare quick tunnel)
```

New QR codes then point to that https link. The link changes every time you
run it, so re-download the QR card after restarting it. Anyone with the link can
reach the app while the tunnel runs; stop it with Ctrl+C.

### Demo script

1. **Create Event Folder** → e.g. "Wedding Ceremony", optional date and type.
2. On the folder page, click **Generate QR code**. Pick a theme, edit the text, then **Download QR card (PNG)**.
3. Scan the card with a phone on the **same Wi-Fi** (or use **Open guest page**).
4. As the guest: choose photos, remove any, add a note, reactions and a voice note, then **Share**.
5. Back in the folder (it refreshes every 10 s and on focus), the photos are there. Click one to see the note, play the voice note and view or add reactions.
6. Click **Upload photos** to add the couple's own photos. They show up in the same gallery.

## Deployment (Vercel)

Live at **https://murali-varshitha-memories.vercel.app** (project `wedding-memories`). The older address https://wedding-memories-iota.vercel.app stays attached so cards printed with it keep working. `SHARE_ORIGIN` decides which address new QR cards use.

```bash
# once per setting listed in .env.example, e.g.
vercel env add CLOUDFLARE_API_TOKEN production --sensitive
vercel deploy --prod
```

Vercel installs dependencies from `package-lock.json`, and `.vercelignore`
keeps `.env.local` and `.data/` out of uploads.

Vercel limits request bodies to about 4.5 MB, so the browser uploads each
photo and voice note **directly to R2** using one-time signed URLs
(`POST /api/memories/folders/[id]/uploads`), then posts only the metadata.

## Look and feel

The app is styled as part of the couple's invitation website (Royal Indian
Heritage × Modern Luxury): ivory and burgundy, antique gold, Cormorant Garamond
with Inter, kolam and mandala textures, sand-and-cream folder cards, and a
stationery-style QR card with the Ganesha and the couple's names.

- `src/features/memories/lib/wedding.ts` holds everything couple-specific
  (names, invocation, suggested event folders and dates). Change only this
  file to set the app up for another wedding.
- `src/app/globals.css` holds the colour, type and motion tokens.
- `src/features/memories/components/art/Ornaments.tsx` has the ornaments
  (lotus divider, kolam, arch edge, mandala, zari band, Ganesha).

## Couple passcode

The couple's pages (albums, album pages, QR cards) and the APIs that list,
create or delete albums need a passcode; guests scanning a QR code never do.
Set it with `COUPLE_PASSCODE` (on Vercel: `vercel env add COUPLE_PASSCODE
production --sensitive`). Changing it signs every device out. Without it, the
lock is off, which is handy for local development. Entering the passcode keeps
a device signed in for 30 days; **Lock** in the albums header signs it out.

## Routes

| Route | Who | Purpose |
| --- | --- | --- |
| `/memories` | Couple | Dashboard with folders |
| `/memories/[folderId]` | Couple | Gallery, viewer, direct upload |
| `/memories/[folderId]/qr` | Couple | QR card designer and download |
| `/share/[folderId]` | Guest | Mobile upload page (QR destination) |
| `/api/memories/*` | — | JSON + multipart API |

## Code layout

Everything lives in `src/features/memories/` so it can be moved into the main wedding site:

- `lib/types.ts`: the data model. A `Folder` has many `Memory` records. Each memory has `folderId`, `source` (guest/couple), `photoUrl`, optional `message`, `guestName` and `voiceNoteUrl`, `reactions` (emoji → count) and `createdAt`.
- `server/store.ts`: **the only persistence code**. Replace these functions to move to a real backend.
- `lib/api.ts`: browser client for the API.
- `lib/qr-card.ts`: renders the QR card to a canvas, so the preview and the downloaded PNG are identical.
- `components/`: `Dashboard`, `FolderView`, `MemoryViewer`, `QrStudio`, `GuestUpload` and `VoiceNoteInput`.

`src/app/` only contains thin route wrappers.

## Storage

Everything lives on Cloudflare:

- **Records** (albums, notes, reactions, guest names) in the D1 database
  `murali-varshitha-memories`. Schema: `db/schema.sql`. The app reaches D1
  through Cloudflare's HTTP API with `CLOUDFLARE_API_TOKEN` (D1 Edit).
- **Photos and voice notes** in the private R2 bucket
  `murali-varshitha-memories`, keyed `<folderId>/<name>`. Guests' browsers
  upload straight to R2 with one-time presigned URLs (the bucket's CORS rules
  allow the app's addresses), and photos are served through
  `/api/memories/files/...`, which redirects to a short-lived presigned link.

Settings are listed in `.env.example`. Without them, data is kept locally in
`.data/` on the machine running the server, which is fine for development.

All storage code is in `src/features/memories/server/`: `cloud-store.ts`
(D1 + R2), `file-store.ts` (R2), `local-store.ts`, and `store.ts`, which picks
one.

To set up a new database: `npx wrangler d1 create <name>` then
`npx wrangler d1 execute <name> --remote --file db/schema.sql`.

## Voice notes

Recording uses `MediaRecorder` (up to 60 s) and handles blocked or missing
microphones. **Browsers only allow microphone access on https or `localhost`.**
On the plain-http Wi-Fi address, the page offers **Add a voice note** (an audio
file) instead and explains why. `npm run share` or a real deployment gives an
https link, and then guests can tap **Record a voice note** and just talk.
