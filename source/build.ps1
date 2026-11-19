# Skywalk Designs — static site build
# Usage (from the project folder):  powershell -ExecutionPolicy Bypass -File source/build.ps1 [-Domain https://www.example.com]
# Assembles source/pages with source/partials, expands image/icon macros, minifies HTML/CSS/JS,
# adds cache-busting and writes security headers for Netlify / Cloudflare Pages / Vercel / Apache.
param([string]$Domain = "")
$ErrorActionPreference = "Stop"

$S   = $PSScriptRoot
$P   = Split-Path $S -Parent
$OUT = Join-Path $P "New Website"
$utf8 = New-Object System.Text.UTF8Encoding $false
function Read-Text($p) { [IO.File]::ReadAllText($p, $utf8) }
function Write-Text($p, $t) { $d = Split-Path $p -Parent; if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }; [IO.File]::WriteAllText($p, $t, $utf8) }
$Domain = $Domain.TrimEnd('/')

# ---------- Image manifest ----------
$manifest = @{}
$mj = Read-Text (Join-Path $S "build\img-manifest.json") | ConvertFrom-Json
foreach ($prop in $mj.PSObject.Properties) { $manifest[$prop.Name] = $prop.Value }
function Get-Img($key) { if (-not $manifest.ContainsKey($key)) { throw "Unknown image key: $key" }; return $manifest[$key] }

# ---------- Icons ----------
$stroke = @{
  'chev' = 'm6 9 6 6 6-6'; 'chev-l' = 'M15 5l-7 7 7 7'; 'chev-r' = 'M9 5l7 7-7 7'
  'arrow' = 'M5 12h14M13 6l6 6-6 6'; 'arrow-ur' = 'M7 17 17 7M8 7h9v9'; 'arrow-up' = 'M12 19V5M6 11l6-6 6 6'
  'close' = 'M6 6l12 12M18 6 6 18'; 'plus' = 'M12 5v14M5 12h14'; 'check' = 'M5 12.5l4.5 4.5L19 7'
  'phone' = 'M5.5 3.5h3l1.6 4.2-2 1.3a11 11 0 0 0 5.9 5.9l1.3-2 4.2 1.6v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3.5 5.5a2 2 0 0 1 2-2Z'
  'pen' = 'M4 20l1.2-4.2L16 5a2.1 2.1 0 0 1 3 3L8.2 18.8Z M14 7l3 3'
  'pin' = 'M12 21s-7-6.1-7-11.2A7 7 0 0 1 19 9.8C19 14.9 12 21 12 21Z M12 12.3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'
  'clock' = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3.5 2'
  'copy' = 'M9 9h10v11H9z M5 15V4h10'; 'lock' = 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3'
  'pause' = 'M8.5 5v14M15.5 5v14'; 'play' = 'M8 5.5v13l10-6.5z'
  'instagram' = 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M17.5 6.5h.01'
  'facebook' = 'M14 8.5h3V5h-3a4 4 0 0 0-4 4v2H7.5v3.5H10V21h3.5v-6.5h3l.5-3.5h-3.5V9a.5.5 0 0 1 .5-.5Z'
  'houzz' = 'M4 21V10l8-6 8 6v11h-5.5v-6h-5v6Z'
  'star' = 'm12 2.8 2.8 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.7 3.2 1.3-6.4-4.8-4.4 6.4-.7Z'
  'building' = 'M4 21V5l8-2v18 M12 21V8l8 3v10 M2 21h20 M7.5 8h1 M7.5 12h1 M7.5 16h1 M15.5 13h1 M15.5 17h1'
  'sofa' = 'M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3 M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2Z M5 18v2 M19 18v2'
  'store' = 'M3 9l1.5-5h15L21 9 M3 9v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9 M4.5 13v8h15v-8 M10 21v-5h4v5'
  'hospital' = 'M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15 M2 21h20 M12 8v6 M9 11h6'
  'brush' = 'M18 3l3 3-9.5 9.5-3-3Z M8.5 12.5 6 15c-1.5 1.5-1 4-3 5 3 1 6 0 7-2l1.5-1.5'
  'cube' = 'M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4Z M12 12l8-4.6 M12 12v9.2 M12 12 4 7.4'
  'clipboard' = 'M9 4h6v3H9z M7 5.5H5.5A1.5 1.5 0 0 0 4 7v12.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H17 M8.5 13l2.2 2.2L15.5 10.5'
  'compass' = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M15.5 8.5l-2 5-5 2 2-5Z'
  'bulb' = 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z'
  'users' = 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19 M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.3 M15.5 4.2a3.5 3.5 0 0 1 0 6.6'
  'leaf' = 'M5 19c0-8 5-14 15-15-1 10-7 15-15 15Z M5 19l7-7'
  'eye' = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
  'expand' = 'M14 4h6v6 M10 20H4v-6 M20 4l-7 7 M4 20l7-7'
}
$fill = @{
  'whatsapp' = 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z'
  'star-f' = 'm12 2.8 2.8 5.9 6.4.7-4.8 4.4 1.3 6.4L12 17l-5.7 3.2 1.3-6.4-4.8-4.4 6.4-.7Z'
}
function Get-Icon($name, $cls) {
  $c = if ($cls) { " class=""$cls""" } else { "" }
  if ($stroke.ContainsKey($name)) { return "<svg$c viewBox=""0 0 24 24"" fill=""none"" stroke=""currentColor"" stroke-width=""1.7"" stroke-linecap=""round"" stroke-linejoin=""round"" aria-hidden=""true"" focusable=""false""><path d=""$($stroke[$name])""/></svg>" }
  if ($fill.ContainsKey($name)) { return "<svg$c viewBox=""0 0 24 24"" fill=""currentColor"" aria-hidden=""true"" focusable=""false""><path d=""$($fill[$name])""/></svg>" }
  throw "Unknown icon: $name"
}
$mark = '<svg viewBox="0 0 860 560" fill="currentColor" aria-hidden="true" focusable="false"><path d="M5 307 842 5 323 423Z"/><path d="M347 426 855 13 676 547Z"/></svg>'
$arrow = '<span class="btn__icon" aria-hidden="true">' + (Get-Icon 'arrow' 'a1') + (Get-Icon 'arrow' 'a2') + '</span>'
$blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function Img-Url($key, $w) { return "{{root}}assets/img/$key-$w.webp" }
function Img-SrcSet($key) { $m = Get-Img $key; return (($m.ws | ForEach-Object { (Img-Url $key $_) + " ${_}w" }) -join ', ') }
function Img-Attrs($key, $sizes, $defer) {
  $m = Get-Img $key
  if (-not $sizes) { $sizes = '100vw' }
  $mid = ($m.ws | Where-Object { $_ -ge 960 } | Select-Object -First 1); if (-not $mid) { $mid = $m.ws[-1] }
  $src = Img-Url $key $mid
  if ($defer) { return "src=""$blank"" data-src=""$src"" data-srcset=""$(Img-SrcSet $key)"" sizes=""$sizes"" width=""$($m.w)"" height=""$($m.h)"" decoding=""async""" }
  return "src=""$src"" srcset=""$(Img-SrcSet $key)"" sizes=""$sizes"" width=""$($m.w)"" height=""$($m.h)"" decoding=""async"""
}

