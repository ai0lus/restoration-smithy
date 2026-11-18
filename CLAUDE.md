# GameDev — 낡은 무기 수리 대장간 (Restoration Smithy)

여자 대장장이가 **오래되고 낡은 무기·장신구를 수리**하는 화살표 퍼즐 게임(저주/마법 설정은 폐기). HTML5 Canvas 2D, 빌드 도구 없음 (Node/Python/Git 미설치).
스토리(현재): **플레이어가 대장장이**. 화면의 인물은 의뢰인 5명(`Items.CLIENTS`: bard, mercenary, knight, captain, noble — 물건 2개씩 담당, 그림 `assets/images/clients/<id>.png`, 원본 `art_src/clients/`). 접수대 초상·퍼즐 HUD 아바타·대사(`SAY`, `client.greet`)는 모두 의뢰인 것. 예전 대장장이 그림(`assets/images/smith/`)은 사용·배포하지 않음.
용어: 화살표 = 손상, ♥ = 집중력, 도감 = 수리 도감. 코드의 `COL.curse`(녹 색), `job.curse`(손상 설명), 저장 키 `cursed-smith.v1`, `purified`는 옛 이름 그대로 둠.
아이템 그림은 2장: `items/<id>_old.png`(수리 전, 녹슬고 낡음)과 `items/<id>.png`(수리 후). 같은 구도라 클리어 때 교차 페이드. `Items.drawIcon(state)`: `'old' | 'fixed' | 'unknown'`.
캐릭터·아이템·UI 그림은 **Codex `$imagegen` 스킬로 생성한 PNG** (`CODEX_ASSETS.md`, `AGENTS.md`). 그림이 없으면 코드 플레이스홀더로 동작.

## 아트 파이프라인
- Codex CLI(VS Code 확장 동봉, `~/.vscode/extensions/openai.chatgpt-*/bin/windows-x86_64/codex.exe`)를 `codex exec -C <프로젝트> -s workspace-write --skip-git-repo-check` 로 실행, 프롬프트에서 `$imagegen` 스킬 사용 → `assets/images/<경로>.png` 저장.
- 프롬프트는 영어로(PowerShell 5.1 파이프 인코딩 문제). 대장장이 표정은 idle.png를 기준 이미지로 편집해 일관성 유지.
- 다시 그릴 때는 Codex가 `art_src/`의 원본(1024)을 기준으로 편집해 `art_src/`에 저장 → 새 파일은 `assets/images/`에 복사 → `resize_art.ps1`. 첫 컨셉(저주) 원본은 `art_src/_v1_cursed/`에 백업.
- 생성 후 `powershell -ExecutionPolicy Bypass -File tools\resize_art.ps1` 실행: 원본은 `art_src/`에 보관, `assets/images/`는 모바일용 축소본(대장장이 1024, 아이템 384, 배경 1080, 아이콘 160, 프레임 512).
- 로더는 `<name>.png` → `<name>.svg` 순으로 시도. 9-slice 프레임은 원본 크기와 무관하게 바깥 25%를 테두리로 사용.
- `ui/button_primary`, `ui/bubble` 은 가운데가 투명하게 생성되어 코드에서 단색을 먼저 칠한 뒤 프레임을 얹음.

## 게임 흐름
- 접수대(`CounterScene`) → 의뢰 확인 → 해주 퍼즐(`PuzzleScene`) → 결과(골드·도감) → 다음 의뢰. 도감은 `CollectionScene`.
- 레벨 n = n번째 의뢰. `Items.commission(n)`: 10개 아이템을 순환, 회차가 오를수록 저주 강도·보수 증가.
- 퍼즐 판 = 아이템의 `mask`(문자열 배열, `#` 칸에만 화살표 생성). 화살표가 빠질수록 보라색 저주가 걷히고 금빛으로 정화.

