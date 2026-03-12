$ErrorActionPreference = "Stop"

function ConvertTo-PlainText {
    param([Parameter(Mandatory = $true)][Security.SecureString]$SecureValue)

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Get-EnvValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $item = Get-Item "Env:$Name" -ErrorAction SilentlyContinue
    if ($null -eq $item) {
        return ""
    }

    return [string]$item.Value
}

function Set-RequiredEnvKey {
    param([Parameter(Mandatory = $true)][string]$Name)

    $current = Get-EnvValue -Name $Name
    if (-not [string]::IsNullOrWhiteSpace($current)) {
        $currentTrim = $current.Trim()
        if ($currentTrim.Length -ge 20) {
            return
        }
        Write-Host "$Name is currently set but too short (len=$($currentTrim.Length)). Re-entering..." -ForegroundColor Yellow
    }

    while ($true) {
        $plain = (Read-Host "Enter runtime value for $Name").Trim()
        if (-not [string]::IsNullOrWhiteSpace($plain)) {
            if ($plain.Length -lt 20) {
                Write-Host "$Name looks too short (len=$($plain.Length)). Paste full key and try again." -ForegroundColor Yellow
                continue
            }
            Set-Item "Env:$Name" $plain
            return
        }
        Write-Host "Value cannot be empty." -ForegroundColor Yellow
    }
}

function ConvertTo-SingleQuoteEscapedString {
    param([Parameter(Mandatory = $true)][string]$Value)
    return $Value -replace "'", "''"
}

function Resolve-ShellExecutable {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($null -ne $pwsh) {
        return $pwsh.Source
    }

    $powershell = Get-Command powershell -ErrorAction SilentlyContinue
    if ($null -ne $powershell) {
        return $powershell.Source
    }

    throw "Could not find pwsh or powershell executable."
}

function Open-Terminal {
    param(
        [Parameter(Mandatory = $true)][string]$ShellPath,
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$WorkDir,
        [Parameter(Mandatory = $true)][string]$CommandBody
    )

    $workDirEscaped = ConvertTo-SingleQuoteEscapedString -Value $WorkDir
    $titleEscaped = ConvertTo-SingleQuoteEscapedString -Value $Title

    $script = @"
`$Host.UI.RawUI.WindowTitle = '$titleEscaped'
Set-Location '$workDirEscaped'
$CommandBody
"@

    Start-Process -FilePath $ShellPath -ArgumentList "-NoExit", "-Command", $script | Out-Null
}

function Resolve-WindowsTerminalExecutable {
    $wt = Get-Command wt -ErrorAction SilentlyContinue
    if ($null -eq $wt) {
        return ""
    }
    return $wt.Source
}

function Test-DockerDesktopRunning {
    $candidates = @("Docker Desktop", "com.docker.backend")
    $running = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -in $candidates }
    return $null -ne $running
}

function Start-DockerDesktop {
    $possiblePaths = @(
        (Join-Path $env:ProgramFiles "Docker\\Docker\\Docker Desktop.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Docker\\Docker\\Docker Desktop.exe"),
        (Join-Path $env:LocalAppData "Programs\\Docker\\Docker\\Docker Desktop.exe")
    )

    foreach ($path in $possiblePaths) {
        if (-not [string]::IsNullOrWhiteSpace($path) -and (Test-Path $path)) {
            Start-Process -FilePath $path | Out-Null
            return
        }
    }

    throw "Docker Desktop is not running and Docker Desktop executable was not found."
}

function Wait-ForDockerEngine {
    param([int]$TimeoutSeconds = 180)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            docker info *> $null
            return
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "Docker engine did not become ready within $TimeoutSeconds seconds."
}

function Start-DockerComposeStack {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -eq $docker) {
        throw "docker CLI not found. Install Docker Desktop first."
    }

    if (-not (Test-DockerDesktopRunning)) {
        Write-Host "Docker Desktop is not running. Starting Docker Desktop..." -ForegroundColor Yellow
        Start-DockerDesktop
    }
    else {
        Write-Host "Docker Desktop is already running." -ForegroundColor DarkGray
    }

    Write-Host "Waiting for Docker engine..." -ForegroundColor DarkGray
    Wait-ForDockerEngine

    Write-Host "Running docker compose up -d..." -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
        docker compose up -d
    }
    finally {
        Pop-Location
    }
}

function Open-WindowsTerminalTabs {
    param(
        [Parameter(Mandatory = $true)][string]$WindowsTerminalPath,
        [Parameter(Mandatory = $true)][string]$ShellPath,
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [Parameter(Mandatory = $true)][string]$LauncherScriptPath
    )

    $frontendDir = Join-Path $RepoRoot "frontend"

    # Use -d and -File to avoid semicolon parsing issues inside wt command strings.
    $arguments = @(
        "-w", "new",
        "new-tab", "--title", "Moodbound Frontend", "-d", $frontendDir, $ShellPath, "-NoExit", "-Command", "npm run dev",
        ";",
        "new-tab", "--title", "Moodbound API (Uvicorn)", "-d", $RepoRoot, $ShellPath, "-NoExit", "-File", $LauncherScriptPath, "-Mode", "uvicorn",
        ";",
        "new-tab", "--title", "Moodbound Worker (ARQ)", "-d", $RepoRoot, $ShellPath, "-NoExit", "-File", $LauncherScriptPath, "-Mode", "arq"
    )

    & $WindowsTerminalPath @arguments
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$shellPath = Resolve-ShellExecutable
$windowsTerminalPath = Resolve-WindowsTerminalExecutable
$launcherScriptPath = (Join-Path $PSScriptRoot "start-backend.ps1")
$launcherScriptPathEscaped = ConvertTo-SingleQuoteEscapedString -Value $launcherScriptPath

Start-DockerComposeStack -RepoRoot $repoRoot

Write-Host "Enter API keys once. They will be inherited by Uvicorn and ARQ terminals for this run only." -ForegroundColor Cyan
Set-RequiredEnvKey -Name "GOOGLE_API_KEY"
Set-RequiredEnvKey -Name "OPENAI_API_KEY"
Set-RequiredEnvKey -Name "DEEPSEEK_API_KEY"

if (-not [string]::IsNullOrWhiteSpace($windowsTerminalPath)) {
    Open-WindowsTerminalTabs -WindowsTerminalPath $windowsTerminalPath -ShellPath $shellPath -RepoRoot $repoRoot -LauncherScriptPath $launcherScriptPath
    Write-Host "Opened 1 Windows Terminal window with 3 tabs: frontend, uvicorn, and arq." -ForegroundColor Green
}
else {
    Write-Host "Windows Terminal (wt) not found. Falling back to 3 separate windows." -ForegroundColor Yellow
    Open-Terminal -ShellPath $shellPath -Title "Moodbound Frontend" -WorkDir (Join-Path $repoRoot "frontend") -CommandBody "npm run dev"
    Open-Terminal -ShellPath $shellPath -Title "Moodbound API (Uvicorn)" -WorkDir $repoRoot -CommandBody "& '$launcherScriptPathEscaped' -Mode uvicorn"
    Open-Terminal -ShellPath $shellPath -Title "Moodbound Worker (ARQ)" -WorkDir $repoRoot -CommandBody "& '$launcherScriptPathEscaped' -Mode arq"
    Write-Host "Opened 3 separate windows: frontend, uvicorn, and arq." -ForegroundColor Green
}
