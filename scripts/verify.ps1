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
$bindingInventory = Join-Path ([System.IO.Path]::GetTempPath()) ("sliver-gui-wails-bindings-{0}.md" -f [guid]::NewGuid())
try {
    Invoke-Checked { go run ./cmd/binding-inventory -out $bindingInventory } 'Generated binding inventory'
} finally {
    Remove-Item -LiteralPath $bindingInventory -Force -ErrorAction SilentlyContinue
}

Write-Host 'All local verification checks passed.'
