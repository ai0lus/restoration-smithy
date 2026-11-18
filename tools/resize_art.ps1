# Shrinks Codex-generated PNGs for mobile.
# Originals are kept in art_src/ (same sub-paths); resized copies go to assets/images/.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File tools\resize_art.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$img  = Join-Path $root 'assets\images'
$src  = Join-Path $root 'art_src'

# max long-edge size per folder / file prefix
function Get-MaxEdge($rel) {
  if ($rel -like 'smith\*')        { return 1024 }
  if ($rel -like 'items\*')        { return 384 }
  if ($rel -like 'ui\bg_*')        { return 1080 }
  if ($rel -like 'ui\icon_*')      { return 160 }
  if ($rel -like 'ui\*')           { return 512 }   # 9-slice frames
  return 1024
}

Get-ChildItem $img -Recurse -Filter *.png | ForEach-Object {
  $rel = $_.FullName.Substring($img.Length + 1)
  $orig = Join-Path $src $rel
  # first run: move the full-size original into art_src/
  if (-not (Test-Path $orig)) {
    New-Item -ItemType Directory -Force (Split-Path $orig) | Out-Null
    Copy-Item $_.FullName $orig
  }
  $max = Get-MaxEdge $rel
  $im = [System.Drawing.Image]::FromFile($orig)
  $s = [Math]::Min(1.0, $max / [Math]::Max($im.Width, $im.Height))
  $w = [int][Math]::Round($im.Width * $s); $h = [int][Math]::Round($im.Height * $s)
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $g.DrawImage($im, 0, 0, $w, $h)
  $g.Dispose(); $im.Dispose()
  $bmp.Save($_.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  '{0,-28} {1,5}x{2,-5} {3,7:N0} KB' -f $rel, $w, $h, ((Get-Item $_.FullName).Length / 1KB)
}
