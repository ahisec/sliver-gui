$ErrorActionPreference = 'Stop'

Write-Host '== Go tests =='
go test ./...

Write-Host '== Go vet =='
go vet ./...

Write-Host '== Frontend syntax =='
Get-ChildItem frontend/dist -Filter *.js | ForEach-Object { node --check $_.FullName }

Write-Host '== Frontend tests =='
node --test frontend/tests/*.test.js

Write-Host '== Generated binding inventory =='
go run ./cmd/binding-inventory

Write-Host 'All local verification checks passed.'
