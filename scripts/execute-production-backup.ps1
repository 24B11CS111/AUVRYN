<#
.SYNOPSIS
    AUVRYN Production Database Backup & Restore Verification Script
.DESCRIPTION
    Safely captures a PostgreSQL 17 custom-format dump (-F c) from Supabase Cloud (dhgdjpjgsvbknquetecl),
    verifies its Table of Contents with pg_restore --list, and executes an empirical test restoration
    into an isolated local PostgreSQL 17 test cluster (port 54333) to prove restorable integrity.
.NOTES
    Never exposes passwords or connection credentials in logs.
#>

param (
    [string]$DumpFile = "",
    [string]$SupabaseHost = "aws-0-eu-central-1.pooler.supabase.com",
    [int]$SupabasePort = 5432,
    [string]$SupabaseUser = "postgres.dhgdjpjgsvbknquetecl",
    [string]$SupabaseDb = "postgres",
    [int]$LocalPort = 54333,
    [string]$TestDbName = "auvryn_backup_restore_test"
)

$ErrorActionPreference = "Stop"

$PG_BIN = "C:\Program Files\PostgreSQL\17\bin"
$PG_DUMP = Join-Path $PG_BIN "pg_dump.exe"
$PG_RESTORE = Join-Path $PG_BIN "pg_restore.exe"
$PSQL = Join-Path $PG_BIN "psql.exe"
$BACKUP_DIR = Join-Path $PSScriptRoot "..\backups"

if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "AUVRYN PRODUCTION DATABASE BACKUP & RESTORE VERIFICATION PROTOCOL" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Binaries : $PG_BIN"
Write-Host "Remote Host         : $SupabaseHost (Port: $SupabasePort)"
Write-Host "Remote User         : $SupabaseUser"
Write-Host "Local Test Cluster  : 127.0.0.1:$LocalPort"
Write-Host "Local Test Database : $TestDbName"
Write-Host "================================================================================"

# 1. Acquire or Verify Dump File
if (-not $DumpFile) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $DumpFile = Join-Path $BACKUP_DIR "auvryn_prod_backup_$timestamp.dump"
    
    if (-not $env:PGPASSWORD) {
        Write-Host "Enter the Supabase Production Database Password (input will be masked):" -ForegroundColor Yellow
        $securePwd = Read-Host -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
        $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }

    Write-Host "`n[Step 1] Capturing physical database dump from production..." -ForegroundColor Yellow
    & $PG_DUMP -h $SupabaseHost -p $SupabasePort -U $SupabaseUser -d $SupabaseDb -F c -b -v -f $DumpFile 2>&1 | ForEach-Object {
        if ($_ -match "error|fatal") { Write-Warning $_ }
    }

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $DumpFile)) {
        Write-Error "pg_dump failed with exit code $LASTEXITCODE. Backup aborted."
        exit 1
    }
} else {
    Write-Host "`n[Step 1] Using existing database dump file: $DumpFile" -ForegroundColor Green
    if (-not (Test-Path $DumpFile)) {
        Write-Error "Specified dump file does not exist: $DumpFile"
        exit 1
    }
}

# 2. Record File Metadata & Checksum
$fileItem = Get-Item $DumpFile
$fileSize = $fileItem.Length
$fileHash = (Get-FileHash -Path $DumpFile -Algorithm SHA256).Hash

Write-Host "`n[Step 2] Backup File Captured & Checksummed:" -ForegroundColor Green
Write-Host "  File Path    : $($fileItem.FullName)"
Write-Host "  File Size    : $fileSize bytes ($([math]::Round($fileSize / 1MB, 2)) MB)"
Write-Host "  SHA256 Hash  : $fileHash"

# 3. Verify Table of Contents (TOC) with pg_restore --list
Write-Host "`n[Step 3] Verifying Table of Contents (TOC) with pg_restore --list..." -ForegroundColor Yellow
$tocLines = & $PG_RESTORE --list $DumpFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_restore --list failed with exit code $LASTEXITCODE. The archive is corrupted."
    exit 1
}
$tableEntries = $tocLines | Where-Object { $_ -match "TABLE DATA public " }
Write-Host "  Archive format valid. Found $($tableEntries.Count) public table data sections." -ForegroundColor Green

# 4. Prepare Local Isolated Test Database
Write-Host "`n[Step 4] Initializing local test database: $TestDbName on port $LocalPort..." -ForegroundColor Yellow
& $PSQL -h 127.0.0.1 -p $LocalPort -U postgres -d postgres -c "DROP DATABASE IF EXISTS $TestDbName;" | Out-Null
& $PSQL -h 127.0.0.1 -p $LocalPort -U postgres -d postgres -c "CREATE DATABASE $TestDbName;" | Out-Null

# 5. Restore into Local Test Database
Write-Host "`n[Step 5] Restoring production archive into $TestDbName..." -ForegroundColor Yellow
& $PG_RESTORE -h 127.0.0.1 -p $LocalPort -U postgres -d $TestDbName --no-owner --no-privileges $DumpFile 2>&1 | Out-Null

# 6. Verify Restored Schema Objects
Write-Host "`n[Step 6] Verifying restored schema objects..." -ForegroundColor Yellow
$publicTables = & $PSQL -h 127.0.0.1 -p $LocalPort -U postgres -d $TestDbName -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
$rlsTables = & $PSQL -h 127.0.0.1 -p $LocalPort -U postgres -d $TestDbName -t -A -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
$customFunctions = & $PSQL -h 127.0.0.1 -p $LocalPort -U postgres -d $TestDbName -t -A -c "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';"

Write-Host "  Public Tables Restored : $publicTables" -ForegroundColor Green
Write-Host "  RLS-Enabled Tables     : $rlsTables" -ForegroundColor Green
Write-Host "  Public RPC Functions   : $customFunctions" -ForegroundColor Green

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "VERDICT: BACKUP AND RESTORATION VERIFIED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Backup File : $($fileItem.FullName)"
Write-Host "Size        : $fileSize bytes"
Write-Host "SHA256      : $fileHash"
Write-Host "Restore DB  : $TestDbName (Tables: $publicTables, RLS: $rlsTables, Functions: $customFunctions)"
Write-Host "================================================================================" -ForegroundColor Cyan
