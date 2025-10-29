# Hand Analysis Engine - Claude Project Context

## 프로젝트 개요
포커 영상에서 핸드 히스토리를 자동으로 추출하는 AI 엔진입니다.
Templar Archives 웹사이트와 독립적으로 개발 및 테스트할 수 있으며, npm 라이브러리 패키지로 통합됩니다.

## 미션
"모든 포커 영상을 정확한 핸드 히스토리로 변환한다"

---

## 🎯 핵심 기능

### 1. 핸드 경계 감지 (Hand Boundary Detection)
- **Scene Change Detection**: 프레임 간 차이를 분석하여 핸드 전환 지점 탐지
- **Claude Vision 검증**: 각 씬 변경 시점을 AI가 검증
- **결과**: 각 핸드의 시작/종료 타임코드 추출

### 2. 핸드 시퀀스 분석 (Hand Sequence Analysis)
- **8 키프레임 추출**: Preflop, Flop(3), Turn, River, Showdown, Result
- **Claude Vision 분석**: 각 프레임에서 카드, 플레이어, 액션, 팟 크기 추출
- **결과**: 완전한 핸드 히스토리 JSON

### 3. 플레이어 인식 (Player Recognition)
- **OCR 기반 이름 추출**: Tesseract.js로 플레이어 이름 인식
- **포지션 맵핑**: 화면 위치를 포커 포지션(BTN, SB, BB 등)으로 변환
- **스택 크기 추출**: 각 플레이어의 칩 스택 인식

### 4. 카드 인식 (Card Recognition)
- **홀카드 인식**: 플레이어별 2장의 카드 추출
- **보드 카드 인식**: 커뮤니티 카드 5장 추출 (Flop, Turn, River)
- **Claude Vision 활용**: 카드 이미지를 텍스트로 변환 (예: "A♠", "K♥")

### 5. 액션 추출 (Action Extraction)
- **베팅 액션**: Fold, Check, Call, Bet, Raise, All-in 인식
- **베팅 금액**: 각 액션의 금액 추출
- **액션 순서**: 각 스트리트별 액션 시퀀스 재구성

---

## 📂 프로젝트 구조

```
hand-analysis-engine/
├── src/
│   ├── core/
│   │   ├── hand-analyzer.ts          # 메인 분석 엔진
│   │   ├── video-processor.ts         # 비디오 처리 파이프라인
│   │   └── claude-client.ts           # Claude API 클라이언트
│   │
│   ├── detectors/
│   │   ├── scene-change-detector.ts   # 씬 변경 감지
│   │   ├── hand-boundary-detector.ts  # 핸드 경계 감지 (Claude Vision)
│   │   └── keyframe-extractor.ts      # 키프레임 추출
│   │
│   ├── extractors/
│   │   ├── card-extractor.ts          # 카드 인식
│   │   ├── player-extractor.ts        # 플레이어 정보 추출
│   │   ├── action-extractor.ts        # 액션 추출
│   │   └── ocr-extractor.ts           # OCR 엔진
│   │
│   ├── types/
│   │   ├── hand.ts                    # 핸드 히스토리 타입
│   │   ├── player.ts                  # 플레이어 타입
│   │   ├── card.ts                    # 카드 타입
│   │   └── action.ts                  # 액션 타입
│   │
│   ├── utils/
│   │   ├── frame-utils.ts             # 프레임 처리 유틸리티
│   │   ├── image-utils.ts             # 이미지 처리 유틸리티
│   │   └── logger.ts                  # 로깅 유틸리티
│   │
│   └── index.ts                       # 엔트리 포인트
│
├── tests/
│   ├── unit/                          # 유닛 테스트
│   ├── integration/                   # 통합 테스트
│   └── fixtures/                      # 테스트 픽스처 (샘플 영상)
│
├── docs/
│   ├── API.md                         # API 문서
│   ├── ARCHITECTURE.md                # 아키텍처 문서
│   └── EXAMPLES.md                    # 사용 예제
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── CLAUDE.md                          # 이 파일
└── README.md
```

---

## 🚀 개발 로드맵

### Phase 0: 프로젝트 설정 ✅
- ✅ 디렉토리 구조 생성
- ✅ TypeScript + Vitest 설정
- ✅ Dependencies 설치 (Anthropic SDK, FFmpeg, Tesseract, Sharp)

### Phase 1: 씬 변경 감지 (Scene Change Detection)
**목표**: 비디오에서 씬 변경 지점을 찾아 프레임을 추출

- **1.1 Frame Extractor** (1-2시간)
  - FFmpeg로 비디오에서 N초마다 프레임 추출
  - Sharp로 이미지 리사이징 및 전처리
  - 프레임 저장 및 메타데이터 관리

- **1.2 Scene Change Detector** (2-3시간)
  - 프레임 간 픽셀 차이 계산 (histogram, SSIM)
  - 임계값 기반 씬 변경 감지
  - 후보 프레임 필터링 (노이즈 제거)

- **1.3 Unit Tests** (1시간)
  - Frame Extractor 테스트
  - Scene Change Detector 테스트
  - Mock 비디오 파일로 테스트

### Phase 2: 핸드 경계 감지 (Hand Boundary Detection)
**목표**: 씬 변경 지점 중 핸드 전환 지점만 식별

- **2.1 Claude Vision Integration** (2-3시간)
  - Claude API 클라이언트 구현
  - 프레임 이미지를 base64로 인코딩
  - "Is this a new hand starting?" 프롬프트 설계

- **2.2 Hand Boundary Detector** (2-3시간)
  - 씬 변경 프레임을 Claude Vision으로 검증
  - 핸드 시작/종료 판단 로직
  - 타임코드 계산 및 반환

