/**
 * Skywalk Designs — media upload service (Google Apps Script web app).
 *
 * Stores dashboard uploads in Google Drive:
 *   • Project photos  → "Project Media" folder, one sub-folder per project
 *   • Other uploads   → "Others Media" folder (e.g. testimonial photos)
 *
 * Security: every request must carry a valid Firebase ID token from a signed-in,
 * ACTIVE team member (checked with Google Identity Toolkit + the user's profile in
 * the Firebase Realtime Database). Deleting files is limited to Owner/Editor roles and to files inside
 * the two folders above. Requests are rate-limited per user.
 *
 * Deploy: Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
 */

const CONFIG = {
  FIREBASE_API_KEY: 'AIzaSyByWhw4RypHh07E_HrYJeY_bsue8fQdsa8',
  DATABASE_URL: 'https://skywalk-designs-default-rtdb.firebaseio.com',
  PROJECT_MEDIA_FOLDER_ID: '1oUnB1qX2DG63o3UJonMLcbhmoOWfgXP-',
  OTHERS_MEDIA_FOLDER_ID: '16AEgHYbS6EcW0R9ZAwxlj9ew83q6DJek',
  MAX_BYTES: 8 * 1024 * 1024,
  ALLOWED_TYPES: ['image/webp', 'image/jpeg', 'image/png'],
  RATE_LIMIT: 150,           // requests per user …
  RATE_WINDOW_SECONDS: 600   // … per 10 minutes
};

function doGet() {
  return json_({ ok: true, service: 'skywalk-media' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Empty request.');
    if (e.postData.contents.length > CONFIG.MAX_BYTES * 1.4) throw new Error('File is too large.');
    const req = JSON.parse(e.postData.contents);
    const user = verifyUser_(String(req.idToken || ''));
    rateLimit_(user.uid);

    if (req.action === 'upload') return json_(upload_(req, user));
    if (req.action === 'delete') return json_(remove_(req, user));
    throw new Error('Unknown action.');
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- uploads ---------- */
function upload_(req, user) {
  const type = String(req.mimeType || '');
  if (CONFIG.ALLOWED_TYPES.indexOf(type) === -1) throw new Error('Only WebP, JPEG or PNG images are allowed.');
  const bytes = Utilities.base64Decode(String(req.data || ''));
  if (!bytes.length) throw new Error('Empty file.');
  if (bytes.length > CONFIG.MAX_BYTES) throw new Error('File is too large (max 8 MB).');
  if (!looksLikeImage_(bytes, type)) throw new Error('The file is not a valid image.');

  let folder;
  if (req.target === 'project') {
    const pid = String(req.projectId || '');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(pid)) throw new Error('Invalid project id.');
    folder = subFolder_(DriveApp.getFolderById(CONFIG.PROJECT_MEDIA_FOLDER_ID), pid);
  } else if (req.target === 'other') {
    folder = DriveApp.getFolderById(CONFIG.OTHERS_MEDIA_FOLDER_ID);
  } else {
    throw new Error('Invalid upload target.');
  }

  const ext = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';
  const label = String(req.label || 'photo').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';
  const name = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd-HHmmss') + '-' + label + '-' + Utilities.getUuid().slice(0, 8) + '.' + ext;
  const file = folder.createFile(Utilities.newBlob(bytes, type, name));
  file.setDescription('Uploaded via Skywalk dashboard by ' + user.email);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* folder sharing may already cover this */ }

  const id = file.getId();
  return { ok: true, id: id, url: 'https://lh3.googleusercontent.com/d/' + id + '=w1600', thumb: 'https://lh3.googleusercontent.com/d/' + id + '=w640' };
}

/* ---------- deletes (Owner / Editor only) ---------- */
function remove_(req, user) {
  if (['developer', 'owner', 'editor'].indexOf(user.role) === -1) throw new Error('You do not have permission to delete files.');
  const id = String(req.fileId || '');
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) throw new Error('Invalid file id.');
  const file = DriveApp.getFileById(id);
  if (!insideAllowedFolders_(file)) throw new Error('That file is not managed by the dashboard.');
  file.setTrashed(true);
  return { ok: true };
}

/* ---------- auth ---------- */
function verifyUser_(idToken) {
  if (idToken.length < 100) throw new Error('Please sign in again.');
  const look = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + CONFIG.FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (look.getResponseCode() !== 200) throw new Error('Your session has expired. Please sign in again.');
  const acc = (JSON.parse(look.getContentText()).users || [])[0];
  if (!acc || acc.disabled) throw new Error('Account not allowed.');

  if (!/^[A-Za-z0-9]{10,128}$/.test(acc.localId || '')) throw new Error('Account not allowed.');
  const prof = UrlFetchApp.fetch(CONFIG.DATABASE_URL + '/users/' + acc.localId + '.json?auth=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (prof.getResponseCode() !== 200) throw new Error('You are not part of the studio team.');
  const f = JSON.parse(prof.getContentText()) || {};
  const role = f.role;
  const active = f.active === true;
  if (!active || ['developer', 'owner', 'editor', 'contributor'].indexOf(role) === -1) throw new Error('You are not part of the studio team, or your access has been removed.');
  return { uid: acc.localId, email: acc.email || '', role: role };
}

/* ---------- helpers ---------- */
function rateLimit_(uid) {
  const cache = CacheService.getScriptCache();
  const key = 'rl:' + uid;
  const n = Number(cache.get(key) || 0) + 1;
  if (n > CONFIG.RATE_LIMIT) throw new Error('Too many uploads. Please wait a few minutes.');
  cache.put(key, String(n), CONFIG.RATE_WINDOW_SECONDS);
}

function subFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function insideAllowedFolders_(file) {
  const allowed = [CONFIG.PROJECT_MEDIA_FOLDER_ID, CONFIG.OTHERS_MEDIA_FOLDER_ID];
  let level = [file.getParents()];
  for (let depth = 0; depth < 4; depth++) {
    const next = [];
    for (const it of level) {
      while (it.hasNext()) {
        const f = it.next();
        if (allowed.indexOf(f.getId()) > -1) return true;
        next.push(f.getParents());
      }
    }
    level = next;
  }
  return false;
}

function looksLikeImage_(b, type) {
  const u = (i) => (b[i] + 256) % 256;
  if (type === 'image/jpeg') return u(0) === 0xFF && u(1) === 0xD8;
  if (type === 'image/png') return u(0) === 0x89 && u(1) === 0x50 && u(2) === 0x4E && u(3) === 0x47;
  if (type === 'image/webp') return u(0) === 0x52 && u(1) === 0x49 && u(2) === 0x46 && u(3) === 0x46 && u(8) === 0x57 && u(9) === 0x45;
  return false;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
