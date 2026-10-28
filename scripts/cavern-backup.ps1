<#
  cavern-backup.ps1 - the second copy of The Cavern.

  What it does:
    1. Bundles ALL git refs into one file. A bundle is a real repository in a
       single file: `git clone all-branches.bundle restored-cavern` restores it,
       history and every branch included.
    2. Copies the files git does NOT track but that would hurt to lose
       (.env.local, .perch/mcp.json, the wiki, machine-local settings).
    3. Writes a MANIFEST so a restore is not guesswork.
    4. Verifies the bundle before declaring success. An unverified backup is a
       guess, not a backup.

  Target is D:\backup - a SEPARATE PHYSICAL DISK from the repo on C:.
  A backup on the same disk is not a backup.

  Safe to run any time. It never modifies or deletes anything in the repo.

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts\cavern-backup.ps1
    powershell -ExecutionPolicy Bypass -File scripts\cavern-backup.ps1 -Prune
#>
param(
  [string]$RepoPath = 'C:\Users\kings\Desktop\MisfitsCavernB',
  [string]$Dest     = 'D:\backup\cavern-bundles',
  [int]$KeepDays    = 30,
  [switch]$Prune
)

$ErrorActionPreference = 'Stop'
$stamp  = Get-Date -Format 'yyyy-MM-dd-HHmm'
$runDir = Join-Path $Dest $stamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$log = Join-Path $runDir 'backup.log'
function Say($m) {
  $line = "$(Get-Date -Format 'HH:mm:ss')  $m"
  Write-Output $line
  Add-Content -Path $log -Value $line
}

# git writes progress and "is okay" to stderr. With ErrorActionPreference=Stop
# PowerShell treats that as fatal, so native calls run with it relaxed and the
# caller checks $LASTEXITCODE instead.
#
# The name matters: PowerShell is case-insensitive, so a function named `Git`
# would shadow the `git` executable and `& git` inside it would recurse into
# itself until the call stack overflows. Hence `Invoke-Git`.
function Invoke-Git {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { & git @args } finally { $ErrorActionPreference = $prev }
}

Say "repo: $RepoPath"
Say "dest: $runDir"

Push-Location $RepoPath
try {
  # 1. History. --all covers every branch, including unmerged ones.
  $bundle = Join-Path $runDir 'all-branches.bundle'
  Invoke-Git bundle create $bundle --all 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'git bundle create failed' }
  $mb = [math]::Round((Get-Item $bundle).Length / 1MB, 1)
  Say "bundle: all-branches.bundle  $mb MB"

  # Verify before trusting it.
  Invoke-Git bundle verify $bundle 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'bundle failed verification' }
  Say 'bundle verified'

  # 2. The files git does not track.
  $untracked = @(
    '.env.local',
    '.perch/mcp.json',
    '.claude/settings.local.json',
    '.cavern-intelligence/wiki',
    '.cavern-intelligence/.obsidian'
  )
  $dst = Join-Path $runDir 'untracked'
  foreach ($rel in $untracked) {
    $src = Join-Path $RepoPath $rel
    if (-not (Test-Path $src)) { Say "skip (absent): $rel"; continue }
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Copy-Item -Path $src -Destination $dst -Recurse -Force
    Say "copied: $rel"
  }

  # 3. Manifest.
  $head   = (Invoke-Git rev-parse HEAD)
  $branch = (Invoke-Git rev-parse --abbrev-ref HEAD)
  $m = @()
  $m += "backup:   $stamp"
  $m += "branch:   $branch"
  $m += "HEAD:     $head"
  $m += "restore:  git clone all-branches.bundle restored-cavern"
  $m += ""
  $m += "branches:"
  $m += (Invoke-Git branch --format='  %(refname:short) %(objectname:short)')
  $m | Set-Content -Path (Join-Path $runDir 'MANIFEST.txt') -Encoding UTF8
  Say "manifest written (HEAD $($head.Substring(0,7)) on $branch)"
}
finally { Pop-Location }

# 4. Retention. Opt-in: only runs with -Prune.
if ($Prune) {
  $cutoff = (Get-Date).AddDays(-$KeepDays)
  $old = Get-ChildItem $Dest -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}-\d{4}$' -and $_.CreationTime -lt $cutoff }
  foreach ($d in $old) {
    Remove-Item -LiteralPath $d.FullName -Recurse -Force
    Say "pruned: $($d.Name)"
  }
  if (-not $old) { Say "retention: nothing older than $KeepDays days" }
}
else {
  Say 'retention: skipped (pass -Prune to remove runs older than KeepDays)'
}

Say 'done'
