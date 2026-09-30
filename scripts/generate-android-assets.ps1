Add-Type -AssemblyName System.Drawing

$iconSrc   = "D:\GitRepo\Pickleballteamflow.app.orig\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png"
$splashSrc = "D:\GitRepo\Pickleballteamflow.app.orig\ios\App\App\Assets.xcassets\Splash.imageset\splash-2732x2732.png"
$base      = "D:\GitRepo\Pickleballteamflow.app.orig\android\app\src\main\res"

$iconImg   = [System.Drawing.Image]::FromFile($iconSrc)
$splashImg = [System.Drawing.Image]::FromFile($splashSrc)

function Resize-Image($img, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $bmp.SetResolution($img.HorizontalResolution, $img.VerticalResolution)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()
    return $bmp
}

function CropAndResize-Image($img, $w, $h) {
    $srcW = $img.Width; $srcH = $img.Height
    $ratio = $w / $h
    if ($ratio -gt ($srcW / $srcH)) {
        $cropW = $srcW; $cropH = [int]($srcW / $ratio)
    } else {
        $cropH = $srcH; $cropW = [int]($srcH * $ratio)
    }
    $cropX = [int](($srcW - $cropW) / 2)
    $cropY = [int](($srcH - $cropH) / 2)
    $cropped = New-Object System.Drawing.Bitmap($cropW, $cropH)
    $gc = [System.Drawing.Graphics]::FromImage($cropped)
    $gc.DrawImage($img,
        (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)),
        (New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)),
        [System.Drawing.GraphicsUnit]::Pixel)
    $gc.Dispose()
    $result = Resize-Image $cropped $w $h
    $cropped.Dispose()
    return $result
}

function Make-RoundIcon($img, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $bmp.SetResolution($img.HorizontalResolution, $img.VerticalResolution)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

# Launcher icons per density
$iconDensities = [ordered]@{
    "mipmap-mdpi"    = @{ launcher = 48;  foreground = 108 }
    "mipmap-hdpi"    = @{ launcher = 72;  foreground = 162 }
    "mipmap-xhdpi"   = @{ launcher = 96;  foreground = 216 }
    "mipmap-xxhdpi"  = @{ launcher = 144; foreground = 324 }
    "mipmap-xxxhdpi" = @{ launcher = 192; foreground = 432 }
}

foreach ($density in $iconDensities.Keys) {
    $s   = $iconDensities[$density]
    $dir = "$base\$density"

    $img = Resize-Image $iconImg $s.launcher $s.launcher
    $img.Save("$dir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose()

    $img = Resize-Image $iconImg $s.foreground $s.foreground
    $img.Save("$dir\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose()

    $img = Make-RoundIcon $iconImg $s.launcher
    $img.Save("$dir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose()

    Write-Host "Icons generated: $density"
}

# Splash screens per drawable folder
$splashTargets = @(
    @{ folder = "drawable";              w = 480;  h = 320  }
    @{ folder = "drawable-land-mdpi";    w = 480;  h = 320  }
    @{ folder = "drawable-land-hdpi";    w = 800;  h = 480  }
    @{ folder = "drawable-land-xhdpi";   w = 1280; h = 720  }
    @{ folder = "drawable-land-xxhdpi";  w = 1600; h = 960  }
    @{ folder = "drawable-land-xxxhdpi"; w = 1920; h = 1280 }
    @{ folder = "drawable-port-mdpi";    w = 320;  h = 480  }
    @{ folder = "drawable-port-hdpi";    w = 480;  h = 800  }
    @{ folder = "drawable-port-xhdpi";   w = 720;  h = 1280 }
    @{ folder = "drawable-port-xxhdpi";  w = 960;  h = 1600 }
    @{ folder = "drawable-port-xxxhdpi"; w = 1280; h = 1920 }
)

foreach ($t in $splashTargets) {
    $img = CropAndResize-Image $splashImg $t.w $t.h
    $img.Save("$base\$($t.folder)\splash.png", [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose()
    Write-Host "Splash generated: $($t.folder) ($($t.w)x$($t.h))"
}

# Play Store icon: 512x512, full square, no transparency, no rounded corners, no shadow
$playStorePath = "D:\GitRepo\Pickleballteamflow.app.orig\store-assets\play-store-icon.png"
$null = New-Item -ItemType Directory -Force -Path (Split-Path $playStorePath)
$psIcon = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$psIcon.SetResolution(72, 72)
$psG = [System.Drawing.Graphics]::FromImage($psIcon)
$psG.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$psG.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$psG.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$psG.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$psG.Clear([System.Drawing.Color]::White)
$psG.DrawImage($iconImg, 0, 0, 512, 512)
$psG.Dispose()
$psIcon.Save($playStorePath, [System.Drawing.Imaging.ImageFormat]::Png)
$psIcon.Dispose()
Write-Host "Play Store icon generated: $playStorePath (512x512)"

$iconImg.Dispose()
$splashImg.Dispose()
Write-Host "`nAll Android assets generated successfully."