## 퍼즐 규칙
- 화살표는 점 격자 위의 가는 선(piece: `cells` 꼬리→머리, `dir`). 몸통은 머리 경로를 따라 이동. 머리 앞 직선이 판 끝까지 비어야 빠짐(자기 몸 포함, 마스크 밖 칸은 빈 칸).
- 막히면 막는 화살표 앞까지 전진 후 튕겨 돌아오고(`bump`) 빨간색(`p.bad`)으로 남음, 정신력(♥) -1. 3번 막히면 실패.
- 보상: 의뢰 보수 + 남은 정신력 × 10 G.
- 판 크기: 회차(round)마다 mask를 k배 확대(`scaleMask`, 2→3→4배, 최대 40x52). 화면보다 큰 판은 카메라로 탐색.
- 생성기(`Puzzle.generate`): **풀이 역순으로 배치**(새 화살표의 탈출 경로는 이미 놓인 화살표를 지나지 않음 → 최신순으로 빼면 항상 풀림). 깊은 칸부터 머리를 잡고 몸통을 뒤로 키움. 모양은 다트(2–3)/중간(4–8)/긴 선(9+) × 직선·구불·벽 타는 나선. 남는 점은 `ord`(배치 순서) 규칙으로 이웃 꼬리 연장 또는 새 화살표 삽입 → mask의 모든 점이 선으로 채워짐.
- 화살표 기차 금지: 머리가 바로 앞 화살표의 꼬리를 가리키면(머리-꼬리-머리… 일렬) 하나의 긴 화살표로 병합(앞 화살표의 탈출 경로·순서를 유지하므로 항상 풀림). 길이 상한 없음.
- 짧은 화살표 뭉침 금지: 1~3칸 화살표는 이웃 화살표의 꼬리로 흡수하거나 이웃 머리를 연장해 흡수(`absorb`, `ord` 규칙 검사). 그래도 1~2칸 화살표끼리 붙으면 `generate`가 시드를 바꿔 최대 24번 `build`해 뭉침 0인 판을 선택, 끝까지 남으면 해당 화살표 제거(빈 점 허용). 다트 길이는 3~4칸.
- 난이도·방향 혼합: 머리 방향 점수 = 탈출 경로 위의 **빈 mask 점 수**(나중에 막힐 수 있는 자리, 최대 12) + 난수(`jitter = max(1.5, 9 - level*0.6)`) − 그 방향의 사용 비율×14. 판 밖으로 바로 나가는 방향(점수 0)은 뒤로 밀림 → 레벨이 오를수록 처음부터 풀리는 화살표 비율 감소(약 38% → 10%), 네 방향이 고르게 섞임. 남는 점 채우기는 스캔 시작 모서리를 무작위로.
- 간격: 칸 24–34px(`fit` 상한 34), 선 굵기 `max(3, cs*0.14)` + 5px 어두운 외곽선(`#120d0a`), 화살촉 `cs*0.5`도 같은 외곽선, 선 색 `#fffaf0`, 점은 화살표가 빠진 빈 칸에만 표시.
- 카메라(`PuzzleScene.applyCamera/zoomAt/centerOn`): 판 위 한 손가락 드래그=이동, 핀치/휠=확대·축소, 힌트는 해당 화살표로 이동. zoom 1 = 전체 보기. 퍼즐 시작 시 항상 zoom 1(전체 보기)에서 시작.
- 입력: 탭은 **뗄 때** 확정(10px 이상 움직이면 드래그, 두 손가락이면 탭 아님). `Input.tap / Input.drag / Input.zoom` 은 스텝당 1회.
- 경로 버튼: 모든 화살표 머리의 탈출 방향을 점선으로 표시(`this.guide`).

## 구조
- `index.html` — 모바일 세로 캔버스 540x960 (9:16), 뷰포트 최대 크기, 600px 이하 전체 화면.
- `src/engine.js` — 논리 좌표 540x960, HiDPI 백버퍼(`Engine.render`), 60Hz 고정 스텝, `Input.tap` 큐.
- `src/sfx.js` — Web Audio 합성 효과음, M키 음소거.
- `src/fx.js` — 파티클/화면 흔들림.
- `src/assets.js` — `assets/images/<name>.svg` 로더. `img`, `contain`, `cover`, `nine`(9-slice). 없으면 null → 폴백.
- `src/items.js` — 의뢰 아이템(이름·의뢰인·저주 설명·보수·mask), `commission(level)`, `drawIcon`(SVG 또는 mask 픽셀 폴백).
- `src/puzzle.js` — `generate(level, mask)`, `buildGrid`, `blockerOf`, `removable`. 레벨 시드로 결정적, greedy 검사로 항상 풀림 보정.
- `src/game.js` — 씬 3개, 저장(localStorage `cursed-smith.v1`: level, gold, purified).
- `_archive/wardrobe.js` — 이전 컨셉(옷 갈아입히기) 코드 보관, 로드 안 함.

