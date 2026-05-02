# RoutineCore Migration Guide (PC 이전 가이드)

이 프로젝트는 새로운 PC로 이동하여 동일하게 Cloudflare 서비스를 운영할 수 있도록 설계되었습니다.

## 1. 폴더 복사
`RoutineCore` 폴더 전체를 새로운 PC의 원하는 위치로 복사하세요.

## 2. 필수 프로그램 설치
새로운 PC에 다음 프로그램들이 설치되어 있어야 합니다:
- **Node.js** (v18 이상 권장): [https://nodejs.org/](https://nodejs.org/)
- **MySQL**: DB가 설치되어 있어야 하며, `.env`의 정보와 일치해야 합니다.
- **Cloudflared**: 폴더 내에 `cloudflared.exe`가 포함되어 있습니다.

## 3. 데이터베이스 이전 (MySQL)
새 PC에서 DB를 복구하기 위해 다음을 수행하세요:
1. 기존 PC에서 **`db-migrate.bat`**를 실행하여 `1번 (Export)`을 선택합니다.
2. 생성된 `todo_db_backup.sql` 파일을 새 PC로 가져옵니다.
3. 새 PC에서 **`db-migrate.bat`**를 실행하여 `2번 (Import)`을 선택합니다.

## 4. 초기 설정 및 자동화
새 PC에서 **`init-setup.bat`** 파일을 더블 클릭하여 실행하세요. 이 스크립트는 다음 과정을 자동으로 처리합니다:
- **Node.js 버전 확인**
- **npm install** (라이브러리 자동 설치)
- **Cloudflare Tunnel 로그인** (선택 사항)

## 4. 서비스 시작 및 관리
모든 설정이 완료되면 `start-manager.bat` 파일을 실행하세요.

1. 실행 후 브라우저에서 **[http://localhost:4000](http://localhost:4000)**에 접속합니다.
2. 대시보드에서 **Frontend**, **Backend**, **Cloudflare Tunnel** 서비스를 각각 Start 버튼을 눌러 시작할 수 있습니다.

## 5. Cloudflare Tunnel 설정 (주의)
새 PC에서 터널을 운영하려면 `config.yml` 파일 내의 `hostname` 등을 본인의 Cloudflare 설정에 맞게 수정해야 할 수 있습니다.

- 만약 기존 터널 인증 정보를 그대로 사용하려면, `%USERPROFILE%\.cloudflared` 폴더 내의 인증 파일(.json)도 함께 옮겨야 합니다.
- 새 PC에서 터널을 새로 만드려면 `cloudflared.exe tunnel login` 명령어를 통해 다시 로그인해야 합니다.

---
**제작: RoutineCore Cloud Manager v1.0**
