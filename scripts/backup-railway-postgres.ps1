param(
  [string]$DatabaseUrl = $env:DATABASE_PUBLIC_URL,
  [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  $DatabaseUrl = $env:DATABASE_URL
}

if (-not $DatabaseUrl) {
  throw "Set DATABASE_PUBLIC_URL or DATABASE_URL before running this script."
}

if ($DatabaseUrl -match "postgres\.railway\.internal") {
  throw "This is Railway's private internal URL. Use DATABASE_PUBLIC_URL when running backup from your computer."
}

$resolvedOutput = Resolve-Path -LiteralPath $OutputDir -ErrorAction SilentlyContinue
if (-not $resolvedOutput) {
  New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
  $resolvedOutput = Resolve-Path -LiteralPath $OutputDir
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "railway-postgres-$timestamp.dump"
$backupPath = Join-Path $resolvedOutput.Path $backupFile

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  docker run --rm `
    -e DATABASE_URL="$DatabaseUrl" `
    -e BACKUP_FILE="$backupFile" `
    -v "$($resolvedOutput.Path):/backups" `
    postgres:16-alpine `
    sh -lc 'pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="/backups/$BACKUP_FILE"'
} else {
  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if (-not $pgDump) {
    throw "Install Docker or PostgreSQL client tools so pg_dump is available."
  }

  pg_dump "$DatabaseUrl" --format=custom --no-owner --no-acl --file="$backupPath"
}

Write-Host "Backup created: $backupPath"
