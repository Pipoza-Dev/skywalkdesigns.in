(function () {
  "use strict";
  var WIDTHS = [480, 960, 1600, 2400];
  var log = document.getElementById("log");
  function say(t) { log.textContent += t + "\n"; }
  function put(path, body) {
    return fetch("/__put/" + encodeURI(path), { method: "PUT", body: body }).then(function (r) {
      if (!r.ok) throw new Error("PUT failed " + r.status + " " + path);
    });
  }
  async function build() {
    var list = await (await fetch("originals.json", { cache: "no-store" })).json();
    var manifest = {};
    var total = 0;
    for (var k = 0; k < list.length; k++) {
      var key = list[k];
      var img = new Image();
      img.src = "../originals/" + key + ".jpg?" + Date.now();
      await img.decode();
      var W = img.naturalWidth, H = img.naturalHeight;
      var ws = WIDTHS.filter(function (w) { return w < W; });
      if (!ws.length || Math.min(W, 2400) > ws[ws.length - 1] * 1.15) ws.push(Math.min(W, 2400));
      ws = Array.from(new Set(ws));
      for (var i = 0; i < ws.length; i++) {
        var w = ws[i], h = Math.round(H * w / W);
        var bmp = await createImageBitmap(img, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
        var c = new OffscreenCanvas(w, h);
        c.getContext("2d").drawImage(bmp, 0, 0);
        bmp.close();
        var blob = await c.convertToBlob({ type: "image/webp", quality: w >= 1600 ? 0.72 : 0.78 });
        total += blob.size;
        await put("New Website/assets/img/" + key + "-" + w + ".webp", blob);
      }
      var top = ws[ws.length - 1];
      manifest[key] = { w: top, h: Math.round(H * top / W), ws: ws };
      say((k + 1) + "/" + list.length + "  " + key + "  " + W + "x" + H + "  -> " + ws.join(", "));
    }
    await put("source/build/img-manifest.json", new Blob([JSON.stringify(manifest, null, 1)], { type: "application/json" }));
    say("DONE total webp " + (total / 1048576).toFixed(2) + " MB");
    document.title = "DONE";
  }
  document.getElementById("go").addEventListener("click", function () {
    build().catch(function (e) { say("ERROR " + e.message); document.title = "ERROR"; });
  });
})();
