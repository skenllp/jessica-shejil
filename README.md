# Jessica & Shejil: Bride-Side Omani Wedding Invitation (HTML/CSS/JS)
Bride-side adaptation of the approved groom-side site. Same design, animations, door-opening cover, footer videos and layout; only the invitation content, metadata and RSVP routing differ. No build step.

Files: `index.html`, `styles.css`, `script.js`, `set-site-url.py`, `assets/`, `google-apps-script/Code.gs`.

## Before you deploy (3 things to set)
1. **Site address** (WhatsApp preview / SEO). Run once, with the bride-side domain (it refuses the groom-side one):

        python3 set-site-url.py https://your-bride-site.example

   This sets `canonical`, `og:url`, `og:image` and `twitter:image` in `index.html`. Until you run it they read `https://YOUR-BRIDE-SITE-DOMAIN`.
2. **RSVP backend**: see below. `RSVP_URL` in `script.js` is intentionally a placeholder, so no response can land in the groom-side list by accident. Until it is set, the form shows "RSVP is not available right now" and sends nothing.
3. Re-test the RSVP on the live site (steps below).

## RSVP: how bride-side responses are identified
Every submission includes `invitationSide: "bride"`. `google-apps-script/Code.gs` stores it in a new **Invitation side** column (H) and the Summary sheet splits counts by Bride / Groom. The script is backward compatible: a request with no `invitationSide` (the original groom-side site) is stored as "Groom", existing columns do not move, and de-duplication is per side (the same name on both sides gives two rows). The site only shows "Thank you" if the script echoes `side: "Bride"`; an old script that doesn't know about sides makes the form show an error instead of silently succeeding.

**Option A (recommended): separate bride-side sheet**
1. Create a new Google Sheet > Extensions > Apps Script. Replace all code with `google-apps-script/Code.gs`.
2. Run `setup` once. 3. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone. Copy the `/exec` URL.
4. Paste it into `RSVP_URL` in `script.js`.

**Option B: one shared sheet** (side column tells them apart)
1. In the existing groom-side Apps Script project, replace the code with this `Code.gs`, run `setup` (labels existing rows "Groom"), then Deploy > Manage deployments > pencil > New version. The URL stays the same.
2. Paste that same URL into the bride site's `RSVP_URL`. **Do this only after step 1**: an un-updated script would save bride responses unlabeled.

**Test (required)**: submit a "Yes" and a "No" RSVP on the deployed bride site; confirm the rows appear with Invitation side = Bride and the Summary tab counts them. Submit the same name again and confirm it updates the row rather than adding one. Then submit once from the groom-side site and confirm that one is labeled Groom.

## Test locally
    python3 -m http.server 8000      # open http://localhost:8000
(RSVP will show the "not available" message until `RSVP_URL` is set; once set, local testing writes to your real sheet.)

## Deploy (Vercel)
Upload the folder (or push to GitHub) and import it in Vercel: framework preset "Other", no build command. Use a **new** Vercel project/domain for this bride-side site, then run `set-site-url.py` with that address.

## Content summary
- Hero: Jessica Dsouza & Shejil Shah (bride first), Friday 18 December 2026, Barka, Sultanate of Oman. The S&J monogram on the door cover and hero is unchanged.
- Family: hosted by Mr. Thomas Dsouza & Mrs. Aslita Dsouza; groom introduced as son of Mr. Shaji Jamal Rawther & Mrs. Shamla Shaji.
- Details: Nikkah & Wedding Ceremonies, 5:00 PM Onwards; countdown targets 2026-12-18 17:00 Asia/Muscat (UTC+4).
- Venue: Nasayem Al Khair, Barka; button uses the original Google Maps link.
- Footer: With Best Compliments, Rebecca.
- WhatsApp image: `assets/og-bride-royal-muscat.jpg` (1200x630, same Royal Muscat artwork, names bride-first). New filename so cached previews are not reused.

## Royal Muscat theme / door-opening cover
Unchanged from the groom-side build: `assets/opening-poster.jpg` + `assets/opening-doors.mp4` (not modified), `#opening` block in `index.html`, cover styles at the end of `styles.css`, cover logic first in `script.js`. Footer video files are unchanged. `assets/music.mp3` plays after opening as before.
