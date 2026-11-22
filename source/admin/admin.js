/* Skywalk Designs — studio dashboard (Firebase Auth + Realtime Database over REST). All user content is rendered with textContent, never innerHTML. */
import cfg from "./config.js";
import { initializeApp, deleteApp } from "./vendor/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, inMemoryPersistence } from "./vendor/firebase-auth.js";

const app = document.getElementById("app");
const SITE = new URL("../", import.meta.url).href.split("?")[0];
const CATS = [["residential", "Residential"], ["commercial", "Retail & commercial"], ["hospitality", "Hospitality"], ["healthcare", "Healthcare & institutional"], ["details", "Details & craft"], ["visualisation", "3D visualisation"]];
const ROLE_INFO = {
  developer: "Full technical access: everything an owner can do, plus managing owners and the full activity log.",
  owner: "Everything, including adding and removing team members.",
  editor: "Add, edit, publish and delete projects and testimonials.",
  contributor: "Add and edit drafts, then submit them for review. Cannot publish or delete."
};
const ICON = {
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  quote: "M7 7h4v4c0 3-2 5-4 6 M14 7h4v4c0 3-2 5-4 6",
  log: "M12 7v5l3 2 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19 M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.3 M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 18l-6-6 6-6"
};
const MARK = "<svg viewBox='0 0 860 560' fill='currentColor' aria-hidden='true'><path d='M5 307 842 5 323 423Z'/><path d='M347 426 855 13 676 547Z'/></svg>";

/* ---------- tiny DOM helpers (safe by construction) ---------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.appendChild(typeof kid === "string" || typeof kid === "number" ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}
function icon(name) { return h("span", { html: `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='${ICON[name]}'/></svg>` }).firstChild; }
function btn(label, cls, onClick, type) { return h("button", { class: "btn " + (cls || "btn--ink btn--plain"), type: type || "button", onClick }, label); }
function field(id, label, input) { input.id = id; if (!input.placeholder && input.tagName !== "SELECT") input.placeholder = " "; return h("div", { class: "field" + (input.tagName === "SELECT" ? " field--static" : "") }, input, h("label", { for: id, text: label })); }
function mount(...nodes) { app.replaceChildren(...nodes); window.scrollTo(0, 0); }
let toastT = 0;
function toast(msg) {
  const t = document.querySelector("[data-toast]");
  t.querySelector("span").textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("is-show"), 3000);
}
function errText(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
    "auth/email-already-in-use": "An account with this email already exists. Use another email, or remove the old login in the Firebase console first.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "That email address doesn’t look right.",
    "permission-denied": "You don’t have permission to do that.",
    "storage/unauthorized": "You don’t have permission to upload or delete photos."
  };
  if (c.indexOf("api-key") > -1 || c === "auth/configuration-not-found") return "The dashboard isn’t connected to Firebase correctly. Check the settings in the setup guide.";
  if (c === "auth/network-request-failed" || c === "unavailable") return "No internet connection. Please check your connection and try again.";
  if (map[c]) return map[c];
  if (!c && e && e.message && e.message.length < 160) return e.message;
  return "Something went wrong. Please try again.";
}
function slugify(s) { return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "project"; }
function brand(sub) { return h("div", { class: "adm-brand" }, h("span", { class: "nav__badge", html: MARK }), h("div", null, h("b", { text: "SKYWALK" }), h("small", { text: sub || "Studio dashboard" }))); }

/* ---------- setup check ---------- */
const DB = String((cfg && cfg.databaseURL) || "").replace(/\/+$/, "");
if (!cfg || !cfg.projectId || !cfg.apiKey || !/^https:\/\/[a-z0-9-]+\.(firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)$/.test(DB)) {
  mount(h("div", { class: "adm-center" }, h("div", { class: "adm-card adm-card--wide" },
    brand(),
    h("h1", { class: "t-3", text: "Dashboard not connected yet" }),
    h("p", { class: "muted", text: "Add the Firebase project settings to source/firebase/config.json and rebuild the site. The setup guide is in source/docs/DASHBOARD-SETUP.md." }),
    h("a", { class: "btn btn--line btn--plain", href: SITE + "index.html" }, "Back to website")
  )));
  throw new Error("Firebase config missing");
}

const fb = initializeApp(cfg);
const auth = getAuth(fb);
await setPersistence(auth, browserLocalPersistence).catch(() => {});

