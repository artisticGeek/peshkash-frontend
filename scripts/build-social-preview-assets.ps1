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

function Draw-PeshkashLogo([System.Drawing.Graphics]$graphics, [int]$x, [int]$y, [int]$width, [string]$surface = 'Dark') {
  $logoPath = Join-Path $PSScriptRoot "assets\Peshkash-Primary-For-$surface-2000px.png"
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

# Generic Peshkash preview.
$canvas = New-Canvas '#F5F2EE'
$bitmap = $canvas[0]
$graphics = $canvas[1]
$gold = New-Brush '#BD945A'
$bone = New-Brush '#E8DBCE'
$stone = New-Brush '#C5AF9D'
$paper = New-Brush '#1A1410'
$muted = New-Brush '#564C40'
$graphics.FillRectangle($gold, 60, 60, 8, 510)
$graphics.FillRectangle($bone, 930, 0, 270, 630)
$graphics.FillEllipse($stone, 785, -105, 475, 475)
$graphics.FillEllipse($bone, 860, -30, 350, 350)
$ring = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#8C7667'), 3)
$graphics.DrawEllipse($ring, 910, 20, 350, 350)
$ring.Dispose()
$graphics.FillRectangle($gold, 930, 568, 270, 62)
Draw-PeshkashLogo $graphics 100 70 240 'Light'
$graphics.DrawString('Show your peshkash', [System.Drawing.Font]::new($serif, 62, [System.Drawing.FontStyle]::Regular), $paper, 105, 206)
$graphics.DrawString('to the world.', [System.Drawing.Font]::new($serif, 84, [System.Drawing.FontStyle]::Italic), $gold, 105, 292)
$graphics.DrawString('Open. Save. Share.', [System.Drawing.Font]::new($sans, 25, [System.Drawing.FontStyle]::Regular), $muted, 111, 464)
Save-Jpeg $bitmap (Join-Path $outputDir 'peshkash-home-preview.jpg')
$gold.Dispose(); $bone.Dispose(); $stone.Dispose(); $paper.Dispose(); $muted.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

# Exhibitions preview.
$canvas = New-Canvas '#18130F'
$bitmap = $canvas[0]
$graphics = $canvas[1]
$photoPath = Join-Path $PSScriptRoot '..\public\resources\exhibits\atelier-hero.png'
$photo = [System.Drawing.Bitmap]::FromFile([System.IO.Path]::GetFullPath($photoPath))
$photoSource = [System.Drawing.Rectangle]::new(691, 0, 845, 1024)
$photoDestination = [System.Drawing.Rectangle]::new(680, 0, 520, 630)
$graphics.DrawImage($photo, $photoDestination, $photoSource, [System.Drawing.GraphicsUnit]::Pixel)
$photo.Dispose()

$ink = New-Brush '#18130F'
$gold = New-Brush '#A87B45'
$muted = New-Brush '#C8B6A3'
$graphics.FillRectangle($ink, 0, 0, 680, 630)
$graphics.FillRectangle($gold, 678, 0, 3, 630)
$paper = New-Brush '#F8F2E9'
Draw-PeshkashLogo $graphics 72 54 235
$graphics.DrawString('Peshkash for', [System.Drawing.Font]::new($serif, 55, [System.Drawing.FontStyle]::Regular), $paper, 69, 176)
$graphics.DrawString('exhibitions', [System.Drawing.Font]::new($serif, 72, [System.Drawing.FontStyle]::Italic), $paper, 69, 240)
$graphics.FillRectangle($gold, 75, 382, 76, 4)
$graphics.DrawString('Every stall.', [System.Drawing.Font]::new($serif, 32, [System.Drawing.FontStyle]::Regular), $paper, 72, 410)
$graphics.DrawString('Still discoverable.', [System.Drawing.Font]::new($serif, 32, [System.Drawing.FontStyle]::Regular), $paper, 72, 454)
$graphics.DrawString('One scan connects the whole floor.', [System.Drawing.Font]::new($sans, 19, [System.Drawing.FontStyle]::Regular), $muted, 76, 552)
Save-Jpeg $bitmap (Join-Path $outputDir 'peshkash-exhibits-preview.jpg')
$ink.Dispose(); $gold.Dispose(); $muted.Dispose(); $paper.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

Get-ChildItem -LiteralPath $outputDir -Filter 'peshkash-*-preview.jpg' | Select-Object Name, Length
