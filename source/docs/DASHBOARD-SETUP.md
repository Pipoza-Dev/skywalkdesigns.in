# Studio dashboard — setup guide

The website has a private dashboard at **`/admin/`** (a faint lock icon at the very bottom of the footer).
The owner and team sign in there to add projects and testimonials. Published items appear on the website
within a couple of minutes.

- **Logins, roles and content** → Firebase (Authentication + Realtime Database `skywalk-designs-default-rtdb`), project `skywalk-designs`
- **Photos** → the studio's Google Drive, via a Google Apps Script:
  - *Project Media* folder `1oUnB1qX2DG63o3UJonMLcbhmoOWfgXP-` (one sub-folder per project)
  - *Others Media* folder `16AEgHYbS6EcW0R9ZAwxlj9ew83q6DJek` (testimonial photos, etc.)

| Role | Can do |
|---|---|
| Developer | Everything, plus creating/managing Owners and deleting activity entries. Set up once for the approved developer email; can't be changed or removed from the dashboard |
| Owner | Everything, including creating, deactivating and removing Editors and Contributors, and viewing the activity log |
| Editor | Add, edit, publish and delete projects and testimonials (and their photos) |
| Contributor | Add and edit drafts, upload photos, submit for review. Cannot publish or delete |

Roles are enforced on Google's servers (database rules + the Apps Script), not only in the dashboard.

---

## Already done
- ✅ Firebase project created and web settings added to `source/firebase/config.json`
- ✅ Email/Password sign-in enabled (verified: the dashboard talks to it correctly)
- ✅ Realtime Database created (verified: reachable, currently fully locked)

## Remaining steps

### 1. (Nothing to do — the Realtime Database already exists.)

### 2. Publish the database rules
Firebase console → **Build → Realtime Database → Rules** tab → delete everything → paste `source/firebase/database.rules.json` →
replace `DEVELOPER_EMAIL` with the developer's login email **in lower case** (it appears once) → **Publish**.
(A ready copy with the email filled in is kept locally at `source/firebase/database.rules.private.json`; it is not committed.)
The Owner is not set up here: the Developer creates the Owner's login from **Team** in the dashboard.

Everything is stored in the database: projects (with photo file names, sizes, uploader and dates), testimonials, team profiles (who added them, last sign-in, sign-in count, phone), and an **activity log** of every sign-in, change, upload and deletion (`/logs`, append-only).
Until this is done, the database refuses every read and write, so the dashboard can't save anything.

### 3. Create the owner login
Authentication → **Users → Add user** → the owner's email + a strong password.

### 4. Allow the website's address
Authentication → **Settings → Authorized domains → Add domain** → `pipoza-dev.github.io`
(later also the final domain, e.g. `skywalkdesigns.in`).

### 5. Deploy the upload script (Google Apps Script)
Use the **same Google account that owns the two Drive folders**.
1. Go to https://script.google.com → **New project** → name it `Skywalk Media`.
2. Replace the contents of `Code.gs` with `source/google-apps-script/Code.gs`.
3. ⚙ **Project Settings** → tick *Show "appsscript.json" manifest file* → open `appsscript.json` and replace it with `source/google-apps-script/appsscript.json`.
4. **Deploy → New deployment** → type **Web app** → *Execute as:* **Me** → *Who has access:* **Anyone** → **Deploy** → allow the permissions (Drive + external requests).
5. Copy the **Web app URL** (it ends in `/exec`).

"Anyone" only means the URL can be reached: every request is rejected unless it carries a valid sign-in from an active team member.
If you later edit the script, use **Deploy → Manage deployments → Edit → New version**, so the URL stays the same.

### 6. Send me the last two settings
- the owner's email → `ownerEmail`
- the Apps Script Web app URL → `mediaEndpoint`

I'll add them to `source/firebase/config.json`, rebuild and push.

### 7. Activate the owner
Open `https://pipoza-dev.github.io/skywalkdesigns.in/admin/` → sign in with the owner login → **Activate owner account** (this works once, only for that email).

### 8. Recommended: restrict the API key
Google Cloud console → APIs & Services → Credentials → the *Browser key* → *Application restrictions: Websites* →
`https://pipoza-dev.github.io/*`, `http://localhost:5180/*` (and the final domain later). Under *API restrictions*, allow
Identity Toolkit API and Token Service API (the database is reached directly and doesn't use the key).
Then, in the same Credentials screen, keep an unrestricted copy **only** if the Apps Script stops working (the script calls the Identity Toolkit API with this key, server-to-server). If it does, create a second key for the script restricted to *Identity Toolkit API* and put it in `Code.gs`.

---

## Everyday use
- **Add a project:** Projects → *New project* → details → drop in photos (compressed automatically and saved to *Project Media / <project id>*) → status *Published* → *Save*. The first photo is the cover; tick *Feature on the home page* to show it in the home showcase.
- **Contributors** save drafts or *Submit for review*; an editor or the owner publishes.
- **Testimonials:** optional client photo (saved to *Others Media*). Only publish quotes the client agreed to share.
- **Team:** create a login (a temporary password is generated; share it privately). Team members can set their own password via *Forgot password?*. *Deactivate* removes access instantly and can be undone; *Remove* deletes the team profile (to reuse that email later, also delete the user under Authentication → Users).
- **Deleting** a project or photo (Owner/Editor) moves the Drive files to the Drive *Bin*, so they can be recovered for 30 days.

## Security summary
- Public visitors can read **only** published projects/testimonials; everything else is private.
- Every database write is validated (allowed fields, types, lengths, status values, author stamps); nobody can promote themselves; the owner can't be demoted or removed; unknown collections are denied.
- Uploads: only signed-in, active team members; images only (type and file signature checked); max 8 MB; rate-limited; deletes only by Owner/Editor and only inside the two folders.
- The website's Content-Security-Policy only allows images from the site itself and Google Drive's image server.
