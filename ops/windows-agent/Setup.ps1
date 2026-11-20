# Current-user only. No ExecutionPolicy changes, elevation, credentials or passwords.
param(
    [ValidateSet('DryRun','Install','Enable','Disable','Stop','Status','Loop')]
    [string]$Mode = 'DryRun',
    [string]$State = "$env:LOCALAPPDATA\HousingMatchCodex"
)
$ErrorActionPreference = 'Stop'
$name = 'HousingMatch NYC - Autonomous Developer'
$State = [IO.Path]::GetFullPath($State)
New-Item -ItemType Directory -Force -Path $State | Out-Null
$enabled = Join-Path $State 'ENABLED'
if ($Mode -in @('Disable','Stop')) {
    Remove-Item $enabled -ErrorAction SilentlyContinue
    # The runner checks this marker every second and kills its owned Codex tree.
    try { Disable-ScheduledTask -TaskName $name | Out-Null }
    catch { Write-Warning 'Could not disable scheduled task; ENABLED is removed, so runs will exit.' }
    Write-Output 'Disabled. Active Codex tree will be stopped at the next watchdog check. Claims remain.'
    return
}
if ($Mode -eq 'Status') {
    Write-Output "Execution enabled: $(Test-Path $enabled)"
    Get-ScheduledTask -TaskName $name | Select-Object TaskName, State, Principal
    Get-ScheduledTaskInfo -TaskName $name | Select-Object NextRunTime, LastRunTime, LastTaskResult
    return
}
$python = (Get-Command python.exe -ErrorAction Stop).Source
& $python -c 'import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"'
if ($LASTEXITCODE -ne 0) { throw 'Python 3.11+ required' }
foreach ($tool in @('git','gh','codex')) { Get-Command $tool -ErrorAction Stop | Out-Null }
if ($Mode -eq 'DryRun') {
    & $python (Join-Path $PSScriptRoot 'runner.py') --state $State
    if ($LASTEXITCODE -ne 0) { throw 'Dry run failed; scheduling not changed' }
    return
}
if ($Mode -eq 'Install') {
    # These times are local. Refuse ambiguous timezone instead of changing Windows settings.
    if ((Get-TimeZone).Id -ne 'Eastern Standard Time') {
        throw 'Use a Windows account already in Eastern Standard Time (New York); no timezone changed.'
    }
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        throw 'Task already exists; inspect it instead of replacing it.'
    }
    $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $hostExe = (Get-Process -Id $PID).Path
    $launch = Join-Path $PSScriptRoot 'Launch.ps1'
    $arguments = '-NoProfile -NonInteractive -File "{0}" -State "{1}" -Python "{2}"' -f $launch,$State,$python
    $action = New-ScheduledTaskAction -Execute $hostExe -Argument $arguments -WorkingDirectory $PSScriptRoot
    $trigger = New-ScheduledTaskTrigger -Daily -At '00:10'
    $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At '00:10' -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 1)).Repetition
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
    $definition = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'One Codex queue task; ChatGPT sign-in; no API billing. Disabled until explicit Enable.'
    $definition.Settings.Enabled = $false
    Register-ScheduledTask -TaskName $name -InputObject $definition | Out-Null
    Write-Output 'Registered DISABLED, current user only. No password stored. Run Status and inspect before Enable.'
    return
}
if ($Mode -eq 'Enable') {
    # A fresh read-only test must pass before enabling.
    & $python (Join-Path $PSScriptRoot 'runner.py') --state $State
    if ($LASTEXITCODE -ne 0) { throw 'Dry run failed' }
    Enable-ScheduledTask -TaskName $name | Out-Null
    New-Item -ItemType File -Force -Path $enabled | Out-Null
    Write-Output 'Enabled. Use Status to verify the next execution time.'
    return
}
if ($Mode -eq 'Loop') {
    Write-Output 'Foreground fallback: close this window or press Ctrl+C to stop polling. Use Stop to kill an active agent.'
    Write-Output 'No scheduler registered. Starting requires an existing ENABLED marker; see README.'
    while (Test-Path $enabled) {
        $now = Get-Date
        $next = $now.Date.AddHours($now.Hour).AddMinutes(10)
        while ($next -le $now) { $next = $next.AddMinutes(30) }
        while ((Get-Date) -lt $next -and (Test-Path $enabled)) { Start-Sleep -Seconds 1 }
        if (Test-Path $enabled) { & (Join-Path $PSScriptRoot 'Launch.ps1') -State $State -Python $python }
    }
}
