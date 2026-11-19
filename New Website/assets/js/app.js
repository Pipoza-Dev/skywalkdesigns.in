(function () {
"use strict";
var doc = document;
var root = doc.documentElement;
var body = doc.body;
var CFG = { wa: "919549599987", tz: "Asia/Kolkata", open: 9, close: 19, days: [1, 2, 3, 4, 5, 6] };
var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
var hasIO = "IntersectionObserver" in window;
function $(s, c) { return (c || doc).querySelector(s); }
function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function raf2(fn) {
var done = false;
var run = function () { if (!done) { done = true; fn(); } };
requestAnimationFrame(function () { requestAnimationFrame(run); });
setTimeout(run, 80);
}
root.classList.add("ready");
var scrollFns = [];
var resizeFns = [];
var ticking = false;
var sy = window.scrollY;
var vh = window.innerHeight;
var vw = window.innerWidth;
function runScroll() { ticking = false; for (var i = 0; i < scrollFns.length; i++) { scrollFns[i](sy); } }
window.addEventListener("scroll", function () { sy = window.scrollY; if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } }, { passive: true });
var rTimer = 0;
window.addEventListener("resize", function () {
clearTimeout(rTimer);
rTimer = setTimeout(function () {
if (Math.abs(window.innerWidth - vw) < 2 && Math.abs(window.innerHeight - vh) < 120) { vh = window.innerHeight; return; }
vh = window.innerHeight; vw = window.innerWidth;
for (var i = 0; i < resizeFns.length; i++) { resizeFns[i](); }
runScroll();
}, 140);
}, { passive: true });
function watch(el, cb, margin) {
if (!hasIO) { cb(true); return; }
new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { rootMargin: margin || "0px" }).observe(el);
}
$$("img[loading='lazy']").forEach(function (img) {
var done = function () { img.classList.add("is-loaded"); };
if (img.complete && img.naturalWidth) { done(); } else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
});
function loadDeferred(img) {
if (!img || !img.getAttribute("data-src")) { return; }
if (img.getAttribute("data-srcset")) { img.srcset = img.getAttribute("data-srcset"); img.removeAttribute("data-srcset"); }
img.src = img.getAttribute("data-src");
img.removeAttribute("data-src");
}
window.addEventListener("load", function () { setTimeout(function () { $$("img[data-src]").forEach(loadDeferred); }, 400); });
$$("[data-stagger]").forEach(function (g) { Array.prototype.forEach.call(g.children, function (el, i) { el.style.setProperty("--i", i % 8); }); });
function countUp(el) {
var raw = el.getAttribute("data-count");
var to = parseFloat(raw);
var dec = (raw.split(".")[1] || "").length;
var from = parseFloat(el.getAttribute("data-from") || "0");
var out = $("[data-num]", el) || el;
if (reduce || isNaN(to)) { return; }
var t0 = 0;
var dur = 1700;
var step = function (t) {
if (!t0) { t0 = t; }
var p = clamp((t - t0) / dur, 0, 1);
var e = 1 - Math.pow(1 - p, 4);
out.textContent = (from + (to - from) * e).toFixed(dec);
if (p < 1) { requestAnimationFrame(step); }
};
out.textContent = from.toFixed(dec);
requestAnimationFrame(step);
}
var revealEls = $$(".rv, .rv-fade, .rv-img, .footer__word, [data-count]");
if (hasIO && !reduce) {
var rio = new IntersectionObserver(function (es) {
es.forEach(function (e) {
if (!e.isIntersecting) { return; }
e.target.classList.add("is-in");
if (e.target.hasAttribute("data-count")) { countUp(e.target); }
rio.unobserve(e.target);
});
}, { rootMargin: "0px 0px -7% 0px", threshold: 0.1 });
revealEls.forEach(function (el) { rio.observe(el); });
} else {
revealEls.forEach(function (el) { el.classList.add("is-in"); });
}
function track(el, xv, yv) {
var id = 0;
var x = 0;
var y = 0;
el.addEventListener("pointermove", function (e) {
x = e.clientX; y = e.clientY;
if (id) { return; }
id = requestAnimationFrame(function () {
id = 0;
var r = el.getBoundingClientRect();
el.style.setProperty(xv, (x - r.left).toFixed(0) + "px");
el.style.setProperty(yv, (y - r.top).toFixed(0) + "px");
});
}, { passive: true });
}
if (fine && !reduce) {
$$(".sheen").forEach(function (el) { track(el, "--gx", "--gy"); });
$$(".spot").forEach(function (el) { track(el, "--mx", "--my"); });
}
if (fine && !reduce) {
$$("[data-magnetic]").forEach(function (b) {
var id = 0;
var mx = 0;
var my = 0;
b.addEventListener("pointermove", function (e) {
var r = b.getBoundingClientRect();
mx = (e.clientX - r.left - r.width / 2) * 0.22;
my = (e.clientY - r.top - r.height / 2) * 0.32;
if (id) { return; }
id = requestAnimationFrame(function () { id = 0; b.style.setProperty("--tx", mx.toFixed(1) + "px"); b.style.setProperty("--ty", my.toFixed(1) + "px"); });
}, { passive: true });
b.addEventListener("pointerleave", function () { b.style.setProperty("--tx", "0px"); b.style.setProperty("--ty", "0px"); });
});
}
var nav = $("[data-nav]");
if (nav) {
var bar = $(".nav__bar", nav);
var prog = $("[data-progress]", nav);
var lastY = sy;
scrollFns.push(function (y) {
nav.classList.toggle("is-scrolled", y > 24);
var max = root.scrollHeight - vh;
if (prog) { prog.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ")"; }
lastY = y;
});
var darkSecs = $$("[data-theme='dark']");
var inDark = [];
var themeIO = null;
var buildTheme = function () {
if (!hasIO) { return; }
if (themeIO) { themeIO.disconnect(); }
inDark = [];
var line = Math.round(10 + bar.offsetHeight / 2);
themeIO = new IntersectionObserver(function (es) {
es.forEach(function (e) {
var k = inDark.indexOf(e.target);
if (e.isIntersecting && k < 0) { inDark.push(e.target); }
if (!e.isIntersecting && k > -1) { inDark.splice(k, 1); }
});
nav.classList.toggle("nav--dark", inDark.length > 0);
}, { rootMargin: (-line) + "px 0px " + (-(vh - line - 1)) + "px 0px", threshold: 0 });
darkSecs.forEach(function (s) { themeIO.observe(s); });
};
buildTheme();
resizeFns.push(buildTheme);
var list = $("[data-nav-list]", nav);
var pill = $(".nav__pill", nav);
if (list && pill && fine) {
var movePill = function (a) {
var lr = list.getBoundingClientRect();
var r = a.getBoundingClientRect();
if (!list.classList.contains("has-pill")) { pill.style.transition = "none"; }
pill.style.setProperty("--px", (r.left - lr.left).toFixed(1) + "px");
pill.style.setProperty("--pw", r.width.toFixed(1) + "px");
if (pill.style.transition) { void pill.offsetWidth; pill.style.transition = ""; }
list.classList.add("has-pill");
};
var activeLink = $(".nav__link[aria-current='page']", list);
var rest = function () {
if (activeLink) { movePill(activeLink); list.classList.add("pill-rest"); } else { list.classList.remove("has-pill"); }
};
$$(".nav__link", list).forEach(function (a) {
a.addEventListener("pointerenter", function () { list.classList.toggle("pill-rest", a === activeLink); movePill(a); });
a.addEventListener("focus", function () { list.classList.toggle("pill-rest", a === activeLink); movePill(a); });
a.addEventListener("blur", rest);
});
list.addEventListener("pointerleave", rest);
if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(rest); } else { rest(); }
resizeFns.push(rest);
}
var megaItems = $$("[data-mega-item]", nav);
var openMega = null;
var megaTimer = 0;
var setMega = function (name) {
megaItems.forEach(function (li) {
var n = li.getAttribute("data-mega-item");
var on = n === name;
li.classList.toggle("is-open", on);
doc.getElementById("mega-" + n).classList.toggle("is-open", on);
$(".nav__chev", li).setAttribute("aria-expanded", on ? "true" : "false");
});
openMega = name;
nav.classList.toggle("mega-open", !!name);
};
megaItems.forEach(function (li) {
var n = li.getAttribute("data-mega-item");
var panel = doc.getElementById("mega-" + n);
var chev = $(".nav__chev", li);
chev.addEventListener("click", function (e) {
var willOpen = openMega !== n;
setMega(willOpen ? n : null);
if (willOpen && e.detail === 0) { var first = $("a", panel); if (first) { setTimeout(function () { first.focus(); }, 60); } }
});
if (fine) {
[li, panel].forEach(function (el) {
el.addEventListener("pointerenter", function () { clearTimeout(megaTimer); megaTimer = setTimeout(function () { setMega(n); }, openMega ? 0 : 110); });
el.addEventListener("pointerleave", function () { clearTimeout(megaTimer); megaTimer = setTimeout(function () { if (openMega === n) { setMega(null); } }, 240); });
});
}
panel.addEventListener("focusout", function (e) { if (e.relatedTarget && !panel.contains(e.relatedTarget) && !li.contains(e.relatedTarget)) { setMega(null); } });
});
doc.addEventListener("keydown", function (e) {
if (e.key !== "Escape" || !openMega) { return; }
var li = $("[data-mega-item='" + openMega + "']", nav);
setMega(null);
$(".nav__chev", li).focus();
});
doc.addEventListener("pointerdown", function (e) { if (openMega && !nav.contains(e.target)) { setMega(null); } });
}
var CLOSE_MS = reduce ? 0 : 380;
function openDialog(dlg, opener) {
if (!dlg || dlg.open) { return; }
dlg._opener = opener || doc.activeElement;
$$("[data-form-status]", dlg).forEach(function (s) { s.textContent = ""; });
if (typeof dlg.showModal === "function") { dlg.showModal(); } else { dlg.setAttribute("open", ""); }
body.classList.add("no-scroll");
raf2(function () { dlg.classList.add("is-open"); });
}
function closeDialog(dlg, cb) {
if (!dlg || !dlg.open || dlg._closing) { return; }
dlg._closing = true;
dlg.classList.remove("is-open");
setTimeout(function () {
dlg._closing = false;
if (typeof dlg.close === "function") { dlg.close(); } else { dlg.removeAttribute("open"); }
if (!$("dialog[open]")) { body.classList.remove("no-scroll"); }
if (dlg._opener && dlg._opener.focus && doc.contains(dlg._opener)) { dlg._opener.focus({ preventScroll: true }); }
if (cb) { cb(); }
}, CLOSE_MS);
}
function wireDialog(dlg) {
dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeDialog(dlg); });
dlg.addEventListener("click", function (e) {
if (e.target === dlg || e.target.closest("[data-close]")) { closeDialog(dlg); return; }
var a = e.target.closest("a[href]");
if (a && dlg.id === "menu" && !a.target) { closeDialog(dlg); }
});
}
$$("dialog[data-dialog]").forEach(wireDialog);
doc.addEventListener("click", function (e) {
var t = e.target.closest("[data-open]");
if (!t) { return; }
var dlg = doc.getElementById(t.getAttribute("data-open"));
if (!dlg) { return; }
e.preventDefault();
var openNow = $("dialog[open]");
if (openNow && openNow !== dlg) { closeDialog(openNow, function () { openDialog(dlg, t); }); } else { openDialog(dlg, t); }
});
var toastEl = $("[data-toast]");
var toastT = 0;
function toast(msg) {
if (!toastEl) { return; }
$("span", toastEl).textContent = msg;
toastEl.classList.add("is-show");
clearTimeout(toastT);
toastT = setTimeout(function () { toastEl.classList.remove("is-show"); }, 2800);
}
$$("[data-copy]").forEach(function (b) {
b.addEventListener("click", function () {
var text = b.getAttribute("data-copy");
var done = function () { toast((b.getAttribute("data-copy-label") || "Copied") + " to clipboard"); };
if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, function () { toast(text); }); } else { toast(text); }
});
});
var dockTop = $(".dock__top");
var dockRing = $(".dock__ring .fg");
scrollFns.push(function (y) {
if (!dockTop) { return; }
var max = root.scrollHeight - vh;
dockTop.classList.toggle("is-visible", y > 700);
if (dockRing) { dockRing.style.strokeDashoffset = (138.2 * (1 - (max > 0 ? clamp(y / max, 0, 1) : 0))).toFixed(1); }
});
$$("[data-to-top]").forEach(function (b) {
b.addEventListener("click", function () {
window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
var skip = $(".skip");
setTimeout(function () { if (skip) { skip.focus({ preventScroll: true }); skip.blur(); } }, 600);
});
});
var statusEls = $$("[data-status]");
function updateStatus() {
var parts;
try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: CFG.tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()); } catch (err) { return; }
var get = function (t) { for (var i = 0; i < parts.length; i++) { if (parts[i].type === t) { return parts[i].value; } } return ""; };
var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
var d = days[get("weekday")];
var h = parseInt(get("hour"), 10) % 24;
var open = CFG.days.indexOf(d) > -1 && h >= CFG.open && h < CFG.close;
var hhmm = (h < 10 ? "0" : "") + h + ":" + get("minute");
statusEls.forEach(function (el) {
el.classList.toggle("is-open", open);
var tx = $("[data-status-text]", el);
var tm = $("[data-time]", el);
if (tx) { tx.textContent = open ? "Studio open now" : "Studio closed now"; }
if (tm) { tm.textContent = hhmm + " IST"; }
});
}
if (statusEls.length) { updateStatus(); setInterval(updateStatus, 30000); }
$$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
var hero = $("[data-hero]");
if (hero) {
var slides = $$(".hero__slide", hero);
var dots = $$(".hero__dot", hero);
var ring = $(".hero__ring", hero);
var heroLabel = $("[data-hero-label]", hero);
var heroMeta = $("[data-hero-meta]", hero);
var heroLink = $("[data-hero-link]", hero);
var playBtn = $("[data-hero-play]", hero);
var INT = 7000;
var cur = 0;
var timer = 0;
var playing = !reduce;
var heroVisible = true;
var heroReady = doc.readyState === "complete";
window.addEventListener("load", function () { heroReady = true; loadDeferred($("img", slides[(cur + 1) % slides.length])); });
hero.style.setProperty("--hero-int", INT + "ms");
var restartRing = function () { if (!ring) { return; } ring.classList.remove("is-running"); void ring.offsetWidth; if (playing && heroVisible) { ring.classList.add("is-running"); } };
var show = function (i) {
cur = (i + slides.length) % slides.length;
slides.forEach(function (s, k) { s.classList.toggle("is-active", k === cur); });
dots.forEach(function (d, k) { d.setAttribute("aria-current", k === cur ? "true" : "false"); });
var s = slides[cur];
loadDeferred($("img", s));
if (heroReady) { loadDeferred($("img", slides[(cur + 1) % slides.length])); }
if (heroLabel) { heroLabel.textContent = s.getAttribute("data-label"); }
if (heroMeta) { heroMeta.textContent = s.getAttribute("data-meta"); }
if (heroLink) { heroLink.setAttribute("href", s.getAttribute("data-href")); }
restartRing();
};
var stop = function () { clearInterval(timer); timer = 0; };
var play = function () { stop(); if (playing && heroVisible && !doc.hidden && slides.length > 1) { timer = setInterval(function () { show(cur + 1); }, INT); } restartRing(); };
$$("[data-hero-prev]", hero).forEach(function (b) { b.addEventListener("click", function () { show(cur - 1); play(); }); });
$$("[data-hero-next]", hero).forEach(function (b) { b.addEventListener("click", function () { show(cur + 1); play(); }); });
dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k); play(); }); });
if (playBtn) {
var syncPlay = function () { playBtn.setAttribute("aria-pressed", playing ? "false" : "true"); playBtn.setAttribute("aria-label", playing ? "Pause slideshow" : "Play slideshow"); playBtn.classList.toggle("is-paused", !playing); };
playBtn.addEventListener("click", function () { playing = !playing; syncPlay(); play(); });
syncPlay();
}
watch(hero, function (v) { heroVisible = v; play(); });
doc.addEventListener("visibilitychange", play);
show(0);
play();
}
$$("[data-words]").forEach(function (el) {
var n = 0;
var split = function (node) {
Array.prototype.slice.call(node.childNodes).forEach(function (c) {
if (c.nodeType === 1) { split(c); return; }
if (c.nodeType !== 3) { return; }
var frag = doc.createDocumentFragment();
c.textContent.split(/(\s+)/).forEach(function (part) {
if (!part) { return; }
if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
var s = doc.createElement("span");
s.className = "w";
s.textContent = part;
s.style.setProperty("--i", n);
n += 1;
frag.appendChild(s);
});
node.replaceChild(frag, c);
});
};
split(el);
el.style.setProperty("--n", n);
if (reduce) { el.style.setProperty("--p", 1); return; }
var on = false;
var upd = function () { var r = el.getBoundingClientRect(); el.style.setProperty("--p", clamp((vh * 0.88 - r.top) / (r.height + vh * 0.42), 0, 1).toFixed(3)); };
upd();
watch(el, function (v) { on = v; if (v) { upd(); } }, "10% 0px 10% 0px");
scrollFns.push(function () { if (on) { upd(); } });
});
var sc = $("[data-showcase]");
if (sc) {
var scTrack = $(".showcase__track", sc);
var scBar = $(".showcase__bar span", sc);
var pinned = false;
var dist = 0;
var top0 = 0;
var scOn = false;
var setup = function () {
var want = vw >= 1024 && fine && !reduce;
if (want !== pinned) {
pinned = want;
sc.classList.toggle("is-pinned", pinned);
if (!pinned) { sc.style.height = ""; scTrack.style.transform = ""; }
}
if (pinned) {
$$("img[loading='lazy']", scTrack).forEach(function (im) { im.loading = "eager"; });
sc.style.height = "";
dist = Math.max(0, scTrack.scrollWidth - scTrack.clientWidth);
sc.style.height = (vh + dist) + "px";
top0 = sc.getBoundingClientRect().top + window.scrollY;
}
};
var curX = 0;
var targetX = 0;
var glide = 0;
var inPin = false;
var paint = function () {
var d = targetX - curX;
curX = Math.abs(d) < 0.4 ? targetX : curX + d * 0.16;
scTrack.style.transform = "translate3d(" + (-curX).toFixed(1) + "px,0,0)";
if (scBar) { scBar.style.transform = "scaleX(" + (dist ? curX / dist : 0).toFixed(3) + ")"; }
glide = curX !== targetX ? requestAnimationFrame(paint) : 0;
};
var setPinNav = function (on) {
if (on === inPin || !nav) { return; }
inPin = on;
nav.classList.toggle("is-hidden", on);
};
var upd = function (y) {
if (!pinned) { setPinNav(false); return; }
var p = dist ? clamp((y - top0) / dist, 0, 1) : 0;
targetX = p * dist;
setPinNav(y > top0 - 4 && y < top0 + dist + 4);
if (!glide) { glide = requestAnimationFrame(paint); }
};
scTrack.addEventListener("scroll", function () {
if (pinned || !scBar) { return; }
var m = scTrack.scrollWidth - scTrack.clientWidth;
scBar.style.transform = "scaleX(" + (m > 0 ? scTrack.scrollLeft / m : 0).toFixed(3) + ")";
}, { passive: true });
scTrack.addEventListener("focusin", function (e) {
if (!pinned) { return; }
var card = e.target.closest(".show-card");
if (!card) { return; }
window.scrollTo({ top: top0 + clamp(card.offsetLeft - vw * 0.12, 0, dist), behavior: "auto" });
});
setup();
resizeFns.push(setup);
window.addEventListener("load", function () { setup(); upd(window.scrollY); });
watch(sc, function (v) { scOn = v; if (v) { upd(window.scrollY); } else { setPinNav(false); } });
scrollFns.push(function (y) { if (scOn) { upd(y); } });
}
$$("[data-rail]").forEach(function (rail) {
var id = rail.id;
var prev = $("[data-rail-prev='" + id + "']");
var next = $("[data-rail-next='" + id + "']");
var stepSize = function () { var c = rail.firstElementChild; return c ? c.getBoundingClientRect().width + 16 : 300; };
var sync = function () {
if (prev) { prev.disabled = rail.scrollLeft < 8; }
if (next) { next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8; }
};
if (prev) { prev.addEventListener("click", function () { rail.scrollBy({ left: -stepSize(), behavior: reduce ? "auto" : "smooth" }); }); }
if (next) { next.addEventListener("click", function () { rail.scrollBy({ left: stepSize(), behavior: reduce ? "auto" : "smooth" }); }); }
rail.addEventListener("scroll", function () { requestAnimationFrame(sync); }, { passive: true });
sync();
if (!fine) { return; }
var down = false;
var startX = 0;
var startL = 0;
var moved = 0;
rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse" || e.button !== 0) { return; } down = true; moved = 0; startX = e.clientX; startL = rail.scrollLeft; });
window.addEventListener("pointermove", function (e) {
if (!down) { return; }
var dx = e.clientX - startX;
moved = Math.max(moved, Math.abs(dx));
if (moved > 6) { rail.classList.add("is-dragging"); rail.scrollLeft = startL - dx; }
}, { passive: true });
window.addEventListener("pointerup", function () { if (!down) { return; } down = false; setTimeout(function () { rail.classList.remove("is-dragging"); }, 0); });
rail.addEventListener("click", function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
});
$$(".marquee").forEach(function (m) { watch(m, function (v) { m.classList.toggle("is-paused", !v); }); });
$$("[data-line]").forEach(function (wrap) {
var fill = wrap.firstElementChild;
var host = wrap.parentNode;
var on = false;
var upd = function () { var r = host.getBoundingClientRect(); fill.style.transform = "scaleY(" + clamp((vh * 0.62 - r.top) / r.height, 0, 1).toFixed(3) + ")"; };
if (reduce) { fill.style.transform = "none"; return; }
watch(host, function (v) { on = v; if (v) { upd(); } });
scrollFns.push(function () { if (on) { upd(); } });
});
var steps = $$("[data-step]");
if (steps.length && hasIO) {
var sio = new IntersectionObserver(function (es) {
es.forEach(function (e) { if (e.isIntersecting) { steps.forEach(function (s) { s.classList.toggle("is-active", s === e.target); }); } });
}, { rootMargin: "-42% 0px -52% 0px" });
steps.forEach(function (s) { sio.observe(s); });
}
var spy = $("[data-spy]");
if (spy && hasIO) {
var spyLinks = $$("a[href^='#']", spy);
var spyIO = new IntersectionObserver(function (es) {
es.forEach(function (e) {
if (!e.isIntersecting) { return; }
spyLinks.forEach(function (a) {
var on = a.getAttribute("href") === "#" + e.target.id;
a.classList.toggle("is-active", on);
if (on) { a.setAttribute("aria-current", "true"); spy.scrollTo({ left: a.offsetLeft - spy.clientWidth / 2 + a.offsetWidth / 2, behavior: reduce ? "auto" : "smooth" }); } else { a.removeAttribute("aria-current"); }
});
});
}, { rootMargin: "-40% 0px -55% 0px" });
spyLinks.forEach(function (a) { var t = doc.getElementById(a.getAttribute("href").slice(1)); if (t) { spyIO.observe(t); } });
}
var fbar = $("[data-filters]");
if (fbar) {
var fItems = $$("[data-cat]");
var fBtns = $$("[data-filter]", fbar);
var fStatus = $("[data-filter-status]");
fItems.forEach(function (it, i) { it.style.viewTransitionName = "fi-" + i; });
fBtns.forEach(function (b) {
var f = b.getAttribute("data-filter");
var c = $(".count", b);
if (c) { c.textContent = f === "all" ? fItems.length : fItems.filter(function (it) { return (" " + it.getAttribute("data-cat") + " ").indexOf(" " + f + " ") > -1; }).length; }
b.addEventListener("click", function () {
var apply = function () {
var shown = 0;
fBtns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
fItems.forEach(function (it) {
var ok = f === "all" || (" " + it.getAttribute("data-cat") + " ").indexOf(" " + f + " ") > -1;
it.hidden = !ok;
if (ok) { shown += 1; it.classList.add("is-in"); }
});
$$("[data-filter-group]").forEach(function (g) { g.hidden = !$("[data-cat]:not([hidden])", g); });
if (fStatus) { fStatus.textContent = shown + (shown === 1 ? " item" : " items") + " shown"; }
};
if (doc.startViewTransition && !reduce) { doc.startViewTransition(apply); } else { apply(); }
});
});
}
var lbLinks = $$("[data-lb]");
var lb = null;
var lbGroup = [];
var lbIndex = 0;
function lbIcon(d) { return "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='" + d + "'/></svg>"; }
function buildLb() {
lb = doc.createElement("dialog");
lb.className = "lb";
lb.setAttribute("data-dialog", "");
lb.setAttribute("aria-label", "Image viewer");
lb.innerHTML = "<div class='lb__wrap'><div class='lb__bar'><span class='lb__count' aria-live='polite'></span><p class='lb__caption'></p><button class='icon-btn lb__btn' type='button' data-close aria-label='Close image viewer'>" + lbIcon("M6 6l12 12M18 6 6 18") + "</button></div><div class='lb__stage'><img class='lb__img' alt='' decoding='async'><button class='icon-btn lb__btn lb__prev' type='button' aria-label='Previous image'>" + lbIcon("M15 5l-7 7 7 7") + "</button><button class='icon-btn lb__btn lb__next' type='button' aria-label='Next image'>" + lbIcon("M9 5l7 7-7 7") + "</button></div><div class='lb__thumbs'></div></div>";
body.appendChild(lb);
wireDialog(lb);
$(".lb__prev", lb).addEventListener("click", function () { lbGo(lbIndex - 1); });
$(".lb__next", lb).addEventListener("click", function () { lbGo(lbIndex + 1); });
lb.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { lbGo(lbIndex - 1); } if (e.key === "ArrowRight") { lbGo(lbIndex + 1); } });
var sx = 0;
var sxOn = false;
var stage = $(".lb__stage", lb);
stage.addEventListener("pointerdown", function (e) { sxOn = true; sx = e.clientX; }, { passive: true });
stage.addEventListener("pointerup", function (e) { if (!sxOn) { return; } sxOn = false; var dx = e.clientX - sx; if (Math.abs(dx) > 50) { lbGo(lbIndex + (dx < 0 ? 1 : -1)); } }, { passive: true });
stage.addEventListener("click", function (e) { if (e.target === stage) { closeDialog(lb); } });
}
function lbGo(i) {
lbIndex = (i + lbGroup.length) % lbGroup.length;
var a = lbGroup[lbIndex];
var thumb = $("img", a);
var img = $(".lb__img", lb);
var cap = a.getAttribute("data-caption") || (thumb ? thumb.alt : "");
img.classList.add("is-swapping");
var pre = new Image();
if (thumb && thumb.getAttribute("srcset")) { pre.sizes = "92vw"; pre.srcset = thumb.getAttribute("srcset"); }
pre.src = a.getAttribute("href");
var swap = function () {
img.removeAttribute("srcset");
if (pre.srcset) { img.sizes = "92vw"; img.srcset = pre.srcset; }
img.src = pre.src;
img.alt = thumb ? thumb.alt : cap;
img.classList.remove("is-swapping");
};
if (pre.decode) { pre.decode().then(swap, swap); } else { pre.onload = swap; }
$(".lb__caption", lb).textContent = cap;
$(".lb__count", lb).textContent = String(lbIndex + 1).padStart(2, "0") + " / " + String(lbGroup.length).padStart(2, "0");
var multi = lbGroup.length > 1;
$(".lb__prev", lb).hidden = !multi;
$(".lb__next", lb).hidden = !multi;
$$(".lb__thumb", lb).forEach(function (t, k) {
t.setAttribute("aria-current", k === lbIndex ? "true" : "false");
if (k === lbIndex) { t.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" }); }
});
}
function lbOpen(a) {
if (!lb) { buildLb(); }
var name = a.getAttribute("data-lb");
lbGroup = lbLinks.filter(function (l) { return l.getAttribute("data-lb") === name && !l.closest("[hidden]"); });
var thumbs = $(".lb__thumbs", lb);
thumbs.textContent = "";
thumbs.hidden = lbGroup.length < 2;
lbGroup.forEach(function (l, k) {
var b = doc.createElement("button");
b.type = "button";
b.className = "lb__thumb";
b.setAttribute("aria-label", "Show image " + (k + 1));
var ti = doc.createElement("img");
var src = $("img", l);
ti.src = src ? (src.currentSrc || src.getAttribute("src") || src.getAttribute("data-src")) : l.getAttribute("href");
ti.alt = "";
ti.loading = "lazy";
b.appendChild(ti);
b.addEventListener("click", function () { lbGo(k); });
thumbs.appendChild(b);
});
openDialog(lb, a);
lbGo(Math.max(0, lbGroup.indexOf(a)));
}
lbLinks.forEach(function (a) { a.addEventListener("click", function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) { return; } e.preventDefault(); lbOpen(a); }); });
function setErr(form, name, msg) {
var input = $("[name='" + name + "']", form);
if (!input) { return true; }
var field = input.closest(".field");
var out = field ? $(".field__msg", field) : null;
if (field) { field.classList.toggle("is-invalid", !!msg); }
if (out) { out.textContent = msg; }
input.setAttribute("aria-invalid", msg ? "true" : "false");
return !msg;
}
$$("form[data-enquiry]").forEach(function (form) {
$$("input, textarea", form).forEach(function (inp) { inp.addEventListener("input", function () { if (inp.getAttribute("aria-invalid") === "true") { setErr(form, inp.name, ""); } }); });
form.addEventListener("submit", function (e) {
e.preventDefault();
var fd = new FormData(form);
var get = function (k) { return String(fd.get(k) || "").trim(); };
var name = get("name");
var phone = get("phone");
var okName = setErr(form, "name", name.length < 2 ? "Please tell us your name." : "");
var okPhone = setErr(form, "phone", phone.replace(/\D/g, "").length < 10 ? "Please enter a valid phone number with at least 10 digits." : "");
if (!okName || !okPhone) { var bad = $("[aria-invalid='true']", form); if (bad) { bad.focus(); } return; }
var lines = ["Hello Skywalk Designs, I would like to discuss a project.", "", "Name: " + name, "Phone: " + phone];
[["type", "Project type"], ["city", "Location"], ["stage", "Stage"], ["budget", "Indicative budget"]].forEach(function (p) { var v = get(p[0]); if (v) { lines.push(p[1] + ": " + v); } });
var msg = get("message");
if (msg) { lines.push("", "About the project:", msg); }
var url = "https://wa.me/" + CFG.wa + "?text=" + encodeURIComponent(lines.join("\n"));
var status = $("[data-form-status]", form);
if (status) {
status.textContent = "Opening WhatsApp with your message. Not opening? ";
var link = doc.createElement("a");
link.href = url;
link.target = "_blank";
link.rel = "noopener";
link.className = "link";
link.textContent = "Tap here";
status.appendChild(link);
}
window.open(url, "_blank", "noopener");
toast("Opening WhatsApp");
});
});
$$("[data-map]").forEach(function (wrap) {
var btn = $("[data-map-load]", wrap);
if (!btn) { return; }
btn.addEventListener("click", function () {
var f = doc.createElement("iframe");
f.src = wrap.getAttribute("data-map");
f.title = wrap.getAttribute("data-map-title") || "Map";
f.loading = "lazy";
f.referrerPolicy = "no-referrer-when-downgrade";
f.setAttribute("allowfullscreen", "");
$$(".map__cover", wrap).forEach(function (c) { c.remove(); });
wrap.appendChild(f);
f.focus();
});
});
var nudge = $("[data-nudge]");
if (nudge) {
var NK = "sw-nudge";
var seen = false;
try { seen = window.sessionStorage.getItem(NK) === "1"; } catch (err) { seen = false; }
var dismiss = function () {
nudge.classList.remove("is-show");
setTimeout(function () { nudge.hidden = true; }, 500);
try { window.sessionStorage.setItem(NK, "1"); } catch (err) { return; }
};
$$("[data-nudge-close], [data-open]", nudge).forEach(function (b) { b.addEventListener("click", dismiss); });
if (!seen) {
var shown = false;
scrollFns.push(function (y) {
if (shown || $("dialog[open]")) { return; }
if (vw >= 768 && y > (root.scrollHeight - vh) * 0.42 && y > 1400) {
shown = true;
nudge.hidden = false;
raf2(function () { nudge.classList.add("is-show"); });
setTimeout(function () { if (nudge.classList.contains("is-show") && !nudge.matches(":hover, :focus-within")) { dismiss(); } }, 14000);
}
});
}
}
if (fine && !reduce) {
var cTargets = $$("[data-cursor]");
if (cTargets.length) {
var cursorEl = doc.createElement("div");
cursorEl.className = "cursor";
cursorEl.setAttribute("aria-hidden", "true");
var curLabel = doc.createElement("span");
cursorEl.appendChild(curLabel);
body.appendChild(cursorEl);
var tx = 0;
var ty = 0;
var cx = 0;
var cy = 0;
var cOn = false;
var cRaf = 0;
var loop = function () {
cx += (tx - cx) * 0.22;
cy += (ty - cy) * 0.22;
cursorEl.style.transform = "translate3d(" + (cx + 18).toFixed(1) + "px," + (cy + 20).toFixed(1) + "px,0)";
cRaf = (cOn || Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) ? requestAnimationFrame(loop) : 0;
};
cTargets.forEach(function (t) {
t.addEventListener("pointerenter", function (e) {
if (e.pointerType !== "mouse") { return; }
cOn = true; tx = e.clientX; ty = e.clientY;
if (!cursorEl.classList.contains("is-on")) { cx = tx; cy = ty; }
curLabel.textContent = t.getAttribute("data-cursor");
cursorEl.classList.add("is-on");
if (!cRaf) { cRaf = requestAnimationFrame(loop); }
});
t.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; if (!cRaf) { cRaf = requestAnimationFrame(loop); } }, { passive: true });
t.addEventListener("pointerleave", function () { cOn = false; cursorEl.classList.remove("is-on", "is-press"); });
t.addEventListener("pointerdown", function () { cursorEl.classList.add("is-press"); });
t.addEventListener("pointerup", function () { cursorEl.classList.remove("is-press"); });
});
window.addEventListener("scroll", function () { if (cOn) { cOn = false; cursorEl.classList.remove("is-on"); } }, { passive: true });
}
}
runScroll();
})();