/* ---------- Realtime Database (REST) ---------- */
const NOW = { ".sv": "timestamp" };
async function rt(method, path, body, params) {
  if (!auth.currentUser) { const e = new Error("Please sign in again."); throw e; }
  const qs = new URLSearchParams(params || {});
  qs.set("auth", await auth.currentUser.getIdToken());
  let res;
  try {
    res = await fetch(DB + "/" + path + ".json?" + qs.toString(), { method, body: body === undefined ? undefined : JSON.stringify(body), credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
  } catch (x) { const e = new Error("offline"); e.code = "unavailable"; throw e; }
  if (res.status === 401 || res.status === 403) { const e = new Error("denied"); e.code = "permission-denied"; throw e; }
  let out = null;
  try { out = await res.json(); } catch (x) { out = null; }
  if (!res.ok) throw new Error((out && out.error && String(out.error).length < 160) ? "Database error: " + out.error : "Something went wrong. Please try again.");
  return out;
}
const dbGet = (p, q) => rt("GET", p, undefined, q);
const dbPut = (p, v) => rt("PUT", p, v);
const dbPatch = (p, v) => rt("PATCH", p, v);
const dbDel = (p) => rt("DELETE", p);
function rows(obj) { return obj && typeof obj === "object" ? Object.keys(obj).map((k) => Object.assign({}, obj[k], { id: k })) : []; }
function newId() {
  const a = new Uint8Array(20);
  crypto.getRandomValues(a);
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Date.now().toString(36) + Array.from(a, (n) => abc[n % 62]).join("").slice(0, 14);
}

const S = { user: null, profile: null, view: "projects", filter: "all" };
const can = {
  publish: () => S.profile && ["developer", "owner", "editor"].includes(S.profile.role),
  team: () => S.profile && ["developer", "owner"].includes(S.profile.role),
  dev: () => S.profile && S.profile.role === "developer"
};
function log(action, target, detail) {
  if (!auth.currentUser) return Promise.resolve();
  const e = { at: NOW, uid: S.user.uid, name: ((S.profile && S.profile.name) || "").slice(0, 120), role: (S.profile && S.profile.role) || "", action, target: String(target || "").slice(0, 200), detail: String(detail || "").slice(0, 500), device: String(navigator.userAgent || "").slice(0, 300) };
  if (S.user.email) e.email = S.user.email;
  return dbPut("logs/" + newId(), e).catch(() => {});
}
function once(key) {
  try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); } catch (x) { return true; }
  return true;
}

/* ---------- auth screens ---------- */
function loginView() {
  const email = h("input", { type: "email", autocomplete: "username", required: true });
  const pass = h("input", { type: "password", autocomplete: "current-password", required: true });
  const err = h("p", { class: "adm-err", role: "alert" });
  const form = h("form", { class: "adm-card", novalidate: true, onSubmit: async (e) => {
    e.preventDefault();
    err.textContent = "";
    submit.disabled = true;
    try { await signInWithEmailAndPassword(auth, email.value.trim(), pass.value); }
    catch (x) { err.textContent = errText(x); submit.disabled = false; }
  } },
    brand("Studio dashboard · Staff only"),
    h("h1", { class: "t-3", text: "Sign in" }),
    field("l-email", "Email", email),
    field("l-pass", "Password", pass),
    err
  );
  const submit = btn("Sign in", "btn--ink btn--plain btn--lg", null, "submit");
  form.append(submit, h("button", { class: "adm-linkbtn", type: "button", onClick: async () => {
    const em = email.value.trim();
    if (!em) { err.textContent = "Enter your email above first, then choose “Forgot password”."; email.focus(); return; }
    try { await sendPasswordResetEmail(auth, em); toast("If that email has an account, a reset link is on its way."); } catch (x) { err.textContent = errText(x); }
  } }, "Forgot password?"), h("a", { class: "adm-linkbtn", href: SITE + "index.html" }, "Back to website"));
  mount(h("div", { class: "adm-center" }, form));
  email.focus();
}

function claimView() {
  const name = h("input", { type: "text", autocomplete: "name", value: S.user.displayName || "" });
  const err = h("p", { class: "adm-err", role: "alert" });
  mount(h("div", { class: "adm-center" }, h("div", { class: "adm-card" },
    brand("First-time setup"),
    h("h1", { class: "t-3", text: "Activate the developer account" }),
    h("p", { class: "muted", text: "This is the first sign-in for " + S.user.email + ". Activating makes this login the dashboard developer (the highest access), who can then add the owner and the team. It works only once, and only for the approved email." }),
    field("c-name", "Your name", name),
    err,
    btn("Activate developer account", "btn--signal btn--plain btn--lg", async () => {
      if (name.value.trim().length < 2) { err.textContent = "Please enter your name."; return; }
      try {
        await dbPatch("", {
          "meta/developer": { uid: S.user.uid, email: S.user.email, createdAt: NOW },
          ["users/" + S.user.uid]: { name: name.value.trim().slice(0, 60), email: S.user.email, role: "developer", active: true, createdAt: NOW, createdBy: S.user.uid, createdByName: name.value.trim().slice(0, 60) }
        });
        await loadProfile();
        log("setup.developer", S.user.email, "Developer account activated");
      } catch (x) { err.textContent = x && x.code === "permission-denied" ? "This login isn’t approved to set up the dashboard." : errText(x); }
    }),
    btn("Sign out", "btn--line btn--plain", () => signOut(auth))
  )));
}

function noAccessView(msg) {
  mount(h("div", { class: "adm-center" }, h("div", { class: "adm-card" },
    brand(),
    h("h1", { class: "t-3", text: "No access" }),
    h("p", { class: "muted", text: msg || "This login isn’t part of the studio team, or it has been deactivated. Ask the studio owner to give you access." }),
    btn("Sign out", "btn--ink btn--plain", () => signOut(auth))
  )));
}

async function loadProfile() {
  const prof = await dbGet("users/" + S.user.uid);
  if (prof && typeof prof === "object") {
    S.profile = Object.assign({}, prof, { id: S.user.uid });
    if (S.profile.active !== true) { if (once("sw-blocked:" + S.user.uid)) log("auth.blocked", S.user.email, "Deactivated login tried to sign in"); noAccessView(); return; }
    if (once("sw-login:" + S.user.uid)) {
      dbPatch("users/" + S.user.uid, { lastLogin: NOW, loginCount: (Number(S.profile.loginCount) || 0) + 1 }).catch(() => {});
      log("auth.signin", S.user.email, "Signed in");
    }
    render();
    return;
  }
  const dev = await dbGet("meta/developer").catch(() => "error");
  if (dev === null) { claimView(); return; }
  noAccessView();
}

