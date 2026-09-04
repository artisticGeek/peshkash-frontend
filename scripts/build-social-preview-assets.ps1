Add-Type -AssemblyName System.Drawing

$outputDir = Join-Path $PSScriptRoot '..\public\brand\social'
$outputDir = [System.IO.Path]::GetFullPath($outputDir)
[System.IO.Directory]::CreateDirectory($outputDir) | Out-Null

function New-Brush([string]$hex) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Save-Jpeg([System.Drawing.Bitmap]$bitmap, [string]$path) {
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
  $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]88)
  $bitmap.Save($path, $encoder, $parameters)
  $parameters.Dispose()
}

function New-Canvas([string]$background) {
  $bitmap = [System.Drawing.Bitmap]::new(1200, 630)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $brush = New-Brush $background
  $graphics.FillRectangle($brush, 0, 0, 1200, 630)
  $brush.Dispose()
  return @($bitmap, $graphics)
}

function Draw-PeshkashLogo([System.Drawing.Graphics]$graphics, [int]$x, [int]$y, [int]$width) {
  $logoPath = Join-Path $PSScriptRoot 'assets\Peshkash-Primary-For-Dark-2000px.png'
  $logo = [System.Drawing.Bitmap]::FromFile([System.IO.Path]::GetFullPath($logoPath))
  # Exact visible bounds of the approved Primary-For-Dark brand-kit lockup.
  $source = [System.Drawing.Rectangle]::new(332, 155, 1377, 437)
  $height = [Math]::Round($width * $source.Height / $source.Width)
  $destination = [System.Drawing.Rectangle]::new($x, $y, $width, $height)
  $graphics.DrawImage($logo, $destination, $source, [System.Drawing.GraphicsUnit]::Pixel)
  $logo.Dispose()
}

$serif = 'Georgia'
$sans = 'Arial'

# Global and unavailable fallback.
$canvas = New-Canvas '#1B1511'
$bitmap = $canvas[0]
$graphics = $canvas[1]
$gold = New-Brush '#BD945A'
$paper = New-Brush '#F4EEE5'
$muted = New-Brush '#C8B6A3'
$graphics.FillRectangle($gold, 60, 60, 8, 510)
$graphics.DrawEllipse([System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#5C4936'), 2), 895, 72, 235, 235)
$graphics.DrawEllipse([System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#8A6A48'), 2), 945, 122, 235, 235)
Draw-PeshkashLogo $graphics 100 70 240
$graphics.DrawString('Your shop window,', [System.Drawing.Font]::new($serif, 70, [System.Drawing.FontStyle]::Regular), $paper, 105, 206)
$graphics.DrawString('digitally', [System.Drawing.Font]::new($serif, 90, [System.Drawing.FontStyle]::Italic), $paper, 105, 292)
$graphics.DrawString('Open. Save. Share.', [System.Drawing.Font]::new($sans, 25, [System.Drawing.FontStyle]::Regular), $muted, 111, 464)
Save-Jpeg $bitmap (Join-Path $outputDir 'peshkash-home-preview.jpg')
$gold.Dispose(); $paper.Dispose(); $muted.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

# Exhibitions proposition fallback.
$canvas = New-Canvas '#F2ECE3'
$bitmap = $canvas[0]
$graphics = $canvas[1]
$ink = New-Brush '#211812'
$gold = New-Brush '#A87B45'
$soft = New-Brush '#DCCBB7'
$graphics.FillRectangle($ink, 0, 0, 430, 630)
for ($i = 0; $i -lt 4; $i++) {
  $x = 500 + ($i * 150)
  $graphics.FillRectangle($soft, $x, 82, 110, 378)
  $graphics.FillRectangle($gold, $x + 16, 105, 78, 7)
  $graphics.DrawRectangle([System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#BFA98E'), 2), $x, 82, 110, 378)
}
$paper = New-Brush '#F8F2E9'
Draw-PeshkashLogo $graphics 58 62 220
$graphics.DrawString('for', [System.Drawing.Font]::new($serif, 42, [System.Drawing.FontStyle]::Italic), $paper, 58, 164)
$graphics.DrawString('exhibitions', [System.Drawing.Font]::new($serif, 48, [System.Drawing.FontStyle]::Regular), $paper, 58, 218)
$graphics.DrawString('Every stall.', [System.Drawing.Font]::new($serif, 29, [System.Drawing.FontStyle]::Regular), $paper, 61, 372)
$graphics.DrawString('Still discoverable.', [System.Drawing.Font]::new($serif, 29, [System.Drawing.FontStyle]::Regular), $paper, 61, 414)
$graphics.DrawString('One scan connects the whole floor.', [System.Drawing.Font]::new($sans, 21, [System.Drawing.FontStyle]::Regular), $ink, 501, 510)
Save-Jpeg $bitmap (Join-Path $outputDir 'peshkash-exhibits-preview.jpg')
$ink.Dispose(); $gold.Dispose(); $soft.Dispose(); $paper.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

Get-ChildItem -LiteralPath $outputDir -Filter 'peshkash-*-preview.jpg' | Select-Object Name, Length
