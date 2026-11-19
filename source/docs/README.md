# Skywalk Designs — website source

```
D:\Projects\Skywalk Designs\
├─ New Website\        ← the finished site. Upload ONLY this folder to the host.
└─ source\             ← readable sources + build (never upload this)
   ├─ pages\           page bodies (index, studio, services, projects, contact, 404, projects/*)
   ├─ partials\        head, header (nav + mega menus), footer, overlays (dock, pop-ups, mobile menu), nudge
   ├─ css\             design system: 01-base, 02-components, 03-chrome, 04-sections, 05-motion
   ├─ js\app.js        interaction engine (no libraries)
   ├─ originals\       best-quality brand photos (58) used to generate the WebP images
   ├─ tools\           browser-based WebP converter (images.html / images.js)
   ├─ build\           img-manifest.json (generated image sizes)
   ├─ docs\            this file + IMAGE-SOURCES.md
   └─ build.ps1        the build
```

## Build

```powershell
powershell -ExecutionPolicy Bypass -File source/build.ps1
```

With the final domain (adds canonical links, absolute share images, `sitemap.xml` and the robots sitemap line):

```powershell
powershell -ExecutionPolicy Bypass -File source/build.ps1 -Domain https://www.your-domain.com
```

The build assembles pages from the partials, expands the macros (`{img:key|sizes}` responsive images, `{defer:…}` lazy hero slides, `{big:key}` lightbox URLs, `{i:icon}`, `{mark}`, `{arrow}`), minifies HTML/CSS/JS, adds a content hash for cache-busting, and writes the security/caching config for every common host: `_headers` (Netlify, Cloudflare Pages), `vercel.json` (Vercel) and `.htaccess` (Apache/cPanel).

## Preview locally

Start the "skywalk-new-website" configuration from `.claude/launch.json`, or:

```powershell
powershell -ExecutionPolicy Bypass -File .claude/serve.ps1 -Root "New Website" -Port 5180
```

The local server sends the same Content-Security-Policy as production, so policy problems show up during testing.

## Re-generating images

Add or replace a JPG in `source/originals/<project>/`, list it in `source/tools/originals.json`, start the "skywalk-image-build" configuration, open `http://localhost:5181/source/tools/images.html` and click **Build images**. This writes WebP files at 480/960/1600/2400 px plus the manifest, then run the build.

## Performance

- Images: WebP at up to four widths with `srcset`/`sizes`, lazy-loaded, decoded async, faded in once ready. Only the first hero slide loads up front (preloaded with high priority); the other slides load after the page finishes.
- Motion: only `opacity`/`transform` are animated (GPU). Parallax uses CSS scroll-driven animations (no JavaScript). One passive scroll listener drives everything through a single `requestAnimationFrame`, and off-screen effects are paused with IntersectionObserver.
- CSS ≈ 78 KB and JS ≈ 30 KB before gzip, no frameworks, no third-party scripts. Fonts: Geist, Geist Mono and Instrument Serif from Google Fonts with `display=swap`.

## Security

- Static files only: no server code, database, login, cookies or trackers to attack.
- Strict Content-Security-Policy (scripts only from the site itself; no inline scripts or styles) in a `<meta>` tag on every page *and* in the host headers; HSTS, `X-Frame-Options: DENY` / `frame-ancestors 'none'` (no clickjacking), `nosniff`, a strict referrer policy, Permissions-Policy, COOP/CORP.
- Readable sources live outside the deployed folder; only minified output is published.
- No website can be made literally impossible to inspect: browsers must download HTML/CSS/JS to display them. Minification and keeping sources private is the practical limit.

## Accessibility

Skip link, landmarks, one `h1` per page, labelled controls, native `<dialog>` pop-ups (focus trapped, Esc closes, focus returns), keyboard-operable mega menus, visible focus rings, AA text contrast, and support for reduced motion, reduced transparency, Windows high-contrast and print.

## Content policy & open questions

All facts come from the studio's own public profiles or reputable listings; all photographs are the studio's own uploads (see `IMAGE-SOURCES.md`).

**Domain warning:** `skywalkdesigns.in` redirects to unrelated sites and has no mail records; `skywalkdesigns.com` is an expired Squarespace site. Enquiries therefore go to WhatsApp (+91 95495 99987) and no email is shown. Once a working domain and mailbox exist, add the email and rebuild with `-Domain`.

Confirm with the client before launch:
1. Is Ar. Shashank Jain still a partner?
2. Should Rashi Sharma be added? (No public source confirms her role.)
3. Is the Chitrakoot office still active?
4. Ajmer Road PIN: 302021 (Google) or 302024 (Justdial)?
5. Testimonials are short public review excerpts; swap in client-supplied ones if preferred.
6. Founder portraits, if supplied, can go on the Studio page.