function Expand-Macros([string]$h) {
  $h = [regex]::Replace($h, '\{img:([a-z0-9\-/]+)(?:\|([^}]*))?\}', [Text.RegularExpressions.MatchEvaluator]{ param($m) Img-Attrs $m.Groups[1].Value $m.Groups[2].Value $false })
  $h = [regex]::Replace($h, '\{defer:([a-z0-9\-/]+)(?:\|([^}]*))?\}', [Text.RegularExpressions.MatchEvaluator]{ param($m) Img-Attrs $m.Groups[1].Value $m.Groups[2].Value $true })
  $h = [regex]::Replace($h, '\{big:([a-z0-9\-/]+)\}', [Text.RegularExpressions.MatchEvaluator]{ param($m) $k = $m.Groups[1].Value; Img-Url $k ((Get-Img $k).ws[-1]) })
  $h = [regex]::Replace($h, '\{i:([a-z0-9\-]+)\}', [Text.RegularExpressions.MatchEvaluator]{ param($m) Get-Icon $m.Groups[1].Value $null })
  $h = $h.Replace('{mark}', $mark).Replace('{arrow}', $arrow)
  return $h
}

# ---------- Minifiers ----------
function Minify-Css([string]$c) {
  $c = [regex]::Replace($c, '/\*[\s\S]*?\*/', '')
  $c = [regex]::Replace($c, '\s+', ' ')
  $c = [regex]::Replace($c, '\s*([{};,>])\s*', '$1')
  $c = [regex]::Replace($c, ':\s+', ':')
  $c = $c.Replace(';}', '}')
  return $c.Trim()
}
function Minify-Js([string]$j) {
  $j = [regex]::Replace($j, '/\*[\s\S]*?\*/', '')
  $lines = $j -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' -and -not $_.StartsWith('//') }
  return ($lines -join "`n")
}
function Minify-Html([string]$h) {
  $h = [regex]::Replace($h, '<!--[\s\S]*?-->', '')
  $h = [regex]::Replace($h, '\s+', ' ')
  $h = [regex]::Replace($h, '>\s+<(/?)(html|head|body|meta|link|title|script|main|header|footer|section|div|nav|ul|ol|li|dl|dt|dd|article|aside|figure|figcaption|dialog|form|fieldset|p|h1|h2|h3|address|blockquote)\b', '><$1$2')
  return $h.Trim()
}

