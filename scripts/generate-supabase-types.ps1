param([Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9]{20}$')][string]$ProjectRef)
$ErrorActionPreference = 'Stop'
# Read-only hosted introspection. Uses the owner's Supabase CLI login; no password
# or service key is requested. Do not infer the target from old config.toml.
$repoRoot = Split-Path -Parent $PSScriptRoot
$typeTarget = Join-Path $repoRoot 'src/integrations/supabase/types.ts'
$generatedTypeTemp = [System.IO.Path]::GetTempFileName()
try {
    $generatedTypes = & npx --yes supabase gen types typescript --project-id $ProjectRef --schema public
    if ($LASTEXITCODE -ne 0) { throw 'Type generation failed; current types were preserved.' }
    $typeText = $generatedTypes -join "`n"
    if ($typeText -notmatch 'export type Database' -or $typeText -notmatch 'get_referral_summary' -or $typeText -notmatch 'withdrawal_reserved') {
        throw 'Generated schema does not match the independent baseline; current types were preserved.'
    }
    [System.IO.File]::WriteAllText($generatedTypeTemp, $typeText + "`n", [System.Text.UTF8Encoding]::new($false))
    Copy-Item -LiteralPath $generatedTypeTemp -Destination $typeTarget
    Write-Output 'Types regenerated. Review the diff and run type checking before cutover.'
} finally {
    Remove-Item -LiteralPath $generatedTypeTemp -ErrorAction SilentlyContinue
}
