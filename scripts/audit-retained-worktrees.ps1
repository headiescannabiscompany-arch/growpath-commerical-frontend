$ErrorActionPreference = "Stop"

$repository = (git rev-parse --show-toplevel).Trim()
$outputDirectory = Join-Path $repository "tmp/worktree-reconciliation"
$jsonPath = Join-Path $outputDirectory "worktree-inventory.json"
$markdownPath = Join-Path $outputDirectory "worktree-inventory.md"

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$raw = (git worktree list --porcelain) -join "`n"
$blocks = $raw -split "(?:`r?`n){2,}"
$rows = [System.Collections.Generic.List[object]]::new()

foreach ($block in $blocks) {
    $pathMatch = [regex]::Match($block, "(?m)^worktree (.+)$")
    if (-not $pathMatch.Success) { continue }

    $path = $pathMatch.Groups[1].Value.Trim()
    $branchMatch = [regex]::Match($block, "(?m)^branch refs/heads/(.+)$")
    $headMatch = [regex]::Match($block, "(?m)^HEAD (.+)$")
    $branch = if ($branchMatch.Success) { $branchMatch.Groups[1].Value.Trim() } else { "(detached)" }
    $head = if ($headMatch.Success) { $headMatch.Groups[1].Value.Trim() } else { "" }
    $exists = Test-Path -LiteralPath $path
    $isPrunable = $block -match "(?m)^prunable"
    $statusLines = @()
    $uniqueCommits = @()
    $commitChangedFiles = @()
    $workingTreeFiles = @()
    $ahead = $null
    $behind = $null
    $ancestorOfMain = $false
    $patchEquivalentToMain = $false
    $errorMessage = ""

    if ($exists) {
        try {
            $statusLines = @(git -c "safe.directory=$path" -C $path status --porcelain=v1 --untracked-files=all)
            $workingTreeFiles = @($statusLines | ForEach-Object {
                if ($_.Length -gt 3) { $_.Substring(3) } else { $_ }
            } | Sort-Object -Unique)

            $counts = (git -c "safe.directory=$path" -C $path rev-list --left-right --count HEAD...origin/main).Trim() -split "\s+"
            if ($counts.Count -ge 2) {
                $ahead = [int]$counts[0]
                $behind = [int]$counts[1]
            }

            git -c "safe.directory=$path" -C $path merge-base --is-ancestor HEAD origin/main
            $ancestorOfMain = $LASTEXITCODE -eq 0

            $uniqueCommits = @(git -c "safe.directory=$path" -C $path log --format="%H`t%s" origin/main..HEAD)
            if ($uniqueCommits.Count -gt 0) {
                $commitChangedFiles = @(git -c "safe.directory=$path" -C $path diff --name-only origin/main...HEAD | Sort-Object -Unique)
                $cherry = @(git -c "safe.directory=$path" -C $path cherry origin/main HEAD)
                $patchEquivalentToMain = $cherry.Count -gt 0 -and @($cherry | Where-Object { $_ -like "+*" }).Count -eq 0
            }
            else {
                $patchEquivalentToMain = $true
            }
        }
        catch {
            $errorMessage = $_.Exception.Message
        }
    }

    $classification = if (-not $exists -or $isPrunable) {
        "prunable-registration"
    }
    elseif ($statusLines.Count -gt 0) {
        "preserve-dirty"
    }
    elseif ($ancestorOfMain -or $patchEquivalentToMain) {
        "integrated-clean-candidate"
    }
    else {
        "review-unique-clean"
    }

    $rows.Add([pscustomobject]@{
        Path = $path
        Branch = $branch
        Head = $head
        Exists = $exists
        Prunable = $isPrunable
        AheadOfMain = $ahead
        BehindMain = $behind
        AncestorOfMain = $ancestorOfMain
        PatchEquivalentToMain = $patchEquivalentToMain
        Classification = $classification
        Status = $statusLines
        WorkingTreeFiles = $workingTreeFiles
        UniqueCommits = $uniqueCommits
        CommitChangedFiles = $commitChangedFiles
        Error = $errorMessage
    })

    Write-Output "AUDITED $branch -> $classification"
}

$rows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding utf8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Retained worktree reconciliation inventory")
$lines.Add("")
$lines.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
$lines.Add("")
$lines.Add("Reference: origin/main at $((git rev-parse origin/main).Trim())")
$lines.Add("")
$lines.Add("## Summary")
$lines.Add("")
foreach ($group in ($rows | Group-Object Classification | Sort-Object Name)) {
    $lines.Add("- $($group.Name): $($group.Count)")
}
$lines.Add("")
$lines.Add("## Inventory")
$lines.Add("")
$lines.Add("| Classification | Branch | HEAD | Dirty files | Unique commits | Ahead | Behind |")
$lines.Add("|---|---|---:|---:|---:|---:|---:|")
foreach ($row in ($rows | Sort-Object Classification, Branch)) {
    $shortHead = if ($row.Head.Length -ge 8) { $row.Head.Substring(0, 8) } else { $row.Head }
    $lines.Add("| $($row.Classification) | $($row.Branch) | $shortHead | $($row.WorkingTreeFiles.Count) | $($row.UniqueCommits.Count) | $($row.AheadOfMain) | $($row.BehindMain) |")
}

Set-Content -LiteralPath $markdownPath -Value $lines -Encoding utf8
Write-Output "JSON $jsonPath"
Write-Output "MARKDOWN $markdownPath"
Write-Output "TOTAL $($rows.Count)"
