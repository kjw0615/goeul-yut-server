# 고을 윷판 게임 서버 저장소 v0.14

이 저장소는 로그인·방·관전·윷 판정·자산·카드·시간 제한을 **Vercel Functions**로 실행합니다. 별도 PC/VPS에서 node server.cjs를 계속 실행하는 방식이 아닙니다. 화면은 별도 goeul-yut-web 저장소에서 배포합니다.

## 서버 프로젝트 설정

|항목|값|
|---|---|
|Node.js|22.x|
|Framework|Other|
|Build|npm run build|
|Output|public|
|ALLOWED_ORIGINS|화면용 Vercel HTTPS Origin, 여러 개는 쉼표 구분|
|UPSTASH_REDIS_REST_URL|Marketplace가 연결한 Redis REST 주소|
|UPSTASH_REDIS_REST_TOKEN|Marketplace가 연결한 서버 전용 토큰|
|GAME_STATE_KEY|선택, 기본 goeul-yut:v14:lobby|

일부 Marketplace 연결에서 KV_REST_API_URL/KV_REST_API_TOKEN 이름을 제공하는 경우 이 이름도 지원합니다. 일반 TCP REDIS_URL만으로는 이 REST 구현을 사용할 수 없습니다. Upstash의 REST URL과 읽기·쓰기 토큰이 필요합니다. 비밀키는 **서버 프로젝트 환경변수에만** 지정합니다. Preview와 Production의 경기를 분리하려면 각각 다른 Redis 데이터베이스 또는 다른 GAME_STATE_KEY를 사용합니다.

## 서버리스 처리 방식

api/game.js가 /api/login, /api/state, 방·팀·준비·행동 API를 처리합니다. vercel.json의 경로 규칙으로 공개 API 주소를 연결합니다. 클라이언트는 API에 행동 의도를 보내고 서버가 현재 참가자·차례·소유권·비용을 검사합니다. 관전자는 게임을 조작할 수 없습니다.

각 요청은 Redis에서 방·세션·게임을 복원하고 변경 상태를 조건부로 저장합니다. Lua 비교 후 쓰기로 여러 Function 간 갱신 충돌을 검사하며 충돌 시 최신 상태로 재시도합니다. 행동 requestId를 기록하여 같은 요청 재전송 시 두 번 실행하지 않습니다. 요청이 거절되어도 이미 만료된 서버 시간 처리 결과는 보존합니다.

던지기 20초·이후 단계별 선택 30초·작업이 없는 경우 3초 차례 종료·AI 행동의 기한은 Redis에 저장합니다. 브라우저가 API를 조회하면 서버가 만료된 행동을 처리합니다. 항상 켜져 있는 setInterval에 의존하지 않습니다. **모든 브라우저가 요청을 멈추면 처리도 다음 요청까지 기다리며**, 다음 요청에서 저장한 기한을 확인합니다. 따라서 이 프로토타입은 접속한 사용자가 상태를 조회하는 동안 진행합니다. 명시적으로 마지막 참가자가 방을 나가면 방은 바로 삭제됩니다.

현재는 작은 규모의 프로토타입을 위해 하나의 Redis 키에 전체 로비 상태를 보관합니다. 이용자가 늘면 방별 키·원자적 작업·예약 처리로 확장할 수 있습니다. Redis 설정 없는 Vercel 환경에서는 메모리로 조용히 대체하지 않고 503 오류로 안내합니다. 24시간 동안 요청이 없던 접속 세션은 다음 요청에서 정리합니다. 로컬 메모리 모드는 개발 전용입니다.

## 파일과 검증

- api/game.js: Vercel Function 진입점
- src/engine.cjs, lobby.cjs: 게임 규칙·방·시간·권한
- src/store.cjs, service.cjs: Redis REST·조건부 저장·복원·재전송 처리
- src/http.cjs: 요청·응답·인증·허용 Origin
- dev.cjs: 로컬 API 서버 5174
- *.test.cjs: 기존 규칙 82개와 서버리스 HTTP·동시 매입·관전 검증
- public/index.html: API 프로젝트 설명 화면

