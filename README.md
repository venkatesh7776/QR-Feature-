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

**Supabase (permanent, the default when configured).** Put `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (see `.env.example`). Then:
- Records go into Postgres: `memory_folders` and `memories`, with RLS on and no
  public policies, so only the server's secret key can read or write them.
- Photos and voice notes go into the private `memories` Storage bucket under
  `<folderId>/`. The app streams them through `/api/memories/files/...`.
- The schema is in `supabase/migrations/`. Run it once in the Supabase SQL Editor for a new project.
- `npm run migrate:supabase` copies anything in the local `.data/` folder into Supabase. It's safe to re-run.

**Local fallback.** Without those env vars, data is kept in `.data/` on the
machine running the server. That's fine for a quick demo, but it's one disk
with no backups.

**Still required for a real event:** deploy the app (e.g. Vercel with the same
env vars) so guests can upload when your laptop is off, and set
`SHARE_ORIGIN=https://your-site.com` so QR codes point there. Until then the
app, and `npm run share` for an https link, must be running on this machine.
On Supabase's free plan, projects pause after about a week without activity.
The data is kept, and you restore the project from the dashboard.

All storage code is in `src/features/memories/server/` (`store.ts` picks the
backend), so moving to another provider means writing one more store file.

## Voice notes

Recording uses `MediaRecorder` (up to 60 s) and handles blocked or missing
microphones. **Browsers only allow microphone access on https or `localhost`.**
On the plain-http Wi-Fi address, the page offers **Add a voice note** (an audio
file) instead and explains why. `npm run share` or a real deployment gives an
https link, and then guests can tap **Record a voice note** and just talk.
