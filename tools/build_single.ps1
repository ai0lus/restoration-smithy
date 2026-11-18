# Builds ONE self-contained HTML file you can send to anyone (email, messenger, USB...).
# All scripts are inlined and the images the game uses are embedded as data URLs,
# so it opens with a double-click: no server, no other files needed.
#   Run from the project root:  powershell -ExecutionPolicy Bypass -File tools\build_single.ps1
#   Output: dist\restoration-smithy.html
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$img  = Join-Path $root 'assets\images'
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

# PNG -> data URL. Images taller/wider than $max are shrunk first (keeps the file small).
function To-DataUrl($path, $max) {
  $im = [System.Drawing.Image]::FromFile($path)
  try {
    $s = [Math]::Min(1.0, $max / [Math]::Max($im.Width, $im.Height))
    if ($s -ge 1.0) { $bytes = [IO.File]::ReadAllBytes($path) }
    else {
      $w = [int][Math]::Round($im.Width * $s); $h = [int][Math]::Round($im.Height * $s)
      $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
      $g.DrawImage($im, 0, 0, $w, $h); $g.Dispose()
      $ms = New-Object IO.MemoryStream
      $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
      $bytes = $ms.ToArray(); $ms.Dispose()
    }
  } finally { $im.Dispose() }
  return 'data:image/png;base64,' + [Convert]::ToBase64String($bytes)
}

# Only the images the game actually draws (see Assets.load in src/game.js).
$embed = [ordered]@{}
Get-ChildItem "$img\clients" -Filter *.png | ForEach-Object { $embed["clients/$($_.BaseName)"] = To-DataUrl $_.FullName 768 }
Get-ChildItem "$img\items"   -Filter *.png | ForEach-Object { $embed["items/$($_.BaseName)"]   = To-DataUrl $_.FullName 384 }
Get-ChildItem "$img\ui"      -Filter 'icon_*.png' | ForEach-Object { $embed["ui/$($_.BaseName)"] = To-DataUrl $_.FullName 160 }

$sb = New-Object Text.StringBuilder
[void]$sb.Append('<script>window.EMBED_ASSETS={')
$first = $true
foreach ($k in $embed.Keys) {
  if (-not $first) { [void]$sb.Append(',') }; $first = $false
  [void]$sb.Append('"').Append($k).Append('":"').Append($embed[$k]).Append('"')
}
[void]$sb.Append('};</script>')
$assetTag = $sb.ToString()

$utf8 = New-Object Text.UTF8Encoding($false)
$html = [IO.File]::ReadAllText((Join-Path $root 'index.html'), $utf8)

# inline every <script src="src/..."></script>
$html = [Text.RegularExpressions.Regex]::Replace($html, '<script src="(src/[^"]+)"></script>', {
  param($m)
  $code = [IO.File]::ReadAllText((Join-Path $root $m.Groups[1].Value), $utf8)
  if ($code -match '</script') { throw "$($m.Groups[1].Value) contains </script>" }
  "<script>`n$code`n</script>"
})
# images go in right before the first script (assets.js reads them at load time)
$i = $html.IndexOf('<script>')
$html = $html.Substring(0, $i) + $assetTag + "`n  " + $html.Substring($i)

$out = Join-Path $dist 'restoration-smithy.html'
[IO.File]::WriteAllText($out, $html, $utf8)
'{0} images embedded' -f $embed.Count
'{0}  {1:N1} MB' -f $out, ((Get-Item $out).Length / 1MB)
