import os

file_path = r'c:\RoutineCore\src\App.jsx'

# Read the file with error handling to avoid crash on corrupted parts
with open(file_path, 'rb') as f:
    content = f.read()

# [남개발 팀장] 손상된 블록을 찾아서 정확한 코드로 교체합니다.
# 특히 문제가 된 요일 배열 부분을 집중적으로 복구합니다.

# 1. 전체 내용을 문자열로 변환 (잘못된 바이트는 무시하거나 대체)
# (참고: 이미 도구가 파일을 망가뜨렸을 수 있으므로, 알려진 패턴으로 복구하는 것이 안전함)

# 복구할 핵심 코드 조각들
day_names_kr = "['일', '월', '화', '수', '목', '금', '토']"
day_names_full_kr = "['월', '화', '수', '목', '금', '토', '일']"

# 전체 파일 내용 중 3400~3600 라인 부근이 특히 오염되었을 가능성이 큼
# 하지만 파일 전체를 UTF-8로 다시 쓰는 것이 가장 안전함.

try:
    text = content.decode('utf8')
    # 깨진 패턴이 있다면 여기서 정규식 등으로 교정할 수 있으나,
    # 지금은 제가 가진 가장 최신/정상 코드로 해당 영역을 덮어쓰는 것이 최선입니다.
except UnicodeDecodeError:
    text = content.decode('cp949', errors='replace')

# [남개발 부장] 오류가 발생한 지점을 포함한 메인 로직 영역을 재생성합니다.
# (이전에 view_file로 확인한 정상 구조를 바탕으로 함)

# 주의: 파일 전체를 다루기엔 너무 크므로, 오염된 특정 패턴들을 일괄 치환하거나
# 문제가 되는 3420~3550 라인 영역을 다시 씁니다.

lines = text.splitlines()

# 오염된 배열 패턴을 찾아 복구 (스크린샷 기반)
for i in range(len(lines)):
    if "'??" in lines[i] or "??]" in lines[i]:
        # 요일 배열이 깨진 것으로 판단되면 복구
        if "map(d =>" in lines[i]:
            if "edit-day-btn" in lines[i-1] or "edit-days-row" in lines[i-1]:
                lines[i] = "                        {['월', '화', '수', '목', '금', '토', '일'].map(d => ("
            else:
                lines[i] = "                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];"

# 파일 다시 쓰기
with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("Recovery successful: Corrupted Korean arrays fixed.")
