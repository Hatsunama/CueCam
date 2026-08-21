[CmdletBinding()]
param(
    [switch]$KeepBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param(
        [Parameter(Mandatory)]
        [string]$Command,
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

function Get-Sha256 {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $algorithm = [System.Security.Cryptography.SHA256]::Create()
        try {
            return -join ($algorithm.ComputeHash($stream) | ForEach-Object { $_.ToString('X2') })
        }
        finally {
            $algorithm.Dispose()
        }
    }
    finally {
        $stream.Dispose()
    }
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packageName = 'com.thea.cuecam'
$appConfig = (Get-Content (Join-Path $projectRoot 'app.json') -Raw | ConvertFrom-Json).expo
$expectedVersion = [string]$appConfig.version
$expectedVersionCode = [string]$appConfig.android.versionCode
$stageRoot = Join-Path "$env:SystemDrive\" "CueCamBuild-$PID"
$archivePath = Join-Path $env:TEMP "CueCamBuild-$PID.zip"
$buildSucceeded = $false
$previousNodeEnvironment = $env:NODE_ENV

Push-Location $projectRoot
try {
    $worktreeChanges = @(git status --porcelain --untracked-files=normal)
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to inspect the Git worktree.'
    }
    if ($worktreeChanges.Count -ne 0) {
        throw 'The Git worktree must be clean so the installed APK exactly matches a commit.'
    }

    $phoneSerials = @(
        adb devices |
        Select-Object -Skip 1 |
        ForEach-Object {
            if ($_ -match '^(\S+)\s+device$') {
                $Matches[1]
            }
        }
    )
    if ($phoneSerials.Count -ne 1) {
        throw "Expected exactly one authorized Android phone. Found $($phoneSerials.Count)."
    }

    $phoneSerial = $phoneSerials[0]
    $deviceAbi = (adb -s $phoneSerial shell getprop ro.product.cpu.abi).Trim()
    if ($LASTEXITCODE -ne 0 -or $deviceAbi -notin @('arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64')) {
        throw "Unsupported or unreadable device ABI: $deviceAbi"
    }

    $systemDriveName = $env:SystemDrive.TrimEnd(':')
    $systemDrive = Get-PSDrive -Name $systemDriveName
    if ($systemDrive.Free -lt 8GB) {
        throw "$env:SystemDrive requires at least 8 GB free for a clean native release build."
    }
    if (Test-Path -LiteralPath $stageRoot) {
        throw "Build staging path already exists: $stageRoot"
    }
    if (Test-Path -LiteralPath $archivePath) {
        throw "Build archive already exists: $archivePath"
    }

    New-Item -ItemType Directory -Path $stageRoot | Out-Null
    Invoke-Checked -Command 'git' -Arguments @('archive', '--format=zip', "--output=$archivePath", 'HEAD')
    Expand-Archive -LiteralPath $archivePath -DestinationPath $stageRoot
    Remove-Item -LiteralPath $archivePath -Force

    Push-Location $stageRoot
    try {
        Invoke-Checked -Command 'npm.cmd' -Arguments @('ci', '--no-audit', '--no-fund', '--prefer-offline')
        Invoke-Checked -Command 'npm.cmd' -Arguments @('ls', '--depth=0')
        Invoke-Checked -Command 'npm.cmd' -Arguments @('run', 'check')

        $env:NODE_ENV = 'production'
        Invoke-Checked -Command 'npx.cmd' -Arguments @('expo', 'prebuild', '--clean', '--platform', 'android', '--no-install')

        Push-Location 'android'
        try {
            Invoke-Checked -Command '.\gradlew.bat' -Arguments @('app:assembleRelease', "-PreactNativeArchitectures=$deviceAbi", '--no-daemon')
        }
        finally {
            Pop-Location
        }

        $apkPath = (Resolve-Path '.\android\app\build\outputs\apk\release\app-release.apk').Path
        $buildTools = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Directory |
            Sort-Object { [version]$_.Name } -Descending |
            Select-Object -First 1
        if (-not $buildTools) {
            throw 'Android SDK build tools were not found.'
        }

        $aapt = Join-Path $buildTools.FullName 'aapt.exe'
        $apksigner = Join-Path $buildTools.FullName 'apksigner.bat'
        $badging = @(& $aapt dump badging $apkPath)
        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to inspect the APK manifest.'
        }

        $packageLine = $badging | Select-String '^package:' | Select-Object -First 1
        $nativeLine = $badging | Select-String '^native-code:' | Select-Object -First 1
        if ($packageLine -notmatch "name='$([regex]::Escape($packageName))'") {
            throw "Unexpected APK package identity: $packageLine"
        }
        if ($packageLine -notmatch "versionCode='$([regex]::Escape($expectedVersionCode))'") {
            throw "Unexpected APK version code: $packageLine"
        }
        if ($packageLine -notmatch "versionName='$([regex]::Escape($expectedVersion))'") {
            throw "Unexpected APK version name: $packageLine"
        }
        if ($nativeLine -notmatch "'$([regex]::Escape($deviceAbi))'") {
            throw "The APK does not contain the connected phone's ABI: $deviceAbi"
        }

        $permissions = @(& $aapt dump permissions $apkPath)
        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to inspect APK permissions.'
        }
        $forbiddenPermissions = @(
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.INTERNET',
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.READ_MEDIA_VIDEO',
            'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
            'android.permission.SYSTEM_ALERT_WINDOW'
        )
        foreach ($permission in $forbiddenPermissions) {
            if ($permissions -match [regex]::Escape($permission)) {
                throw "Forbidden permission present in APK: $permission"
            }
        }

        Invoke-Checked -Command $apksigner -Arguments @('verify', '--verbose', '--print-certs', $apkPath)
        $apkHash = Get-Sha256 -Path $apkPath
        $appVersion = (Get-Content '.\package.json' -Raw | ConvertFrom-Json).version
        $artifactDirectory = Join-Path $projectRoot 'builds'
        New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
        $artifactPath = Join-Path $artifactDirectory "cuecam-$appVersion-$deviceAbi-release.apk"
        Copy-Item -LiteralPath $apkPath -Destination $artifactPath -Force

        $deviceState = adb -s $phoneSerial get-state
        if ($LASTEXITCODE -ne 0 -or $deviceState -ne 'device') {
            throw 'The phone disconnected before installation.'
        }

        $installResult = @(adb -s $phoneSerial install -r --no-streaming $artifactPath)
        if ($LASTEXITCODE -ne 0 -or $installResult -notcontains 'Success') {
            throw "Android rejected the in-place install. Existing app data was not deleted. $($installResult -join ' ')"
        }

        $deviceApkPathLine = (adb -s $phoneSerial shell pm path $packageName).Trim()
        if ($LASTEXITCODE -ne 0 -or $deviceApkPathLine -notmatch '^package:(.+)$') {
            throw 'Unable to locate the installed APK on the phone.'
        }
        $deviceApkPath = $Matches[1]
        $deviceHashLine = (adb -s $phoneSerial shell sha256sum $deviceApkPath).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $deviceHashLine) {
            throw 'Unable to hash the installed APK on the phone.'
        }
        $deviceHash = ($deviceHashLine -split '\s+')[0].ToUpperInvariant()
        if ($deviceHash -ne $apkHash) {
            throw "Installed APK hash mismatch. Expected $apkHash but found $deviceHash."
        }

        $launchableActivity = (adb -s $phoneSerial shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER $packageName).Trim()
        if ($LASTEXITCODE -ne 0 -or $launchableActivity -notmatch [regex]::Escape($packageName)) {
            throw 'CueCam installed without a resolvable launcher activity.'
        }

        $buildSucceeded = $true
        Write-Host "CueCam $appVersion installed on $phoneSerial." -ForegroundColor Green
        Write-Host "APK: $artifactPath"
        Write-Host "SHA-256: $apkHash"
    }
    finally {
        Pop-Location
    }
}
finally {
    $env:NODE_ENV = $previousNodeEnvironment
    Pop-Location

    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }

    if ($buildSucceeded -and -not $KeepBuild -and (Test-Path -LiteralPath $stageRoot)) {
        $resolvedStage = [System.IO.Path]::GetFullPath($stageRoot)
        $expectedPrefix = "$env:SystemDrive\CueCamBuild-"
        if (-not $resolvedStage.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove unexpected staging path: $resolvedStage"
        }
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
    elseif (-not $buildSucceeded -and (Test-Path -LiteralPath $stageRoot)) {
        Write-Warning "Build staging was preserved for diagnosis: $stageRoot"
    }
}
