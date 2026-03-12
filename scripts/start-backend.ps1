param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("uvicorn", "arq")]
    [string]$Mode
)

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
        $plain = (Read-Host "$Name is required. Enter value").Trim()
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

Set-Location (Join-Path $PSScriptRoot "..\\backend")

Set-RequiredEnvKey -Name "GOOGLE_API_KEY"
Set-RequiredEnvKey -Name "OPENAI_API_KEY"
Set-RequiredEnvKey -Name "DEEPSEEK_API_KEY"

if ($Mode -eq "uvicorn") {
    Write-Host "Starting Uvicorn server..." -ForegroundColor Cyan
    python -m uvicorn app.main:app --reload
}
else {
    Write-Host "Starting ARQ worker..." -ForegroundColor Cyan
    python -m arq app.worker.WorkerSettings
}
