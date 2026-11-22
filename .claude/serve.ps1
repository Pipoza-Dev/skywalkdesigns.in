# Local static server for Skywalk Designs.
# Sends the same security headers as production so CSP problems show up while testing.
#   Preview site : powershell -ExecutionPolicy Bypass -File .claude/serve.ps1 -Root "New Website" -Port 5180
#   Image build  : powershell -ExecutionPolicy Bypass -File .claude/serve.ps1 -Root "." -Port 5181 -AllowPut
param([string]$Root = "New Website", [int]$Port = 5180, [switch]$AllowPut)

$project = Split-Path $PSScriptRoot -Parent
$rootPath = (Resolve-Path (Join-Path $project $Root)).Path.TrimEnd('\')
$mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "text/javascript; charset=utf-8";
  ".json" = "application/json"; ".webmanifest" = "application/manifest+json"; ".svg" = "image/svg+xml";
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".webp" = "image/webp"; ".ico" = "image/x-icon";
  ".txt" = "text/plain; charset=utf-8"; ".xml" = "application/xml"; ".woff2" = "font/woff2"
}
$csp = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://lh3.googleusercontent.com; frame-src 'self' https://www.google.com; connect-src 'self' https://skywalk-designs-default-rtdb.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://script.google.com https://script.googleusercontent.com; manifest-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
$putAllowed = @("New Website/assets/img/", "source/build/")

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $rootPath at http://localhost:$Port/ (PUT: $AllowPut)"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ($rel -like 'skywalkdesigns.in/*' -or $rel -eq 'skywalkdesigns.in') { $rel = $rel.Substring('skywalkdesigns.in'.Length).TrimStart('/') }
    if ($AllowPut -and $req.HttpMethod -eq "PUT" -and $rel.StartsWith("__put/")) {
      $target = $rel.Substring(6)
      $ok = $false; foreach ($p in $putAllowed) { if ($target.StartsWith($p)) { $ok = $true } }
      $full = [IO.Path]::GetFullPath((Join-Path $project $target))
      if (-not $ok -or -not $full.StartsWith($project) -or $target.Contains("..")) { $res.StatusCode = 403; $res.Close(); continue }
      New-Item -ItemType Directory -Force (Split-Path $full -Parent) | Out-Null
      $fs = [IO.File]::Create($full); $req.InputStream.CopyTo($fs); $fs.Close()
      $res.StatusCode = 201; $res.Close(); continue
    }
    if ($rel -ne "" -and -not $rel.EndsWith("/") -and (Test-Path -LiteralPath (Join-Path $rootPath $rel) -PathType Container)) {
      $res.StatusCode = 301; $res.RedirectLocation = $req.Url.AbsolutePath + "/" + $req.Url.Query; $res.Close(); continue
    }
    if ($rel -eq "" -or $rel.EndsWith("/")) { $rel += "index.html" }
    $file = [IO.Path]::GetFullPath((Join-Path $rootPath $rel))
    if (-not $file.StartsWith($rootPath)) { $res.StatusCode = 403; $res.Close(); continue }
    if (-not (Test-Path $file -PathType Leaf) -and (Test-Path "$file.html" -PathType Leaf)) { $file = "$file.html" }
    if (Test-Path $file -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
      $bytes = [IO.File]::ReadAllBytes($file)
    } else {
      $res.StatusCode = 404
      $res.ContentType = "text/html; charset=utf-8"
      $nf = Join-Path $rootPath "404.html"
      $bytes = if (Test-Path $nf) { [IO.File]::ReadAllBytes($nf) } else { [Text.Encoding]::UTF8.GetBytes("Not found") }
    }
    $res.Headers.Add("Content-Security-Policy", $csp)
    $res.Headers.Add("X-Content-Type-Options", "nosniff")
    $res.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin")
    $res.Headers.Add("Cache-Control", "no-store")
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch { try { $res.StatusCode = 500 } catch {} } finally { try { $res.Close() } catch {} }
}
