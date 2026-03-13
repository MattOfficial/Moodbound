$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "Backend virtualenv interpreter not found at $python. Create .venv and install backend requirements first."
}

Push-Location $repoRoot
try {
    & $python -m pytest `
        --cov=backend/app `
        --cov-config=.coveragerc `
        --cov-report=term-missing `
        --cov-report=html:backend\coverage `
        backend\tests -q
}
finally {
    Pop-Location
}
