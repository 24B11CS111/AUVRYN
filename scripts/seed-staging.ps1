<#
.SYNOPSIS
    Staging Seed Runner Wrapper for PowerShell
    Platform: AUVRYN — The Intelligent Education Ecosystem

.DESCRIPTION
    Validates target environment and Supabase project reference BEFORE any seed execution.
    Positively identifies local vs staging environments.
    Strictly and unconditionally rejects production project 'dhgdjpjgsvbknquetecl'.
    Refuses execution if the project reference cannot be positively identified.

.PARAMETER Target
    The environment target ('local' or 'staging').

.PARAMETER ProjectRef
    The Supabase project reference for remote staging (e.g., 'abcdefghijklmnopqrst').

.PARAMETER DbUrl
    Optional database connection URL.
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$Target = $env:TARGET_ENV,

    [Parameter(Mandatory=$false)]
    [string]$ProjectRef = $env:STAGING_PROJECT_REF,

    [Parameter(Mandatory=$false)]
    [string]$DbUrl = $env:DATABASE_URL
)

$PRODUCTION_PROJECT_REF = "dhgdjpjgsvbknquetecl"
$PRODUCTION_REF_PREFIX = "dhgdjpjg"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "AUVRYN — Staging Seed Environment Safety Validator" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# 1. Check for missing target
if ([string]::IsNullOrWhiteSpace($Target)) {
    Write-Error "CRITICAL SAFETY BLOCK: Target environment is not specified. Specify -Target <local|staging>. Execution refused."
    exit 1
}

$normalizedTarget = $Target.Trim().ToLower()

# 2. Reject production aliases
if ($normalizedTarget -in @("production", "prod", "live")) {
    Write-Error "CRITICAL SAFETY BLOCK: Staging seed script execution is strictly forbidden in production environments."
    exit 1
}

# 3. Reject unauthorized / ambiguous environments
$authorizedTargets = @("local", "local_development", "staging", "test", "local_test")
if ($normalizedTarget -notin $authorizedTargets) {
    Write-Error "CRITICAL SAFETY BLOCK: Ambiguous or unauthorized target environment '$normalizedTarget'. Only 'local' or 'staging' are permitted."
    exit 1
}

# 4. Local Scenario
if ($normalizedTarget -in @("local", "local_development", "test", "local_test")) {
    if (-not [string]::IsNullOrWhiteSpace($DbUrl)) {
        if ($DbUrl.Contains($PRODUCTION_REF_PREFIX) -or $DbUrl.Contains("supabase.co")) {
            Write-Error "CRITICAL SAFETY BLOCK: Remote Supabase database detected while target is set to local. Refusing execution."
            exit 1
        }
    }
    Write-Host "[PASS] Verified Local Development Environment." -ForegroundColor Green
    Write-Host "Project Ref: local_development" -ForegroundColor Green
    exit 0
}

# 5. Remote Staging Scenario
if ($normalizedTarget -eq "staging") {
    $rawRef = $ProjectRef
    if ([string]::IsNullOrWhiteSpace($rawRef) -and -not [string]::IsNullOrWhiteSpace($DbUrl)) {
        if ($DbUrl -match "https:\/\/([a-z0-9_-]+)\.supabase\.co" -or $DbUrl -match "db\.([a-z0-9_-]+)\.supabase\.co") {
            $rawRef = $Matches[1]
        }
    }

    if ([string]::IsNullOrWhiteSpace($rawRef)) {
        Write-Error "CRITICAL SAFETY BLOCK: Target project cannot be positively identified. Remote staging seed requires an explicit Supabase project reference via -ProjectRef."
        exit 1
    }

    $cleanRef = $rawRef.Trim().ToLower()

    # Rejection of Production Reference
    if ($cleanRef -eq $PRODUCTION_PROJECT_REF -or $cleanRef.StartsWith($PRODUCTION_REF_PREFIX)) {
        Write-Error "CRITICAL SAFETY BLOCK: Target project reference '$cleanRef' matches the PRODUCTION Supabase project. Staging seed execution against production is strictly prohibited."
        exit 1
    }

    if (-not [string]::IsNullOrWhiteSpace($DbUrl) -and $DbUrl.Contains($PRODUCTION_REF_PREFIX)) {
        Write-Error "CRITICAL SAFETY BLOCK: Production Supabase project reference detected in database connection string. Refusing execution."
        exit 1
    }

    Write-Host "[PASS] Verified Isolated Staging Environment." -ForegroundColor Green
    Write-Host "Target Staging Project: $cleanRef" -ForegroundColor Green
    exit 0
}
