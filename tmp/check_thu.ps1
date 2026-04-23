$r = Invoke-RestMethod 'http://localhost:3000/api/todos?username=etobee'
$s = $r | Where-Object { $_.scheduleMode -eq 'schedule' }
Write-Host "=== 전체 schedule 항목 ==="
$s | ForEach-Object {
    Write-Host "[$($_.text)] days='$($_.days)' start=$($_.startDate) end=$($_.endDate)"
}
