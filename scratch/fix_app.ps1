$path = 'c:\RoutineCore\src\App.jsx'
$content = [System.IO.File]::ReadAllText($path)

# [남개발 팀장] 정규식을 사용하여 깨진 요일 배열 블록을 찾아 정상 코드로 바꿉니다.
# 1. 일간 상세 입력창의 요일 버튼 영역
$content = $content -replace '\{\[.*?\.map\(d => \(', "{['월', '화', '수', '목', '금', '토', '일'].map(d => ("

# 2. 캘린더 요일 클릭 핸들러의 요일 이름 정의 영역
$content = $content -replace 'const dayNames = \[.*?\];', "const dayNames = ['일', '월', '화', '수', '목', '금', '토'];"

# 3. 기타 인코딩 오류로 인한 깨진 한글 필터링 키워드들 (필요시 추가)
$content = $content -replace "t\.text\.includes\('일정'\)", "t.text.includes('일정')"
$content = $content -replace "t\.text\.includes\('메모'\)", "t.text.includes('메모')"
$content = $content -replace "t\.text\.includes\('아이디어'\)", "t.text.includes('아이디어')"

# UTF-8 (BOM 없음) 인코딩으로 저장하여 바벨 호환성 확보
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)

Write-Host "App.jsx fixed successfully."