# ---------- Assets ----------
$css = (Get-ChildItem (Join-Path $S "css") -Filter *.css | Sort-Object Name | ForEach-Object { Read-Text $_.FullName }) -join "`n"
$cssMin = Minify-Css $css
$jsMin = Minify-Js (Read-Text (Join-Path $S "js\app.js"))
$sha = [Security.Cryptography.SHA256]::Create()
$v = ([BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes($cssMin + $jsMin))) -replace '-', '').Substring(0, 10).ToLower()
Write-Text (Join-Path $OUT "assets\css\app.css") $cssMin
Write-Text (Join-Path $OUT "assets\js\app.js") $jsMin

# ---------- Pages ----------
$head = Read-Text (Join-Path $S "partials\head.html")
$header = Read-Text (Join-Path $S "partials\header.html")
$footer = Read-Text (Join-Path $S "partials\footer.html")
$overlays = Read-Text (Join-Path $S "partials\overlays.html")
$nudge = Read-Text (Join-Path $S "partials\nudge.html")
$jsonld = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"ProfessionalService","name":"Skywalk Designs","description":"Architecture and interior design studio in Jaipur, Rajasthan, founded in 2014.","foundingDate":"2014","telephone":"+91-9549599987","address":{"@type":"PostalAddress","streetAddress":"A-5, Janakpuri Colony, Gajsinghpura, Ajmer Road (behind Hotel Om Palace)","addressLocality":"Jaipur","addressRegion":"Rajasthan","postalCode":"302021","addressCountry":"IN"},"geo":{"@type":"GeoCoordinates","latitude":26.8816628,"longitude":75.7251463},"openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"opens":"09:00","closes":"19:00"}],"areaServed":"Rajasthan, India","founder":[{"@type":"Person","name":"Rahul Sharma","jobTitle":"Head Architect & Director"},{"@type":"Person","name":"Shashank Jain"}],"sameAs":["https://www.instagram.com/skywalkdesign/","https://www.facebook.com/Skywalkdesigns2014/","https://www.houzz.in/professionals/architects-and-building-designers/skywalk-designs-pfvwin-pf~881802433","https://www.justdial.com/Jaipur/Skywalk-Designs-Swage-Farm-Ajmer-Road/0141PX141-X141-160201115100-H7C9_BZDET"]}</script>'

