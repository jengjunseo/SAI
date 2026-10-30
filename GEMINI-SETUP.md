# Gemini 연결

Sites의 서버 환경변수에 `GEMINI_API_KEY`를 비밀 값으로 등록하고 최신 저장 버전을 다시 배포합니다. 브라우저 입력창이나 소스 파일에는 키를 넣지 않습니다. 기존 `NVIDIA_API_KEY`는 사용하지 않습니다.

| 이름 | 기본값 / 설정 |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 키. 필수 비밀 값 |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite`. 생략 가능 |
| `MAX_DAILY_AI_CALLS` | 앱 전체 한국 시간 하루 50회. 1~500으로 설정 가능 |

요청은 Gemini Interactions REST API를 사용합니다. 구조화된 JSON 출력, `thinking_level: minimal`, 출력 최대 5,200 토큰, 요청 제한 90초입니다. 실제 API 사용 가능량은 Google 프로젝트의 등급·모델별 한도에 따르며, 앱의 50회 설정이 Google의 한도를 늘리지는 않습니다.

서버가 허용된 공공기관·국제기구·언론사의 HTTPS 원문을 읽고 본문 문단만 최대 18개 추출합니다. 읽기 실패, 구독 페이지, 허용되지 않은 호스트나 리디렉션은 AI 호출 전에 중단합니다. 본문은 일시적으로 입력에 사용하고 원문 전체를 DB에 보관하지 않습니다. Gemini는 실제 확보한 출처 ID와 문단 ID를 각 발언에 지정합니다. 여섯 발언 모두 유효한 ID와 짧은 근거 요약이 있어야 저장합니다. 출처 URL과 언론사 이름은 서버가 붙입니다. 이는 출처 존재와 참조 문단을 검증하며, 주장의 의미까지 독립적으로 팩트체크한 결과는 아닙니다.

채팅 참관의 3초 입력 동작, 다음 발언, 스크롤, 다시 보기는 저장된 여섯 발언을 재생합니다. 이 조작에서는 AI 호출이 발생하지 않습니다. Google Search Grounding이나 URL Context 도구를 사용하지 않습니다. 편집 기준 v4는 합니다체의 토론 발언과 근거만 생성하며 `basis`를 생성하거나 새 저장본에 넣지 않습니다.

기사별로 한 번 생성해 D1에 저장하고 모든 독자가 재사용합니다. 같은 기사 중복 생성은 잠금으로 막습니다. 실패한 요청도 앱 한도에 포함하며 자동 재시도나 다른 유료 모델로의 전환은 없습니다. 이전 방식의 대화는 독자가 다시 정리하기를 선택할 때만 갱신하고, 실패하면 원래 대화를 유지합니다.

뉴스는 AI 검색 대신 RSS로 수집합니다. 오늘 보도된 기사를 우선하고 5분 캐시, 수동 갱신 60초 간격, 한국 시간 자정 날짜 전환을 사용합니다. 5개를 채우기 어려울 때만 최근 48시간 기사로 보충합니다. 북마크·하트·댓글·읽음은 AI를 부르지 않습니다.

로컬에서는 `.env.example`을 `.dev.vars`로 복사해 값을 입력합니다. `.dev.vars`는 Git에서 제외됩니다. 검증 명령: `node --test tests/service.test.mjs tests/gemini.test.mjs tests/stream.test.mjs tests/playback.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit`, `npm run build`.

참고: [모델](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Interactions API](https://ai.google.dev/api/interactions-api).