- **2.3 Integration Tests** (1-2시간)
  - 실제 영상으로 테스트
  - 정확도 측정 (Precision, Recall)
  - 비용 최적화 (프레임 샘플링 간격 조정)

### Phase 3: 키프레임 추출 (Keyframe Extraction)
**목표**: 각 핸드에서 중요한 8개 프레임 추출

- **3.1 Keyframe Extractor** (2-3시간)
  - 핸드 시작/종료 타임코드 기반
  - 8개 타임스탬프 계산 (균등 분할 또는 휴리스틱)
  - FFmpeg로 정확한 시간에 프레임 추출

- **3.2 Frame Validator** (1시간)
  - 프레임 품질 검증 (블러, 어둠 감지)
  - 잘못된 프레임 재추출

- **3.3 Unit Tests** (1시간)
  - 타임스탬프 계산 테스트
  - 프레임 추출 정확도 테스트

### Phase 4: 핸드 시퀀스 분석 (Hand Sequence Analysis)
**목표**: 8개 키프레임에서 완전한 핸드 히스토리 추출

- **4.1 Hand Analyzer** (3-4시간)
  - Claude Vision으로 각 프레임 분석
  - 구조화된 JSON 프롬프트 설계
  - 응답 파싱 및 검증

- **4.2 Player Extractor** (2-3시간)
  - OCR로 플레이어 이름 추출
  - 스택 크기 추출
  - 포지션 맵핑

- **4.3 Card Extractor** (2-3시간)
  - 홀카드 추출 (플레이어별 2장)
  - 보드 카드 추출 (Flop 3장, Turn 1장, River 1장)
  - 카드 포맷 정규화 ("A♠" → "As")

- **4.4 Action Extractor** (2-3시간)
  - 각 스트리트별 액션 시퀀스 추출
  - 베팅 금액 정규화
  - 팟 크기 검증

- **4.5 Hand History Builder** (2시간)
  - 모든 데이터를 표준 핸드 히스토리 포맷으로 변환
  - PokerStars, GTO Wizard 포맷 지원
  - JSON 출력

- **4.6 Integration Tests** (2-3시간)
  - 실제 영상으로 End-to-End 테스트
  - 정확도 측정 (카드 인식률, 액션 정확도)
  - 성능 측정 (처리 시간, API 비용)

### Phase 5: 최적화 및 에러 처리
**목표**: 프로덕션 레벨의 안정성과 성능

- **5.1 Error Handling** (2시간)
  - 네트워크 에러 재시도 로직
  - Claude API Rate Limit 처리
  - 부분 실패 시 복구 전략

- **5.2 Performance Optimization** (2-3시간)
  - 프레임 추출 병렬 처리
  - Claude API 배치 요청
  - 캐싱 전략

- **5.3 Logging & Monitoring** (1-2시간)
  - 상세한 로그 출력
  - 진행 상황 추적
  - 에러 리포팅

### Phase 6: 문서화 및 배포
**목표**: 사용하기 쉬운 라이브러리로 만들기

- **6.1 API Documentation** (2시간)
  - 모든 public API 문서화
  - 사용 예제 작성
  - 타입 정의 최적화

- **6.2 README & Examples** (2시간)
  - Quick Start 가이드
  - 고급 사용 예제
  - 트러블슈팅 가이드

- **6.3 npm Package** (1-2시간)
  - package.json 최적화
  - npm publish 준비
  - Semantic Versioning

---

## 🛠️ 기술 스택

### 핵심 라이브러리
- **@anthropic-ai/sdk**: Claude Vision API 클라이언트
- **fluent-ffmpeg**: 비디오 프레임 추출
- **tesseract.js**: OCR (플레이어 이름, 스택 크기)
- **sharp**: 이미지 전처리 및 최적화

### 개발 도구
- **TypeScript**: 타입 안전성
- **Vitest**: 테스트 프레임워크
- **tsx**: TypeScript 실행 환경

---

## 📖 API 설계 (예상)

### 메인 API

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

const analyzer = new HandAnalyzer({
  claudeApiKey: process.env.CLAUDE_API_KEY,
  checkInterval: 2, // 2초마다 프레임 체크
})

// 1. 핸드 경계 감지
const boundaries = await analyzer.detectHandBoundaries(videoPath)
// => [{ startTime: "00:05:11", endTime: "00:06:45" }, ...]

// 2. 핸드 히스토리 추출
const hands = await analyzer.extractHands(videoPath, boundaries)
// => [{ players: [...], board: [...], actions: [...], pot: 12000 }, ...]

// 3. 원스텝 분석 (경계 감지 + 추출)
const result = await analyzer.analyzeVideo(videoPath)
// => { boundaries: [...], hands: [...] }
```

---

## 🎯 성능 목표

- **정확도**: 95%+ (카드 인식, 액션 추출)
- **처리 속도**: 10분 영상 → 15분 내 처리
- **비용**: 10분 영상당 $3 이하 (Claude API)
- **메모리**: 2GB 이하

---

## 🚧 현재 상태

**Phase 0 완료**: 프로젝트 설정, 디렉토리 구조, Dependencies 설치

**다음 단계**: Phase 1 - 씬 변경 감지 구현

---

## 📝 참고 문서

- **handlogic_gemini.md**: 포커 비디오 분석 시스템 구축 계획 (Triton UI 기준)
- **Templar Archives CLAUDE.md**: 메인 웹사이트 프로젝트 문서
- **Claude Vision API Docs**: https://docs.anthropic.com/claude/docs/vision

---

**마지막 업데이트**: 2025-10-29
**문서 버전**: 1.0
**상태**: 프로젝트 초기 설정 완료, Phase 1 시작 준비
