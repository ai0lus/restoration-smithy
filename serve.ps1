# Tiny static file server for local preview (no Node/Python needed).
# Usage: powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 8080]
param([int]$Port = 8080)
$root = $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'; '.gif'='image/gif'; '.svg'='image/svg+xml';
  '.wav'='audio/wav'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.woff2'='font/woff2' }
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '') { $path = 'index.html' }
  $file = [IO.Path]::GetFullPath((Join-Path $root $path))
  $res = $ctx.Response
  $res.Headers.Add('Cache-Control', 'no-store')
  if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $res.StatusCode = 404 }
  $res.Close()
}