$pagesDir = Join-Path $S "pages"
$built = @()
foreach ($f in Get-ChildItem $pagesDir -Recurse -Filter *.html) {
  $rel = $f.FullName.Substring($pagesDir.Length + 1).Replace('\', '/')
  $raw = Read-Text $f.FullName
  $meta = @{}
  $mm = [regex]::Match($raw, '^\s*<!--@([\s\S]*?)-->')
  if ($mm.Success) {
    foreach ($line in ($mm.Groups[1].Value -split "`r?`n")) { $i = $line.IndexOf(':'); if ($i -gt 0) { $meta[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim() } }
    $raw = $raw.Substring($mm.Length)
  }
  $depth = ($rel.Split('/').Count - 1)
  $root = if ($meta.root) { $meta.root } else { '../' * $depth }
  $active = if ($meta.active) { $meta.active } else { '' }
  $pageUrl = if ($rel -eq 'index.html') { '' } else { $rel }

  $ogImg = if ($meta.og) { Img-Url $meta.og 1600 } else { '{{root}}assets/img/og-image.jpg' }
  if ($meta.og) { $m = Get-Img $meta.og; $w = ($m.ws | Where-Object { $_ -ge 1200 } | Select-Object -First 1); if (-not $w) { $w = $m.ws[-1] }; $ogImg = Img-Url $meta.og $w }
  if ($Domain) { $ogImg = $ogImg.Replace('{{root}}', "$Domain/") }
  $canonical = if ($Domain -and $rel -ne '404.html') { "<link rel=""canonical"" href=""$Domain/$pageUrl"">" } else { '' }
  if ($meta.robots) { $canonical += "<meta name=""robots"" content=""$($meta.robots)"">" }
  $preload = ''
  if ($meta.preload) { $preload = "<link rel=""preload"" as=""image"" imagesrcset=""$(Img-SrcSet $meta.preload)"" imagesizes=""100vw"" fetchpriority=""high"">" }

  $h = $head.Replace('{{title}}', $meta.title).Replace('{{description}}', $meta.description).Replace('{{ogtype}}', $(if ($meta.ogtype) { $meta.ogtype } else { 'website' }))
  $h = $h.Replace('{{ogimage}}', $ogImg).Replace('{{canonical}}', $canonical).Replace('{{preload}}', $preload).Replace('{{v}}', $v)
  $h = $h.Replace('{{jsonld}}', $(if ($meta.jsonld -eq 'yes') { $jsonld } else { '' }))

  $hdr = $header
  $firstTag = [regex]::Match($raw, '<(section|a)\b[^>]*>').Value
  if ($firstTag -match 'data-theme="dark"') { $hdr = $hdr.Replace('<header class="nav" data-nav>', '<header class="nav nav--dark" data-nav>') }
  $bodyParts = $hdr + "<main id=""main"">" + $raw + "</main>" + $footer + $overlays
  if ($meta.nudge -eq 'yes') { $bodyParts += $nudge }
  $doc = "<!doctype html><html lang=""en-IN""><head>" + $h + "</head><body>" + $bodyParts + "</body></html>"

  $doc = Expand-Macros $doc
  $doc = [regex]::Replace($doc, '\{\{cur:([a-z\-]+)\}\}', [Text.RegularExpressions.MatchEvaluator]{ param($m) if ($m.Groups[1].Value -eq $active) { ' aria-current="page"' } else { '' } })
  $doc = $doc.Replace('{{root}}', $root)
  if ($doc -match '\{\{[a-z]' -or $doc -match '\{(img|defer|big|i):') { throw "Unexpanded token in $rel" }
  Write-Text (Join-Path $OUT $rel) (Minify-Html $doc)
  $built += $rel
}

# ---------- Security headers, manifest, robots, sitemap ----------
$csp = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; frame-src 'self' https://www.google.com; connect-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"
$perm = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()"
Write-Text (Join-Path $OUT "_headers") @"
/*
  Content-Security-Policy: $csp
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: $perm
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
/assets/css/*
  Cache-Control: public, max-age=31536000, immutable
/assets/js/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/*
  Cache-Control: public, max-age=2592000
"@
$vercel = [ordered]@{
  cleanUrls = $true; trailingSlash = $false
  headers = @(
    @{ source = "/(.*)"; headers = @(
      @{ key = "Content-Security-Policy"; value = $csp },
      @{ key = "Strict-Transport-Security"; value = "max-age=63072000; includeSubDomains; preload" },
      @{ key = "X-Content-Type-Options"; value = "nosniff" },
      @{ key = "X-Frame-Options"; value = "DENY" },
      @{ key = "Referrer-Policy"; value = "strict-origin-when-cross-origin" },
      @{ key = "Permissions-Policy"; value = $perm },
      @{ key = "Cross-Origin-Opener-Policy"; value = "same-origin" },
      @{ key = "Cross-Origin-Resource-Policy"; value = "same-origin" }) },
    @{ source = "/assets/(css|js)/(.*)"; headers = @(@{ key = "Cache-Control"; value = "public, max-age=31536000, immutable" }) },
    @{ source = "/assets/img/(.*)"; headers = @(@{ key = "Cache-Control"; value = "public, max-age=2592000" }) })
}
Write-Text (Join-Path $OUT "vercel.json") ($vercel | ConvertTo-Json -Depth 8)
Write-Text (Join-Path $OUT ".htaccess") @"
Options -Indexes
ErrorDocument 404 /404.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
<IfModule mod_headers.c>
  Header always set Content-Security-Policy "$csp"
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "$perm"
  Header always set Cross-Origin-Opener-Policy "same-origin"
  <FilesMatch "\.(css|js)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.(webp|png|jpg|svg)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json image/svg+xml application/manifest+json
</IfModule>
<IfModule mod_mime.c>
  AddType image/webp .webp
  AddType application/manifest+json .webmanifest
</IfModule>
"@
Write-Text (Join-Path $OUT "site.webmanifest") '{"name":"Skywalk Designs","short_name":"Skywalk","description":"Architecture and interior design studio in Jaipur, Rajasthan.","start_url":"/","display":"standalone","background_color":"#0f1012","theme_color":"#0f1012","icons":[{"src":"assets/brand/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"assets/brand/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}'
$robots = "User-agent: *`nAllow: /`nDisallow: /404.html`n"
if ($Domain) {
  $robots += "`nSitemap: $Domain/sitemap.xml`n"
  $urls = ($built | Where-Object { $_ -ne '404.html' } | Sort-Object | ForEach-Object { $u = if ($_ -eq 'index.html') { '' } else { $_ }; "  <url><loc>$Domain/$u</loc></url>" }) -join "`n"
  Write-Text (Join-Path $OUT "sitemap.xml") "<?xml version=""1.0"" encoding=""UTF-8""?>`n<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">`n$urls`n</urlset>`n"
} elseif (Test-Path (Join-Path $OUT "sitemap.xml")) { Remove-Item (Join-Path $OUT "sitemap.xml") }
Write-Text (Join-Path $OUT "robots.txt") $robots

"Built $($built.Count) pages, css $([math]::Round($cssMin.Length/1KB,1)) KB, js $([math]::Round($jsMin.Length/1KB,1)) KB, v=$v"
