# AGENTS.md — 낡은 무기 수리 대장간 (Restoration Smithy)

> 컨셉 변경: 저주/마법 설정은 폐기. 대장장이는 오래되고 낡은 무기를 **수리**한다. 그림에 보라색·룬·마법 효과를 넣지 말 것.
> 아이템은 수리 전(`items/<id>_old.png`, 녹슬고 낡음)과 수리 후(`items/<id>.png`) 2장이며 구도·크기·위치가 같아야 한다.

Codex 등 코딩 에이전트용 프로젝트 안내. 자세한 코드 구조는 `CLAUDE.md` 참고.

## 게임 한 줄 요약
여자 대장장이가 저주받은 무구·장신구를 의뢰받아 해주한다. 해주 = 화살표 퍼즐이며, 퍼즐 판은 의뢰 물건의 실루엣 모양.

## 아트 작업 (Codex 담당)
- 그림 목록·규칙·캐릭터 설정: **`CODEX_ASSETS.md`** 를 반드시 먼저 읽을 것.
- 모든 그림은 **SVG** 로 `assets/images/` 아래 지정 경로에 저장. 파일명이 곧 게임의 키라서 바꾸지 말 것.
- `<svg>` 에 `width`/`height`/`viewBox` 동일하게 명시, 외부 참조·텍스트 없음, 캐릭터·아이템·아이콘은 투명 배경.
- 대장장이 4개 표정 파일은 구도·크기·위치가 동일해야 함(게임에서 바꿔 끼움).
- 기존 게임·작품의 캐릭터나 그림을 따라 하지 말고 오리지널로. 캐릭터는 작업복 차림 유지.

## 코드 규칙
- 빌드 도구 없음. classic `<script>` (ES 모듈 금지), `index.html` 스크립트 순서 유지.
- 그림 로딩은 `src/assets.js` (`Assets.img/contain/cover/nine`). 새 그림을 추가하면 `src/game.js` 의 `Assets.load([...])` 목록에도 추가.
- 확인: `powershell -ExecutionPolicy Bypass -File serve.ps1` 후 http://localhost:8080