onAuthStateChanged(auth, async (u) => {
  S.user = u;
  S.profile = null;
  if (!u) { loginView(); return; }
  try { await loadProfile(); } catch (x) { noAccessView(errText(x)); }
});

/* ---------- shell ---------- */
function render() {
  const items = [["projects", "Projects", "grid"], ["testimonials", "Testimonials", "quote"]];
  if (can.team()) items.push(["team", "Team", "users"], ["activity", "Activity", "log"]);
  items.push(["account", "My account", "user"]);
  const nav = h("nav", { class: "adm-nav", "aria-label": "Dashboard" }, items.map(([id, label, ic]) =>
    h("button", { type: "button", "aria-current": S.view === id ? "page" : null, onClick: () => { S.view = id; render(); } }, icon(ic), label)));
  const main = h("main", { class: "adm-main", id: "main" });
  mount(h("div", { class: "adm-shell" },
    h("aside", { class: "adm-side" }, brand(), nav, h("div", { class: "adm-side__foot" },
      h("div", { class: "adm-me" }, h("b", { text: S.profile.name || S.user.email }), h("span", { class: "adm-badge adm-badge--" + S.profile.role, text: S.profile.role })),
      h("a", { href: SITE + "index.html", target: "_blank", rel: "noopener" }, "View website ↗"),
      h("button", { type: "button", onClick: () => { log("auth.signout", S.user.email, "Signed out").finally(() => signOut(auth)); } }, "Sign out"))),
    main));
  const views = { projects: projectsView, testimonials: testimonialsView, team: teamView, activity: activityView, account: accountView };
  (views[S.view] || projectsView)(main);
}
function head(main, title, sub, ...tools) { main.append(h("div", { class: "adm-head" }, h("div", null, h("h1", { text: title }), sub ? h("p", { text: sub }) : null), h("div", { class: "adm-tools" }, tools))); }
function statusBadge(s) { return h("span", { class: "adm-badge adm-badge--" + s, text: s === "review" ? "In review" : s }); }

/* ---------- projects ---------- */
async function projectsView(main) {
  head(main, "Projects", "Everything published here appears on the website within a minute.", btn("New project", "btn--signal btn--sm", () => projectEditor(null)));
  const tabs = h("div", { class: "adm-tabs", role: "group", "aria-label": "Filter by status" });
  const list = h("div", { class: "adm-grid" }, h("p", { class: "muted", text: "Loading…" }));
  main.append(tabs, list);
  let list0 = [];
  try { list0 = rows(await dbGet("projects")); }
  catch (x) { list.replaceChildren(h("p", { class: "adm-err", text: errText(x) })); return; }
  list0.sort((a, b) => (b.order || 0) - (a.order || 0) || (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  const draw = () => {
    tabs.replaceChildren(...[["all", "All"], ["published", "Published"], ["review", "In review"], ["draft", "Drafts"]].map(([k, l]) =>
      h("button", { type: "button", "aria-pressed": S.filter === k ? "true" : "false", onClick: () => { S.filter = k; draw(); } }, `${l} (${k === "all" ? list0.length : list0.filter((r) => r.status === k).length})`)));
    const shown = list0.filter((r) => S.filter === "all" || r.status === S.filter);
    if (!shown.length) { list.replaceChildren(h("div", { class: "adm-empty" }, h("p", { text: "No projects here yet." }), btn("Add the first project", "btn--ink btn--sm btn--plain", () => projectEditor(null)))); return; }
    list.replaceChildren(...shown.map((p) => {
      const cover = p.images && p.images[0];
      return h("button", { class: "adm-item", type: "button", onClick: () => projectEditor(p) },
        h("span", { class: "adm-item__img" }, cover ? h("img", { src: cover.thumb || cover.url, alt: "", loading: "lazy" }) : "No photo yet"),
        h("span", { class: "adm-item__body" }, h("b", { text: p.title || "Untitled" }),
          h("span", { class: "adm-item__meta" }, statusBadge(p.status || "draft"), p.featured ? h("span", { text: "★ Featured" }) : null, p.year ? h("span", { text: String(p.year) }) : null),
          h("span", { class: "adm-item__meta", text: "Updated by " + (p.updatedByName || "—") })));
    }));
  };
  draw();
}

async function webp(file, maxW, q) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxW / bmp.width);
  const w = Math.round(bmp.width * s);
  const hh = Math.round(bmp.height * s);
  const c = document.createElement("canvas");
  c.width = w; c.height = hh;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, hh);
  bmp.close();
  let blob = await new Promise((r) => c.toBlob(r, "image/webp", q));
  if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
  return { blob, w, h: hh };
}
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(new Error("Could not read the photo."));
    r.readAsDataURL(blob);
  });
}
async function media(payload) {
  if (!cfg.mediaEndpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(cfg.mediaEndpoint)) throw new Error("Photo uploads aren’t connected yet (Apps Script URL missing).");
  payload.idToken = await auth.currentUser.getIdToken();
  const res = await fetch(cfg.mediaEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), redirect: "follow", credentials: "omit" });
  let out = null;
  try { out = await res.json(); } catch (x) { throw new Error("The upload service didn’t respond correctly. Please try again."); }
  if (!out || !out.ok) throw new Error((out && out.error) || "Upload failed.");
  return out;
}
async function driveUpload(blob, target, projectId, label) {
  return media({ action: "upload", target, projectId: projectId || "", label: label || "photo", mimeType: blob.type, data: await toBase64(blob) });
}
function driveDelete(fileId) { return fileId ? media({ action: "delete", fileId }).catch(() => null) : Promise.resolve(null); }
function okDriveUrl(u) { return typeof u === "string" && /^https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]+=w\d+$/.test(u); }