npm test는 규칙 및 서버리스 검증을, npm run build는 서버·Functions·파일 구성을 검사합니다. 서버리스 검증은 Redis REST 호환 테스트 저장소를 사용하며 실제 Upstash 계정 연결은 별도 배포 확인이 필요합니다. API /health는 설정 유무를 보여주고 실제 저장소 연결 성공은 로그인·방 API로 확인합니다.

## 두 저장소 배포 순서

1. goeul-yut-server와 goeul-yut-web 폴더를 각각 별도의 GitHub 저장소 루트로 올립니다. 각 폴더는 독립된 Git 저장소입니다. 원본 sites/goeul-yut은 기존 로컬 버전으로 보관합니다.
2. Vercel에서 **서버 저장소를 먼저 Import**합니다. Framework는 Other, Build는 npm run build, Output은 public입니다. Node.js는 22.x를 사용합니다.
3. 서버 프로젝트의 Storage/Marketplace에서 **Upstash Redis**를 연결합니다. 연결된 환경변수가 Production과 필요하면 Preview에 적용되어야 합니다. 직접 Redis 서버를 실행하지 않습니다.
4. Vercel에서 **화면 저장소를 Import**합니다. Framework는 Other, Build는 npm run build, Output은 dist입니다. GOEUL_API_BASE에 서버 프로젝트의 HTTPS Origin을 지정합니다. 예: https://your-game-api.vercel.app. /api는 붙이지 않습니다.
5. 서버 프로젝트의 ALLOWED_ORIGINS에 실제 화면 Origin을 지정합니다. 예: https://your-game-web.vercel.app. 여러 개는 쉼표로 구분합니다. 화면 Preview 주소도 허용하려면 정확한 해당 Origin을 추가합니다.
6. 환경변수 변경 후 해당 프로젝트를 다시 배포합니다. 서버 /health에서 version 14와 storageConfigured true를 확인하고, 화면에서 실제 닉네임 접속·방 만들기·게임을 확인합니다. storageConfigured는 설정 존재 여부이며 Redis 비밀키의 유효성은 실제 API 요청으로 확인됩니다.

게임 서버와 화면 서버는 모두 Vercel에서 실행됩니다. Redis는 Marketplace의 외부 제공사가 운영하는 관리형 저장소입니다. 저장소 이름·프로젝트 이름은 변경해도 되며 코드에 특정 GitHub 계정이나 배포 주소를 넣지 않았습니다. 현재 원격 GitHub 저장소 생성·실제 Vercel 배포·실제 Redis 계정 연결은 수행하지 않았습니다.

## 같은 PC에서 두 저장소 테스트

서버 폴더에서 npm run dev, 화면 폴더에서 npm run dev를 각각 실행합니다. 기본 주소는 게임 API http://127.0.0.1:5174, 화면 http://127.0.0.1:5173입니다. 원본 로컬 게임의 4173 포트와 겹치지 않습니다. 외부 패키지 설치는 필요 없습니다.

로컬에서는 .env.local의 설정을 읽습니다. 주입된 환경변수가 우선이며 .env.local은 Git과 배포에서 제외합니다. 기본 로컬 모드는 메모리 저장으로, API 프로세스를 종료하면 방이 초기화됩니다. Redis REST 설정을 넣으면 로컬에서도 Redis를 사용할 수 있습니다. 같은 네트워크의 다른 기기에서 사용할 때는 화면의 GOEUL_API_BASE를 API PC의 주소로, 서버 ALLOWED_ORIGINS를 실제 화면 Origin으로 지정하고 각각 다시 실행합니다.

## GitHub 업로드

각 폴더에서 기존 파일을 검토한 뒤 별도의 GitHub 저장소에 연결합니다. 원격 주소는 GitHub에서 만든 저장소의 주소를 사용하세요. 두 폴더를 하나의 원격 저장소에 동시에 연결하지 않습니다. dist는 새 화면 저장소의 생성 결과이므로 제외하며 **public 소스·이미지는 반드시 포함**합니다. API·src는 서버 저장소의 소스입니다.

.gitignore는 .env와 변형 파일, 인증서·키, node_modules, 로그, ZIP, .vercel, .openai, 생성된 dist를 제외합니다. Redis 토큰을 GitHub, 화면 환경변수, public/config.js에 넣지 마세요. 화면에는 API의 공개 주소만 넣습니다. 이미 추적된 파일은 .gitignore만으로 제외되지 않습니다.

