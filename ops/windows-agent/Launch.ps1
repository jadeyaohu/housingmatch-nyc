param([Parameter(Mandatory=$true)][string]$State, [Parameter(Mandatory=$true)][string]$Python)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path "$State\logs" | Out-Null
$log = Join-Path "$State\logs" ("scheduler-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
& $Python (Join-Path $PSScriptRoot 'runner.py') --state $State --execute *> $log
if ($LASTEXITCODE -ne 0) { throw "Runner failed (exit $LASTEXITCODE); inspect local logs." }
