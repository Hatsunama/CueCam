# CueCam

CueCam is a phone-first teleprompter and video recorder built with Expo 57 and React Native.

## Install on an Android phone

The simplest installation uses only the phone:

1. Tap **[Download CueCam 1.0.13 for Android](https://github.com/Hatsunama/CueCam/releases/download/v1.0.13/cuecam-1.0.13-arm64-v8a-release.apk)** in the phone's web browser.
2. Open the downloaded APK.
3. If Android blocks the installation, tap **Settings**, enable **Allow from this source** for the browser, then return to the installer. On Android 7, enable **Unknown sources** under **Settings > Security** instead.
4. Tap **Install**, then **Open**.
5. Allow camera, microphone, and add-only video-saving access when CueCam requests them before the first recording.

The APK and checksum are also available on the [latest CueCam release page](https://github.com/Hatsunama/CueCam/releases/latest).

The downloadable build requires Android 7.0 or newer and a 64-bit ARM (`arm64-v8a`) phone. It is not an iPhone package. CueCam does not currently have a public App Store or TestFlight release.

Android warns about apps installed outside Google Play. You can verify this release using its SHA-256 checksum:

```text
D6F9363454F96A99DCDA9443B6691B21EEFF572FE4A090D137E56969CF8D05A3
```

Installing a newer CueCam APK over the existing app normally preserves scripts and settings.

## Direct streamed install from GitHub (Windows + USB)

This installs the published GitHub release directly onto a connected Android phone. It does not require a local build. The APK is streamed to `adb` and the temporary download is removed when the command finishes.

1. Install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools) and enable USB debugging on the phone.
2. Open PowerShell in the `platform-tools` folder, connect the phone, approve the USB debugging prompt, and run:

```powershell
$ErrorActionPreference = 'Stop'
$Version = '1.0.13'
$FileName = "cuecam-$Version-arm64-v8a-release.apk"
$Url = "https://github.com/Hatsunama/CueCam/releases/download/v$Version/$FileName"
$ExpectedHash = 'D6F9363454F96A99DCDA9443B6691B21EEFF572FE4A090D137E56969CF8D05A3'
$Apk = Join-Path $env:TEMP $FileName

try {
    $Devices = @(.\adb.exe devices | Select-Object -Skip 1 | Where-Object { $_ -match '^\S+\s+device$' })
    if ($Devices.Count -eq 0) { throw 'No authorized Android phone was found. Unlock it and approve USB debugging.' }
    if ($Devices.Count -gt 1) { throw "Multiple authorized Android phones are connected ($($Devices.Count)). Disconnect all but the intended phone and run this again." }
    $Serial = ($Devices[0] -split '\s+')[0]
    if ((.\adb.exe -s $Serial get-state).Trim() -ne 'device') { throw "The detected phone $Serial is not ready." }

    Invoke-WebRequest -Uri $Url -OutFile $Apk
    $ActualHash = (Get-FileHash -LiteralPath $Apk -Algorithm SHA256).Hash
    if ($ActualHash -ne $ExpectedHash) { throw 'Checksum mismatch. Installation refused.' }

    .\adb.exe -s $Serial install -r --streaming $Apk
    .\adb.exe -s $Serial shell pm enable --user 0 com.thea.cuecam | Out-Host
    .\adb.exe -s $Serial shell am start -W -n com.thea.cuecam/.MainActivity | Out-Host
} finally {
    if (Test-Path -LiteralPath $Apk) { Remove-Item -LiteralPath $Apk -Force }
}
```

`--streaming` sends the verified GitHub release through ADB without retaining an APK in the project folder. The update uses `-r`, so the existing script and settings remain intact.

## Install from a Windows PC

This method is useful when browser installation is unavailable.

1. Download and extract Google's [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools).
2. On the phone, enable **Developer options** by tapping **Build number** seven times in **Settings > About phone**.
3. Enable **USB debugging** in Developer options.
4. Connect the phone by USB and approve its debugging prompt.
5. Open PowerShell in the extracted `platform-tools` directory and run:

```powershell
$Version = '1.0.13'
$FileName = "cuecam-$Version-arm64-v8a-release.apk"
$Apk = Join-Path $env:TEMP $FileName
$Url = "https://github.com/Hatsunama/CueCam/releases/download/v$Version/$FileName"
$ExpectedHash = 'D6F9363454F96A99DCDA9443B6691B21EEFF572FE4A090D137E56969CF8D05A3'

Invoke-WebRequest -Uri $Url -OutFile $Apk
$ActualHash = (Get-FileHash -LiteralPath $Apk -Algorithm SHA256).Hash
if ($ActualHash -ne $ExpectedHash) {
    throw "Checksum mismatch. Delete $Apk and do not install it."
}

.\adb.exe devices
.\adb.exe install -r --no-streaming $Apk
```

Approve the phone's debugging prompt if it appears after `adb devices`, then run the last two commands again. A successful installation ends with `Success`.

## Install from Termux on the phone

This method downloads and verifies CueCam from a Termux shell, but Android still displays its normal installation confirmation.

1. In Android settings, open **Apps > Special app access > Install unknown apps > Termux** and enable **Allow from this source**. On Android 7, enable **Unknown sources** under **Settings > Security** instead. The exact menu name varies by phone manufacturer.
2. In Termux, run:

```sh
pkg update
pkg install curl coreutils

VERSION='1.0.13'
FILE="cuecam-$VERSION-arm64-v8a-release.apk"
URL="https://github.com/Hatsunama/CueCam/releases/download/v$VERSION/$FILE"
EXPECTED='D6F9363454F96A99DCDA9443B6691B21EEFF572FE4A090D137E56969CF8D05A3'

curl --fail --location "$URL" --output "$FILE"
printf '%s  %s\n' "$EXPECTED" "$FILE" | sha256sum --check
termux-open --view --content-type application/vnd.android.package-archive "$FILE"
```

3. Android's package installer opens after the checksum reports `OK`. Tap **Install**, then **Open**.

## Troubleshooting installation

- **App not installed:** confirm the phone uses the ARM64 architecture and runs Android 7.0 or newer.
- **ADB shows `unauthorized`:** unlock the phone, approve the USB debugging prompt, then run `adb devices` again.
- **`INSTALL_FAILED_UPDATE_INCOMPATIBLE`:** the installed copy was signed by a different developer key. Back up any scripts you need, uninstall the old copy, and install the release again. Uninstalling erases CueCam's locally stored scripts and settings.
- **The installer does not open from Termux:** confirm Termux has permission to install unknown apps, then rerun the `termux-open` command.

## Features

- Adjustable text size and automatic scrolling speed
- Start recording from any manually selected place in the script
- Drag the script up or down during recording, then automatically resume scrolling
- Portrait and landscape layouts
- Camera recording saved to the phone's normal media library
- Movable and resizable prompt frame with an animated crop-style border
- Live scroll-position marker that follows the prompt from top to bottom
- Scripts up to 300,000 characters
- Countdown, mirroring, camera switching, and persistent script settings

Flipping cameras during a take continues the CueCam session and saves each camera segment as an adjacent clip in the phone gallery.

## Privacy

CueCam has no accounts, analytics, advertising, or backend service. Scripts and prompt preferences stay in local app storage. Camera and microphone access are used only while recording. Gallery access is requested only when a finished clip needs to be added to the phone's media library. Android cloud backup is disabled so scripts are not copied into device backups.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Develop from source

Install the current Node.js LTS release and the Android development tools, then run:

```sh
npm install
npx expo start
```

For a native Android development build on a connected phone:

```sh
npx expo run:android
```

Before producing a release:

```sh
npm run check
```

On Windows, this command creates a clean ARM64 release from committed source, verifies it, installs it on exactly one connected Android phone, and writes the APK to `builds/`:

```powershell
npm run install:android:release
```