공식 참고: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel Redis 연결](https://vercel.com/docs/redis), [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi).

출발점 지원금은 통과·도착 시 기존 기준대로 지급하며, 최종 이동을 출발점에서 마치면 팀 고을 한 곳을 선택해 행동자의 해금 단계 안에서 건설할 수 있습니다. 비용은 행동자가 부담하고 고을 소유권은 유지합니다. 화면 프로젝트와 게임 API 프로젝트를 모두 업데이트해야 새 규칙과 선택 화면을 함께 사용할 수 있습니다.

현재 추가 규칙: 보드의 말 옆 순위는 현금+소유 땅 기본값+실제 보유 건물 원가로 계산하며 동점은 공동 순위입니다. 이 표시용 순위는 전당포 대출금을 차감하지 않으며 기존 승리 판정용 순자산 규칙은 유지합니다. 장원급제 통행료 2배 효과는 보드 전체에서 한 고을만 유지하며 어느 팀이든 새 대상 지정 시 이전 효과를 해제합니다. 윷 파워 30% 이하에서 도·빽도 합산 확률을 25%에서 28%로, 70% 이상에서 윷·모 합산 확률을 12.5%에서 15.5%로 높입니다. 나머지 결과 확률에서 같은 양을 차감하며 31~69%와 AI 기본 파워는 기존 확률입니다. 추가 던지기·유배 탈출·놀음판에도 동일한 던지기 확률을 적용합니다. 서버에서 파워를 검증하고 결과를 생성합니다. 설정은 모든 화면 상단에서 전체·배경음·효과음 음량과 개별 음소거를 조절합니다. 놀이 안내에 모든 복주머니 카드의 내용·보유 여부·장수를 표시합니다.

직선 승리 조건: 외곽 네 변 또는 전체 대각선 두 개 중 한 직선의 구매 가능한 모든 고을을 같은 팀이 소유하면 건물 단계와 관계없이 즉시 승리합니다. 특수 칸은 제외하며 팀원 두 명이 나누어 소유해도 인정합니다. 승리 진행 표시는 소유 고을 수를 기준으로 계산합니다.

AI 자동 진행: 던지기 20초·이후 선택 30초 시간 초과 시 해당 참가자의 AI 자동 진행을 켜고 화면과 기록에 전환 사유를 표시합니다. 게임 상단 스위치로 자기 캐릭터의 자동 진행을 언제든 켜거나 끌 수 있습니다. 끄면 현재 행동자인 경우 남은 단계에 새 20/30초를 주고 사용자가 이어서 조작합니다. 다른 사람 차례에 해제해도 다음 자기 차례부터 직접 조작합니다. 기존 AI 자리·퇴장 후 AI 자리·관전자는 해제할 수 없습니다. 자동 진행은 인간 참가자 자리를 유지하므로 방 인원·방장·재접속 규칙은 유지합니다. 동작그만 응답 시간 초과와 연결 끊김에도 해당 행동자를 자동 진행으로 전환하며, 3초 단순 차례 종료는 자동 진행 전환 사유가 아닙니다.

세션 관리: 닉네임 로그인으로 세션 토큰을 만들며 토큰은 탭의 sessionStorage에 저장합니다. 실제 클릭·터치·키보드·마우스 이동·스크롤 등 조작이 30분 없으면 자동 조회가 계속되더라도 세션을 종료합니다. 페이지 종료 신호를 받으면 15초 유예 후 종료하며 유예 안의 새로고침·재접속은 유지합니다. 종료 신호가 누락되어도 접속 확인이 90초 없으면 종료합니다. 종료된 토큰은 모든 API에서 거절하고 닉네임 로그인으로 돌아갑니다. 게임 참가자는 퇴장 처리하여 AI가 이어받고, 마지막 인간 참가자가 종료되면 방과 관전자 연결을 정리합니다. Vercel에서는 다음 API 요청 때 만료를 검사하고 저장 데이터를 정리하며 별도 상시 실행 타이머는 필요하지 않습니다. 브라우저 종료 신호는 best effort이고 즉시 전달을 보장하지 않습니다. 실제 조작 활동 보고는 최대 30초 간격입니다.
