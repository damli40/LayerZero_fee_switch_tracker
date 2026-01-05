$csv = Get-Content -Path "zro_shadow_burn_data.csv" -Raw
$body = @{
    csvData = $csv
} | ConvertTo-Json

Write-Host "Sending CSV data to update prices..."
$response = Invoke-RestMethod -Uri "https://layer-zero-fee-switch-tracker.vercel.app/api/admin/update-prices" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Response:"
$response | ConvertTo-Json
