$r = Invoke-RestMethod 'http://localhost:3000/api/todos?username=etobee'
$s = $r | Where-Object { $_.scheduleMode -eq 'schedule' }
Write-Host "Schedule todos count: $($s.Count)"
$s | Select-Object id,text,days,startDate,endDate,time | Format-Table -AutoSize
