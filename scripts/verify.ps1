$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Write-Host '== Go tests =='
Invoke-Checked { go test ./... } 'Go tests'

Write-Host '== Go vet =='
Invoke-Checked { go vet ./... } 'Go vet'

Write-Host '== Frontend syntax =='
Get-ChildItem frontend/dist -Filter *.js | ForEach-Object {
    $path = $_.FullName
    Invoke-Checked { node --check $path } "Frontend syntax check ($path)"
}

Write-Host '== Frontend tests =='
Invoke-Checked { node --test frontend/tests/*.test.js } 'Frontend tests'

Write-Host '== Generated binding inventory =='
Invoke-Checked { go run ./cmd/binding-inventory } 'Generated binding inventory'

Write-Host 'All local verification checks passed.'
