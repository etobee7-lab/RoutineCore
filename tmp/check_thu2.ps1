$r = Invoke-RestMethod 'http://localhost:3000/api/todos?username=etobee'
$s = $r | Where-Object { $_.scheduleMode -eq 'schedule' }
Write-Host "=== days 필드 상세 (null/empty 체크) ==="
$s | ForEach-Object {
    $daysVal = $_.days
    $daysType = if ($null -eq $daysVal) { "NULL" } elseif ($daysVal -eq "") { "EMPTY_STRING" } else { "VALUE:$daysVal" }
    Write-Host "[$($_.text)] days=$daysType start='$($_.startDate)' end='$($_.endDate)'"
}