## 레이아웃 (세로 540x960)
- 전체 미니멀 스타일: 단색 배경 `#17120f`, `panel`=평면 둥근 카드, `button`=평면 알약 버튼, 뒤로가기는 `roundBtn`. Codex UI 프레임/배경 그림(`ui/panel`, `ui/button*`, `ui/bubble`, `ui/bg_*`)은 더 이상 그리지 않음(아이콘·대장장이·아이템 그림만 사용).
- 접수대: 대장장이(70–470, 테두리 없음) + 대사 한 줄(492) / 의뢰 카드(524–774) / 시작 버튼(800) / 도감·소리(878).
- 퍼즐(미니멀): 단색 배경. HUD(0–130: 뒤로 버튼, 의뢰명, 하트, 남은 매듭, 대장장이 원형 아바타, 3px 정화 바, 대사 한 줄) / 판 `BOARD`(132–846, 화면 전체 폭) / 하단 원형 아이콘 버튼 4개(858–920, `roundBtn`).
- 클리어 시 팝업 없음: 마지막 화살표가 빠지는 순간(`clearing`)부터 같은 판 자리에 정화된 물건 그림이 떠오르고, `win` 상태에서 이름·보상이 판 아래쪽에, 하단 도구 버튼 자리에 "다음 의뢰/정화 도감" 버튼이 나옴. `drawOverlay`는 실패 때만 사용.
- 퍼즐 배경 그림(`PuzzleScene.drawArt`): 판 뒤에 낡은 물건 그림(`_old`, 알파 0.3 + 채도 0.45로 어둡게)을 격자에 맞춰 그림(`artRect`: 그림의 불투명 영역이 격자를 채우도록 배치). 화살표가 빠지면 그 경로를 따라 "안개" 마스크(`this.fog`, 격자 공간 오프스크린 캔버스)가 0.75초 동안 부드럽게 열리며(`strokeFog`, `clear` 애니) 수리된 그림이 `source-in` 합성으로 드러남(진행 중에는 알파 0.5로 은은하게 — 화살표가 가장 잘 보여야 함. 온전한 밝기는 클리어 후에만). 되돌리기는 `rebuildFog`. 클리어 시 카메라가 전체 보기로 돌아가고 수리된 그림 전체가 같은 자리에서 나타남. 화살표는 그림 위에서 읽히도록 어두운 외곽선을 먼저 그림.
- 화살표 뒤에는 타일/블록을 깔지 않음(점 격자만). 물건 모양은 화살표 배치로만 드러남.
- 터치 버튼은 높이 44px 이상.

## 규칙
- ES 모듈 대신 classic `<script>`. 순서: engine, sfx, fx, assets, items, puzzle, game.
- 외부 라이브러리는 버전 고정 CDN만.

## 배포
- Claude 아티팩트: `index.html` + `files`에 `src/*.js` 와 `assets/images/**/*.png`(축소본, `art_src/`는 제외).
- 단일 HTML 파일(공유용): `powershell -ExecutionPolicy Bypass -File tools\build_single.ps1` → `dist/restoration-smithy.html`(약 7.5MB). 스크립트를 인라인하고, 게임이 쓰는 그림(의뢰인 768px로 축소, 아이템, `ui/icon_*`)만 `window.EMBED_ASSETS`에 data URL로 넣음. `Assets.load`는 `EMBED_ASSETS`가 있으면 거기서만 읽고 나머지는 건너뜀. 코드나 그림을 바꾸면 다시 빌드. `dist/`는 git 제외.
- GitHub: 비공개 저장소 `ai0lus/restoration-smithy`(main).