function projectEditor(p) {
  const isNew = !p;
  const id = p ? p.id : newId();
  const data = p ? JSON.parse(JSON.stringify(p)) : { status: "draft", images: [], category: [], featured: false, order: 0 };
  const images = (data.images || []).slice();
  const main = document.getElementById("main");
  main.replaceChildren();
  const err = h("p", { class: "adm-err", role: "alert" });

  const f = {
    title: h("input", { type: "text", maxlength: "90", value: data.title || "", required: true }),
    slug: h("input", { type: "text", maxlength: "70", value: data.slug || "" }),
    year: h("input", { type: "number", min: "1990", max: "2100", value: data.year || "" }),
    location: h("input", { type: "text", maxlength: "80", value: data.location || "Jaipur, Rajasthan" }),
    typology: h("input", { type: "text", maxlength: "80", value: data.typology || "" }),
    scope: h("input", { type: "text", maxlength: "80", value: data.scope || "" }),
    budget: h("input", { type: "text", maxlength: "60", value: data.budget || "" }),
    summary: h("textarea", { maxlength: "260" }),
    story: h("textarea", { maxlength: "6000" }),
    order: h("input", { type: "number", value: data.order || 0 }),
    featured: h("input", { type: "checkbox", checked: data.featured ? true : null }),
    status: h("select", null)
  };
  f.summary.value = data.summary || "";
  f.story.value = data.story || "";
  f.story.rows = 10;
  const statuses = can.publish() ? [["draft", "Draft (hidden)"], ["review", "Ready for review"], ["published", "Published (live)"]] : [["draft", "Draft (hidden)"], ["review", "Submit for review"]];
  statuses.forEach(([v, l]) => f.status.append(h("option", { value: v, selected: data.status === v ? true : null }, l)));
  if (!can.publish() && data.status === "published") { f.status.replaceChildren(h("option", { value: "published" }, "Published (editors only)")); f.status.disabled = true; }
  let slugTouched = !!data.slug;
  f.slug.addEventListener("input", () => { slugTouched = true; });
  f.title.addEventListener("input", () => { if (!slugTouched) f.slug.value = slugify(f.title.value); });
  const cats = h("div", { class: "chips" }, CATS.map(([v, l]) => h("label", { class: "choice" }, h("input", { type: "checkbox", value: v, checked: (data.category || []).includes(v) ? true : null }), h("span", { text: l }))));

  const imgGrid = h("div", { class: "adm-imgs" });
  const drawImgs = () => {
    imgGrid.replaceChildren(...images.map((im, i) => {
      const cap = h("input", { type: "text", maxlength: "120", value: im.caption || "", placeholder: "Caption (shown in the gallery)", "aria-label": "Caption for photo " + (i + 1) });
      cap.addEventListener("input", () => { im.caption = cap.value; });
      const move = (d) => { const j = i + d; if (j < 0 || j >= images.length) return; [images[i], images[j]] = [images[j], images[i]]; drawImgs(); };
      return h("div", { class: "adm-img" },
        h("div", { class: "adm-img__pic" }, h("img", { src: im.thumb || im.url, alt: "" }), i === 0 ? h("span", { class: "adm-badge adm-badge--owner adm-img__cover", text: "Cover" }) : null, im.progress !== undefined && im.progress < 1 ? h("div", { class: "adm-progress" }, h("span", { style: null })) : null),
        cap,
        h("div", { class: "adm-img__tools" },
          h("button", { type: "button", disabled: i === 0 ? true : null, onClick: () => move(-1), "aria-label": "Move photo earlier" }, "←"),
          h("button", { type: "button", disabled: i === 0 ? true : null, onClick: () => { images.unshift(images.splice(i, 1)[0]); drawImgs(); } }, "Cover"),
          h("button", { type: "button", disabled: i === images.length - 1 ? true : null, onClick: () => move(1), "aria-label": "Move photo later" }, "→"),
          h("button", { type: "button", class: "adm-danger", onClick: () => { removed.push(images.splice(i, 1)[0]); drawImgs(); } }, "Remove")));
    }));
  };
  const removed = [];
  const prog = h("p", { class: "adm-hint", "aria-live": "polite" });
  const fileIn = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp", multiple: true, "aria-label": "Add photos" });
  const drop = h("label", { class: "adm-drop" }, icon("upload"), h("b", { text: "Add photos" }), h("span", { class: "adm-hint", text: "Drop images here or click to choose. They’re compressed automatically and saved to the studio’s Google Drive." }), fileIn);
  const addFiles = async (files) => {
    const list = Array.from(files).filter((x) => /^image\//.test(x.type));
    for (let k = 0; k < list.length; k++) {
      const file = list[k];
      prog.textContent = `Processing photo ${k + 1} of ${list.length}…`;
      try {
        const big = await webp(file, 1800, 0.82);
        prog.textContent = `Uploading photo ${k + 1} of ${list.length} to Google Drive…`;
        const up = await driveUpload(big.blob, "project", id, f.slug.value || f.title.value);
        if (!okDriveUrl(up.url)) throw new Error("Upload returned an unexpected address.");
        images.push({ id: up.id, url: up.url, thumb: up.thumb, w: big.w, h: big.h, caption: "", name: String(file.name || "").slice(0, 200), bytes: big.blob.size, uploadedAt: Date.now(), uploadedBy: S.user.uid });
        log("photo.upload", f.title.value || id, (file.name || "photo") + " → Drive " + up.id);
        drawImgs();
      } catch (x) { err.textContent = errText(x); }
    }
    prog.textContent = list.length ? "Photos added. Remember to save." : "";
    fileIn.value = "";
  };
  fileIn.addEventListener("change", () => addFiles(fileIn.files));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-over"); addFiles(e.dataTransfer.files); });
  drawImgs();

  const save = async () => {
    err.textContent = "";
    const title = f.title.value.trim();
    if (title.length < 2) { err.textContent = "Please enter a project title."; f.title.focus(); return; }
    let slug = slugify(f.slug.value || title);
    if (images.length > 60) { err.textContent = "A project can have up to 60 photos. Please remove a few."; return; }
    const clash = await dbGet("projects", { orderBy: JSON.stringify("slug"), equalTo: JSON.stringify(slug) }).catch(() => null);
    if (clash && Object.keys(clash).some((k) => k !== id)) slug = slug + "-" + id.slice(-4).toLowerCase().replace(/[^a-z0-9]/g, "x");
    const yr = Number(f.year.value);
    const out = {
      title, slug,
      year: f.year.value && yr >= 1990 && yr <= 2100 ? Math.round(yr) : null,
      location: f.location.value.trim(), typology: f.typology.value.trim(), scope: f.scope.value.trim(), budget: f.budget.value.trim(),
      summary: f.summary.value.trim(), story: f.story.value.trim(),
      category: Array.from(cats.querySelectorAll("input:checked")).map((c) => c.value),
      images: images.map((im) => ({ id: im.id || "", url: im.url, thumb: im.thumb || im.url, w: im.w || 1600, h: im.h || 1200, caption: (im.caption || "").trim().slice(0, 120), name: im.name || null, bytes: im.bytes || null, uploadedAt: im.uploadedAt || null, uploadedBy: im.uploadedBy || null })),
      featured: f.featured.checked, order: Math.max(-100000, Math.min(100000, Number(f.order.value) || 0)),
      status: f.status.disabled ? data.status : f.status.value,
      updatedAt: NOW, updatedBy: S.user.uid, updatedByName: (S.profile.name || S.user.email).slice(0, 120)
    };
    out.createdAt = isNew ? NOW : data.createdAt;
    out.createdBy = isNew ? S.user.uid : data.createdBy;
    out.createdByName = isNew ? out.updatedByName : (data.createdByName || null);
    out.publishedAt = out.status === "published" ? (data.status === "published" && data.publishedAt ? data.publishedAt : NOW) : (data.publishedAt || null);
    try {
      await dbPut("projects/" + id, out);
      log(isNew ? "project.create" : "project.update", title, "Status: " + out.status + " · " + out.images.length + " photos" + (removed.length ? " · " + removed.length + " removed" : ""));
      if (can.publish()) for (const im of removed) { await driveDelete(im.id); log("photo.delete", title, "Drive " + (im.id || "?")); }
      toast(out.status === "published" ? "Saved and live on the website" : "Saved");
      S.view = "projects"; render();
    } catch (x) { err.textContent = errText(x); }
  };
  const del = async () => {
    if (!confirm("Delete “" + (data.title || "this project") + "” and its photos permanently? This cannot be undone.")) return;
    try {
      await dbDel("projects/" + id);
      log("project.delete", data.title || id, images.concat(removed).length + " photos moved to Drive bin");
      for (const im of images.concat(removed)) await driveDelete(im.id);
      toast("Project deleted"); S.view = "projects"; render();
    } catch (x) { err.textContent = errText(x); }
  };

  main.append(
    h("div", { class: "adm-head" }, h("div", null, h("button", { class: "adm-linkbtn", type: "button", onClick: () => render() }, "← All projects"), h("h1", { text: isNew ? "New project" : (data.title || "Edit project") })),
      h("div", { class: "adm-tools" }, btn("Save project", "btn--signal btn--sm", save))),
    h("div", { class: "adm-editor" },
      h("div", { class: "adm-editor__main" },
        h("section", { class: "adm-panel" }, h("h2", { text: "Basics" }),
          field("p-title", "Project title *", f.title),
          h("div", { class: "adm-cols adm-cols--2" }, field("p-slug", "Web address (auto)", f.slug), field("p-year", "Year", f.year)),
          h("div", { class: "adm-cols adm-cols--2" }, field("p-loc", "Location", f.location), field("p-typ", "Typology (e.g. Private residence)", f.typology)),
          h("div", { class: "adm-cols adm-cols--2" }, field("p-scope", "Scope (e.g. Interior design)", f.scope), field("p-budget", "Budget band (optional)", f.budget))),
        h("section", { class: "adm-panel" }, h("h2", { text: "Story" }),
          field("p-sum", "Short summary (one or two sentences, shown on cards)", f.summary),
          field("p-story", "Full story (leave an empty line between paragraphs)", f.story)),
        h("section", { class: "adm-panel" }, h("h2", { text: "Photos" }), h("p", { text: "The first photo is the cover. Add captions so visitors know what they’re looking at." }), drop, prog, imgGrid)),
      h("div", { class: "adm-editor__side" },
        h("section", { class: "adm-panel" }, h("h2", { text: "Publishing" }),
          field("p-status", "Status", f.status),
          can.publish() ? null : h("p", { class: "adm-hint", text: "An editor or the owner will review and publish your project." }),
          h("label", { class: "adm-check" }, f.featured, "Feature on the home page"),
          field("p-order", "Sort order (higher shows first)", f.order),
          err,
          h("div", { class: "adm-actions" }, btn("Save project", "btn--ink btn--plain", save), !isNew && can.publish() ? btn("Delete", "btn--danger btn--plain btn--sm", del) : null),
          !isNew && data.status === "published" ? h("a", { class: "adm-linkbtn", href: SITE + "project.html?p=" + encodeURIComponent(data.slug || ""), target: "_blank", rel: "noopener" }, "View on website ↗") : null),
        h("section", { class: "adm-panel" }, h("h2", { text: "Categories" }), h("p", { text: "Used by the filters on the Projects page." }), cats)))
  );
  f.title.focus();
}

/* ---------- testimonials ---------- */
async function testimonialsView(main) {
  head(main, "Testimonials", "Client quotes shown on the home page. Only publish quotes the client has agreed to share.", btn("New testimonial", "btn--signal btn--sm", () => testimonialEditor(main, null)));
  const list = h("div", { class: "adm-list" }, h("p", { class: "muted", text: "Loading…" }));
  main.append(list);
  try {
    const tl = rows(await dbGet("testimonials")).sort((a, b) => (b.order || 0) - (a.order || 0));
    if (!tl.length) { list.replaceChildren(h("div", { class: "adm-empty" }, h("p", { text: "No testimonials yet." }))); return; }
    list.replaceChildren(...tl.map((t) => h("div", { class: "adm-row" },
      h("div", null, h("b", { text: "“" + (t.quote || "").slice(0, 120) + ((t.quote || "").length > 120 ? "…" : "") + "”" }), h("small", { text: (t.name || "—") + " · " + (t.source || "") })),
      statusBadge(t.status || "draft"),
      h("div", { class: "adm-row__actions" }, btn("Edit", "btn--line btn--sm btn--plain", () => testimonialEditor(main, t))))));
  } catch (x) { list.replaceChildren(h("p", { class: "adm-err", text: errText(x) })); }
}
function testimonialEditor(main, t) {
  const isNew = !t;
  const id = t ? t.id : newId();
  const d = t || { status: "draft", rating: 5, order: 0 };
  const quote = h("textarea", { maxlength: "400" }); quote.value = d.quote || ""; quote.rows = 4;
  const name = h("input", { type: "text", maxlength: "60", value: d.name || "" });
  const source = h("input", { type: "text", maxlength: "60", value: d.source || "" });
  const rating = h("select", null, [5, 4, 3, 2, 1].map((n) => h("option", { value: n, selected: Number(d.rating || 5) === n ? true : null }, n + " stars")));
  const order = h("input", { type: "number", value: d.order || 0 });
  const status = h("select", null, (can.publish() ? [["draft", "Draft (hidden)"], ["review", "Ready for review"], ["published", "Published (live)"]] : [["draft", "Draft (hidden)"], ["review", "Submit for review"]]).map(([v, l]) => h("option", { value: v, selected: d.status === v ? true : null }, l)));
  if (!can.publish() && d.status === "published") { status.replaceChildren(h("option", { value: "published" }, "Published (editors only)")); status.disabled = true; }
  const err = h("p", { class: "adm-err", role: "alert" });
  let photo = d.photo && okDriveUrl(d.photo) ? { id: d.photoId || "", url: d.photo } : null;
  const oldPhotoId = d.photoId || "";
  const photoBox = h("div", { class: "adm-actions" });
  const photoIn = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp", "aria-label": "Client photo" });
  const drawPhoto = () => photoBox.replaceChildren(
    photo ? h("img", { src: photo.url, alt: "", width: "64", height: "64", class: "adm-avatar" }) : h("span", { class: "adm-hint", text: "No photo (optional)" }),
    h("label", { class: "btn btn--line btn--sm btn--plain adm-file" }, photo ? "Replace photo" : "Add client photo", photoIn),
    photo ? btn("Remove", "btn--danger btn--sm btn--plain", () => { photo = null; drawPhoto(); }) : null);
  photoIn.addEventListener("change", async () => {
    const file = photoIn.files[0];
    if (!file) return;
    err.textContent = "Uploading photo…";
    try {
      const sm = await webp(file, 400, 0.85);
      const up = await driveUpload(sm.blob, "other", "", "testimonial-" + (name.value || "client"));
      if (!okDriveUrl(up.thumb)) throw new Error("Upload returned an unexpected address.");
      photo = { id: up.id, url: up.url.replace(/=w\d+$/, "=w400") };
      log("photo.upload", "Testimonial: " + (name.value || "client"), (file.name || "photo") + " → Drive " + up.id);
      err.textContent = "";
      drawPhoto();
    } catch (x) { err.textContent = errText(x); }
    photoIn.value = "";
  });
  drawPhoto();
  const save = async () => {
    if (quote.value.trim().length < 5 || name.value.trim().length < 2) { err.textContent = "Please add the quote and the client’s name."; return; }
    const out = { quote: quote.value.trim(), name: name.value.trim(), source: source.value.trim(), rating: Number(rating.value), order: Math.max(-100000, Math.min(100000, Number(order.value) || 0)), status: status.disabled ? d.status : status.value, photo: photo ? photo.url : "", photoId: photo ? photo.id : "", updatedAt: NOW, updatedBy: S.user.uid, updatedByName: (S.profile.name || S.user.email).slice(0, 120) };
    out.createdAt = isNew ? NOW : d.createdAt;
    out.createdBy = isNew ? S.user.uid : d.createdBy;
    out.createdByName = isNew ? out.updatedByName : (d.createdByName || null);
    try {
      await dbPut("testimonials/" + id, out);
      log(isNew ? "testimonial.create" : "testimonial.update", out.name, "Status: " + out.status + " · " + out.rating + " stars");
      if (oldPhotoId && oldPhotoId !== out.photoId && can.publish()) driveDelete(oldPhotoId);
      toast("Saved"); render();
    } catch (x) { err.textContent = errText(x); }
  };
  const del = async () => { if (!confirm("Delete this testimonial permanently?")) return; try { await dbDel("testimonials/" + id); log("testimonial.delete", d.name || id, ""); driveDelete(oldPhotoId); toast("Deleted"); render(); } catch (x) { err.textContent = errText(x); } };
  main.replaceChildren(
    h("div", { class: "adm-head" }, h("div", null, h("button", { class: "adm-linkbtn", type: "button", onClick: () => render() }, "← All testimonials"), h("h1", { text: isNew ? "New testimonial" : "Edit testimonial" }))),
    h("section", { class: "adm-panel" },
      field("t-quote", "Quote *", quote),
      h("div", { class: "adm-cols adm-cols--2" }, field("t-name", "Client name *", name), field("t-source", "Source (e.g. Google review, 2025)", source)),
      h("div", { class: "adm-cols adm-cols--3" }, field("t-rating", "Rating", rating), field("t-status", "Status", status), field("t-order", "Sort order", order)),
      photoBox,
      err,
      h("div", { class: "adm-actions" }, btn("Save testimonial", "btn--ink btn--plain", save), !isNew && can.publish() ? btn("Delete", "btn--danger btn--plain btn--sm", del) : null)));
  quote.focus();
}

/* ---------- team (developer + owner) ---------- */
const RANK = { developer: 4, owner: 3, editor: 2, contributor: 1 };
const cap = (r) => r ? r[0].toUpperCase() + r.slice(1) : "";
function assignable() { return can.dev() ? ["contributor", "editor", "owner"] : ["contributor", "editor"]; }
function canManage(u) { return u.id !== S.user.uid && u.role !== "developer" && (can.dev() || u.role === "editor" || u.role === "contributor"); }
function when(ts) { return ts ? new Date(Number(ts)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"; }

async function teamView(main) {
  if (!can.team()) { S.view = "projects"; render(); return; }
  head(main, "Team", "Create logins for your team and choose what each person can do.");
  const name = h("input", { type: "text", maxlength: "60" });
  const email = h("input", { type: "email", maxlength: "120" });
  const pass = h("input", { type: "text", minlength: "8", maxlength: "64" });
  const role = h("select", null, assignable().map((r) => h("option", { value: r }, cap(r))));
  const err = h("p", { class: "adm-err", role: "alert" });
  const ok = h("p", { class: "adm-ok", "aria-live": "polite" });
  const genPass = () => { const a = new Uint32Array(3); crypto.getRandomValues(a); pass.value = "Sky-" + Array.from(a, (n) => n.toString(36)).join("").slice(0, 10); };
  genPass();
  const list = h("div", { class: "adm-list" });
  const add = async () => {
    err.textContent = ""; ok.textContent = "";
    if (name.value.trim().length < 2) { err.textContent = "Enter the team member’s name."; return; }
    if (pass.value.length < 8) { err.textContent = "Temporary password must be at least 8 characters."; return; }
    let sec = null;
    try {
      sec = initializeApp(cfg, "worker-" + Date.now());
      const sAuth = getAuth(sec);
      await setPersistence(sAuth, inMemoryPersistence);
      const cred = await createUserWithEmailAndPassword(sAuth, email.value.trim(), pass.value);
      await signOut(sAuth);
      const prof = { name: name.value.trim().slice(0, 60), email: cred.user.email || email.value.trim(), role: role.value, active: true, createdAt: NOW, createdBy: S.user.uid, createdByName: (S.profile.name || S.user.email).slice(0, 120) };
      await dbPut("users/" + cred.user.uid, prof);
      log("team.create", prof.email, "Role: " + prof.role);
      ok.textContent = `Account created. Share the login privately: ${prof.email} / ${pass.value}. They can change the password with “Forgot password?”.`;
      name.value = ""; email.value = ""; genPass();
      loadTeam();
    } catch (x) { err.textContent = errText(x); }
    finally { if (sec) deleteApp(sec).catch(() => {}); }
  };
  const stamp = () => ({ updatedAt: NOW, updatedBy: S.user.uid });
  const loadTeam = async () => {
    list.replaceChildren(h("p", { class: "muted", text: "Loading…" }));
    try {
      const team = rows(await dbGet("users")).sort((a, b) => (RANK[b.role] || 0) - (RANK[a.role] || 0) || String(a.name).localeCompare(String(b.name)));
      list.replaceChildren(...team.map((u) => {
        const self = u.id === S.user.uid;
        const sel = h("select", { "aria-label": "Role for " + (u.name || u.email) }, assignable().map((r) => h("option", { value: r, selected: u.role === r ? true : null }, cap(r))));
        sel.addEventListener("change", async () => { try { await dbPatch("users/" + u.id, Object.assign({ role: sel.value }, stamp())); log("team.role", u.email, cap(u.role) + " → " + cap(sel.value)); toast("Role updated"); loadTeam(); } catch (x) { toast(errText(x)); } });
        return h("div", { class: "adm-row" },
          h("div", null, h("b", { text: (u.name || "—") + (self ? " (you)" : "") }), h("small", { text: [u.email, u.phone].filter(Boolean).join(" · ") }),
            h("small", { text: "Last sign-in: " + when(u.lastLogin) + (u.loginCount ? " · " + u.loginCount + " sign-ins" : "") + " · Added " + when(u.createdAt) + (u.createdByName ? " by " + u.createdByName : "") })),
          h("div", { class: "adm-tools" }, h("span", { class: "adm-badge adm-badge--" + (u.active ? u.role : "off"), text: u.active ? u.role : "deactivated" })),
          !canManage(u) ? h("span") : h("div", { class: "adm-row__actions" }, sel,
            btn(u.active ? "Deactivate" : "Reactivate", "btn--line btn--sm btn--plain", async () => { try { await dbPatch("users/" + u.id, Object.assign({ active: !u.active }, stamp())); log(u.active ? "team.deactivate" : "team.reactivate", u.email, ""); toast(u.active ? "Access removed" : "Access restored"); loadTeam(); } catch (x) { toast(errText(x)); } }),
            btn("Remove", "btn--danger btn--sm btn--plain", async () => { if (!confirm("Remove " + (u.name || u.email) + " from the team? Their login will stop working.")) return; try { await dbDel("users/" + u.id); log("team.remove", u.email, "Role was " + u.role); toast("Removed"); loadTeam(); } catch (x) { toast(errText(x)); } })));
      }));
    } catch (x) { list.replaceChildren(h("p", { class: "adm-err", text: errText(x) })); }
  };
  main.append(
    h("div", { class: "adm-editor" },
      h("div", { class: "adm-editor__main" }, h("section", { class: "adm-panel" }, h("h2", { text: "Team members" }), list)),
      h("div", { class: "adm-editor__side" },
        h("section", { class: "adm-panel" }, h("h2", { text: "Add a team member" }),
          field("w-name", "Name", name), field("w-email", "Email (their login)", email),
          field("w-pass", "Temporary password", pass), h("button", { class: "adm-linkbtn", type: "button", onClick: genPass }, "Generate a new password"),
          field("w-role", "Role", role), err, ok, btn("Create account", "btn--ink btn--plain", add)),
        h("section", { class: "adm-panel" }, h("h2", { text: "What each role can do" }),
          h("div", { class: "adm-roles" }, Object.entries(ROLE_INFO).map(([r, t]) => h("p", null, h("b", { text: cap(r) + ": " }), t)))))));
  loadTeam();
}

/* ---------- activity log (developer + owner) ---------- */
async function activityView(main) {
  if (!can.team()) { S.view = "projects"; render(); return; }
  main.replaceChildren();
  head(main, "Activity", "Every sign-in, change and upload is recorded here. Entries can’t be edited.");
  const list = h("div", { class: "adm-list" }, h("p", { class: "muted", text: "Loading…" }));
  main.append(list);
  try {
    const items = rows(await dbGet("logs", { orderBy: JSON.stringify("at"), limitToLast: "300" })).sort((a, b) => (b.at || 0) - (a.at || 0));
    if (!items.length) { list.replaceChildren(h("div", { class: "adm-empty" }, h("p", { text: "No activity yet." }))); return; }
    list.replaceChildren(...items.map((e) => h("div", { class: "adm-row" },
      h("div", null, h("b", { text: (e.name || e.email || "—") + " · " + (e.action || "") }), h("small", { text: [e.target, e.detail].filter(Boolean).join(" — ") })),
      h("small", { text: when(e.at) }),
      can.dev() ? h("div", { class: "adm-row__actions" }, btn("Delete", "btn--line btn--sm btn--plain", async () => { try { await dbDel("logs/" + e.id); activityView(main); } catch (x) { toast(errText(x)); } })) : h("span"))));
  } catch (x) { list.replaceChildren(h("p", { class: "adm-err", text: errText(x) })); }
}

/* ---------- account ---------- */
function accountView(main) {
  head(main, "My account", S.user.email);
  const name = h("input", { type: "text", maxlength: "60", value: S.profile.name || "" });
  const phone = h("input", { type: "tel", maxlength: "30", value: S.profile.phone || "" });
  main.append(h("section", { class: "adm-panel" },
    h("p", null, "Role: ", h("span", { class: "adm-badge adm-badge--" + S.profile.role, text: S.profile.role })),
    h("p", { class: "adm-hint", text: ROLE_INFO[S.profile.role] || "" }),
    h("p", { class: "adm-hint", text: "Last sign-in: " + when(S.profile.lastLogin) + " · Account created " + when(S.profile.createdAt) }),
    h("div", { class: "adm-cols adm-cols--2" }, field("a-name", "Your name", name), field("a-phone", "Phone (optional)", phone)),
    h("div", { class: "adm-actions" },
      btn("Save details", "btn--ink btn--plain", async () => {
        try {
          if (!name.value.trim()) { toast("Please enter your name."); return; }
          await dbPatch("users/" + S.user.uid, { name: name.value.trim().slice(0, 60), phone: phone.value.trim().slice(0, 30) });
          S.profile.name = name.value.trim(); S.profile.phone = phone.value.trim();
          log("account.update", S.user.email, "Name/phone updated");
          toast("Saved"); render();
        } catch (x) { toast(errText(x)); }
      }),
      btn("Email me a password reset link", "btn--line btn--plain", async () => { try { await sendPasswordResetEmail(auth, S.user.email); log("account.reset", S.user.email, "Password reset email requested"); toast("Reset link sent to " + S.user.email); } catch (x) { toast(errText(x)); } }),
      btn("Sign out", "btn--line btn--plain", () => { log("auth.signout", S.user.email, "Signed out").finally(() => signOut(auth)); }))));
}
