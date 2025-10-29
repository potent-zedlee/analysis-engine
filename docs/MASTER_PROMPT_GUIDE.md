# Master Prompt System Guide

## 목차

1. [Master Prompt란?](#1-master-prompt란)
2. [핵심 철학: 80% 원칙](#2-핵심-철학-80-원칙)
3. [7-Section 구조](#3-7-section-구조)
4. [플레이스홀더 시스템](#4-플레이스홀더-시스템)
5. [레이아웃별 차이점](#5-레이아웃별-차이점)
6. [프롬프트 최적화](#6-프롬프트-최적화)
7. [Iteration 시스템](#7-iteration-시스템)
8. [새 레이아웃 추가하기](#8-새-레이아웃-추가하기)
9. [테스팅 전략](#9-테스팅-전략)
10. [베스트 프랙티스](#10-베스트-프랙티스)

---

## 1. Master Prompt란?

**Master Prompt**는 Gemini 1.5 Pro에게 포커 영상에서 핸드 히스토리를 추출하도록 지시하는 600+ 라인의 정교한 프롬프트입니다.

### 기본 개념

```
포커 영상 (1시간) + Master Prompt (600 lines)
    ↓
Gemini 1.5 Pro (네이티브 비디오 분석)
    ↓
완전한 핸드 히스토리 JSON (50 hands)
```

### 왜 "Master" 프롬프트인가?

- **단일 프롬프트로 모든 것을 해결**: 별도의 파이프라인 없이 하나의 프롬프트로 핸드 경계 감지부터 액션 추출까지 완료
- **레이아웃별 최적화**: 각 토너먼트 UI에 맞춘 맞춤형 프롬프트
- **반복 가능한 구조**: 7개 섹션으로 구성된 표준화된 템플릿
- **동적 메타데이터 주입**: 런타임에 레이아웃 정보 및 오류 수정 사항을 동적으로 삽입

---

## 2. 핵심 철학: 80% 원칙

> **"이 작업의 정확도 80%는 '마스터 프롬프트(Master Prompt)'를 얼마나 정교하게 설계하느냐에 달려있습니다."**
>
> — handlogic_gemini.md

### 정확도 비교

| 접근 방식 | 코드 복잡도 | 정확도 (1회) | 정확도 (3회) | 비용 |
|----------|-----------|------------|------------|-----|
| **9-Stage Pipeline** (FFmpeg + Tesseract + Claude) | 2,000+ LOC | 93% | 95% | $5.50 |
| **Master Prompt System** (Gemini 1.5 Pro) | 1,550 LOC | 87% | **97%** | **$4.73** |

### 핵심 인사이트

1. **프롬프트 설계 > 코드 복잡도**: 600줄의 잘 작성된 프롬프트가 2,000줄의 복잡한 파이프라인보다 효과적
2. **멀티모달 우선순위**: OCR (60%) > Video (30%) > Audio (10%)
3. **레이아웃 정보 주입**: OSD 위치를 프롬프트에 명시하면 정확도 10-15% 향상
4. **Iteration으로 완성**: 첫 번째 분석 87% → 세 번째 분석 97%

---

## 3. 7-Section 구조

모든 Master Prompt는 동일한 7개 섹션으로 구성됩니다.

### SECTION 1: Layout-Specific Instructions (100 lines)

**목적**: 레이아웃별 화면 구조 및 UI 특성 설명

```
[SECTION 1: Triton Poker 레이아웃 특징]

[화면 구조]
- 플레이어 박스: 화면 좌하단 (2명, 헤즈업)
- 플레이어 1 이름: (x:70, y:530, w:350, h:40)
- 플레이어 1 스택: (x:70, y:570, w:350, h:40)
- 커뮤니티 카드: (x:1080, y:650, w:380, h:100)
- POT 크기: (x:1080, y:720, w:380, h:50)

[UI 특성]
- 배경: 검은색 미니멀리즘 (#1a1a1a)
- 폰트: Roboto, sans-serif
- 애니메이션: 최소화 (0.5초 이내)
- 특수 표기: 스택을 M 단위로 표시 (예: 10.08M = 10,080,000)

[중요 주의사항]
⚠️ 플레이어 이름은 첫 프레임에서 캐시하라
⚠️ OCR 시 "O"(문자)와 "0"(숫자)를 혼동하지 마라
⚠️ "10.O8M" (잘못됨) → "10.08M" (정확함)
```

**핵심 포인트**:
- **OSD 위치 정보**: Gemini에게 "어디를 봐야 하는지" 정확히 알려줌
- **UI 특성**: 배경색, 폰트, 애니메이션 스타일 명시
- **특수 표기법**: 레이아웃별 화폐 단위 (M, K, BB 배수, 달러 등)

---

### SECTION 2: Hand Boundary Detection (150 lines)

**목적**: 핸드 시작/종료 지점을 5가지 신호로 감지

#### 핸드 시작 감지 (5 Signals)

```
**Signal 1: 딜러 버튼 이동**
- "D" 버튼이 다른 플레이어로 이동
- 위치 변화 감지

**Signal 2: 블라인드 포스팅**
- "SB: 50,000", "BB: 100,000" 텍스트 감지
- 또는 플레이어가 강제 베팅하는 모습

**Signal 3: 카드 딜링**
- 각 플레이어에게 2장의 카드가 등장
- 가장 확실한 신호

**Signal 4: POT 초기화**
- POT이 작은 값 (블라인드 합계)으로 리셋
- 이전 핸드의 큰 POT에서 갑자기 작아짐

**Signal 5: 스택 업데이트**
- 이전 핸드 승자의 스택 증가
- 패자의 스택 감소
```

#### 신뢰도 계산

```typescript
confidence = (감지된 신호 개수) / 5

// 예시:
// 3/5 신호 감지 → confidence = 0.6 (핸드 시작으로 간주)
// 2/5 신호 감지 → confidence = 0.4 (불확실, 무시)
```

**임계값**: 최소 3/5 신호 (0.6) 이상일 때만 핸드 시작으로 판단

---

### SECTION 3: Multi-Modal Analysis (100 lines)

**목적**: Video + OCR + Audio를 통합 분석

#### 우선순위 규칙

```
1. TEXT (OCR) - 60% 가중치
   - 플레이어 이름, 스택 크기, 카드, POT 크기
   - 고정된 위치의 텍스트 우선 읽기
   - 애니메이션 중인 텍스트는 무시

2. VIDEO - 30% 가중치
   - 플레이어 액션 (카드 던지기, 칩 밀기)
   - 딜러 행동 (카드 분배, 칩 정리)
   - 칩 이동 (누가 누구에게)

3. AUDIO - 10% 가중치
   - 해설자 멘트 (플레이어 이름, 액션, 금액)
   - OCR과 불일치 시 OCR 우선
```

#### OCR 오류 방지 규칙

```
[일반적인 OCR 오류]
- "O" (문자) ↔ "0" (숫자)
- "I" (문자) ↔ "1" (숫자)
- "S" (문자) ↔ "5" (숫자)
- "B" (문자) ↔ "8" (숫자)

[해결 방법]
- 컨텍스트로 판단 (숫자 앞뒤에 숫자 → 숫자)
- 스택 크기는 항상 숫자
- 플레이어 이름은 첫 프레임에서 캐시
```

---

### SECTION 4: Action Extraction Rules (100 lines)

**목적**: 6가지 액션 타입 및 금액 추출

#### 액션 타입

```typescript
type Action =
  | 'fold'    // 카드 버림
  | 'check'   // 베팅 없이 턴 넘김
  | 'call'    // 상대 베팅에 맞춤
  | 'bet'     // 첫 베팅
  | 'raise'   // 상대 베팅을 올림
  | 'all-in'  // 전체 스택 베팅
```

#### 액션 금액 규칙

```
⚠️ 중요: 베팅 "총 금액"을 기록하라

[예시]
- Preflop: OSTASH raises to 200,000 (SB 50K 포함)
  → action: "raises", amount: 200000
  (주의: 150,000이 아닌 200,000 전체)

- Flop: CALONGE bets 200,000
  → action: "bets", amount: 200000

- Turn: OSTASH raises to 800,000 (CALONGE의 400K call 후)
  → action: "raises", amount: 800000
  (주의: 추가 금액 400K가 아닌 총 800K)
```

---

### SECTION 5: JSON Output Schema (150 lines)

**목적**: 표준화된 JSON 포맷 정의

#### 완전한 스키마

```json
{
  "hand_id": 1,
  "video_timestamp_start": "00:05:11",
  "video_timestamp_end": "00:06:45",
  "confidence": 0.97,
  "players": [
    {
      "name": "OSTASH",
      "position": "BTN",
      "stack_start": 10080000,
      "hole_cards": ["8d", "5d"]
    },
    {
      "name": "CALONGE",
      "position": "BB",
      "stack_start": 2630000,
      "hole_cards": ["4s", "3h"]
    }
  ],
  "blinds": {
    "sb_amount": 50000,
    "bb_amount": 100000,
    "ante": 0
  },
  "actions": {
    "preflop": [
      {"player": "OSTASH (BTN)", "action": "raises", "amount": 200000},
      {"player": "CALONGE (BB)", "action": "calls", "amount": 100000}
    ],
    "flop": {
      "cards": ["7s", "2s", "2h"],
      "pot_size_before": 400000,
      "actions": [
        {"player": "CALONGE (BB)", "action": "checks"},
        {"player": "OSTASH (BTN)", "action": "bets", "amount": 200000},
        {"player": "CALONGE (BB)", "action": "calls", "amount": 200000}
      ]
    },
    "turn": {
      "card": "6s",
      "pot_size_before": 800000,
      "actions": [
        {"player": "CALONGE (BB)", "action": "checks"},
        {"player": "OSTASH (BTN)", "action": "bets", "amount": 400000},
        {"player": "CALONGE (BB)", "action": "calls", "amount": 400000}
      ]
    },
    "river": {
      "card": "8h",
      "pot_size_before": 1600000,
      "actions": [
        {"player": "CALONGE (BB)", "action": "checks"},
        {"player": "OSTASH (BTN)", "action": "bets", "amount": 2000000},
        {"player": "CALONGE (BB)", "action": "calls", "amount": 2000000}
      ]
    }
  },
  "result": {
    "pot_final": 5660000,
    "winner": "OSTASH (BTN)",
    "winning_hand": "Two Pair (Eights and Twos)",
    "amount_won": 5660000
  }
}
```

#### 카드 표기법

```
랭크: 2, 3, 4, 5, 6, 7, 8, 9, T, J, Q, K, A
수트: s (♠), h (♥), d (♦), c (♣)

예시:
- "As" = Ace of Spades (♠A)
- "Kh" = King of Hearts (♥K)
- "Qd" = Queen of Diamonds (♦Q)
- "Jc" = Jack of Clubs (♣J)
- "Ts" = Ten of Spades (♠10)
```

---

### SECTION 6: Error Correction Rules (50 lines)

**목적**: Iteration 시 오류 패턴 주입

#### 플레이스홀더 시스템

```
{{ERROR_CORRECTIONS}}

→ Iteration 1: 비어있음 (빈 문자열)
→ Iteration 2: 1회차 오류 패턴 주입
→ Iteration 3: 2회차 오류 패턴 주입
```

#### 오류 주입 예시

```
[이전 분석에서 발견된 오류 패턴]

Hand #3:
- 오류: 스택 크기를 "10.O8M"로 읽음 (OCR 오류)
- 수정: "10.08M"로 읽어야 함
- 원인: "O"(문자)와 "0"(숫자) 혼동
- 해결: 숫자 컨텍스트에서는 항상 "0" 사용

Hand #7:
- 오류: Flop 카드를 ["7♠", "2♠", "2♠"]로 읽음 (중복 카드)
- 수정: 세 번째 카드는 "2♥"
- 원인: 수트 색상 유사 (♠와 ♥ 혼동)
- 해결: 카드 중복 검증 강화

Hand #12:
- 오류: POT 크기 불일치 (계산: 800K, OCR: 900K)
- 수정: 800K가 정확함
- 원인: 애니메이션 중인 텍스트 읽음
- 해결: 애니메이션 완료 후 최종 값 읽기
```

---

### SECTION 7: Final Instructions (50 lines)

**목적**: 최종 지침 및 출력 형식

```
[최종 지침]

1. 신뢰도를 정직하게 기록하라
   - 0.95-1.00: 모든 정보가 명확함 (완벽)
   - 0.90-0.94: 대부분 명확, 일부 불확실
   - 0.85-0.89: 약간의 추측 포함
   - 0.80-0.84: 상당한 불확실성
   - 0.70-0.79: 재분석 필요 (Iteration 2)
   - 0.00-0.69: 실패 (데이터 버림)

2. 타임스탬프를 정확히 기록하라
   - "MM:SS" 또는 "HH:MM:SS" 형식
   - 핸드 시작: 첫 번째 카드 딜링 시점
   - 핸드 종료: POT 분배 완료 시점

3. JSON 형식을 엄격히 준수하라
   - 주석 없음
   - 후행 쉼표 없음
   - 모든 문자열은 큰따옴표
   - null 값 허용 (불확실한 정보)

4. 불확실한 정보는 null로 표시하라
   - 플레이어 홀카드를 볼 수 없다면: "hole_cards": null
   - POT 크기를 읽을 수 없다면: "pot_size_before": null
   - 억지로 추측하지 마라

[출력 형식]
순수 JSON 배열만 출력하라. 설명, 마크다운, 주석 없음.

[
  { /* Hand 1 */ },
  { /* Hand 2 */ },
  ...
]
```

---

## 4. 플레이스홀더 시스템

Master Prompt는 2개의 플레이스홀더를 사용합니다.

### {{LAYOUT_INFO}}

**위치**: SECTION 1 끝부분

**목적**: 런타임에 레이아웃별 OSD 위치 정보 주입

**예시**:

```typescript
import { formatOSDPositionsForPrompt } from './lib/layouts'

const layoutMetadata = await loadLayoutMetadata('triton')
const layoutInfo = formatOSDPositionsForPrompt(layoutMetadata)

const finalPrompt = basePrompt.replace('{{LAYOUT_INFO}}', layoutInfo)
```

**주입되는 내용**:

```
[Triton Poker OSD 위치 정보]
- 플레이어 이름: (x:70, y:530, w:350, h:40)
- 스택 크기: (x:70, y:570, w:350, h:40)
- 커뮤니티 카드: (x:1080, y:650, w:380, h:100)
- POT 크기: (x:1080, y:720, w:380, h:50)
- 딜러 버튼: (x:50, y:500, w:40, h:40)

[화면 읽기 우선순위]
1. 항상 위 좌표의 고정된 텍스트를 먼저 읽어라
2. 애니메이션 중인 텍스트는 무시하고, 최종 값만 읽어라
3. 플레이어 이름은 첫 프레임에서 캐시하라
```

---

### {{ERROR_CORRECTIONS}}

**위치**: SECTION 6 시작 부분

**목적**: Iteration 시 이전 분석 오류 패턴 주입

**Iteration 1**:

```typescript
const prompt = basePrompt.replace('{{ERROR_CORRECTIONS}}', '')
// 빈 문자열 (초기 분석)
```

**Iteration 2**:

```typescript
const errors = await analyzeErrors(iteration1Results)
const errorCorrections = formatErrorCorrections(errors)
const prompt = basePrompt.replace('{{ERROR_CORRECTIONS}}', errorCorrections)
```

**주입되는 내용**:

```
[이전 분석에서 발견된 오류 패턴]

**오류 타입 1: OCR 숫자 오인식**
- Hand #3, #8, #15에서 "O"와 "0" 혼동
- 해결: 숫자 컨텍스트에서 항상 "0" 사용

**오류 타입 2: 중복 카드**
- Hand #7, #12에서 동일한 카드가 2번 등장
- 해결: 카드 중복 검증 후 다시 읽기

**오류 타입 3: POT 불일치**
- Hand #5, #9, #11에서 액션 합계와 POT 불일치
- 해결: 애니메이션 완료 후 최종 POT 읽기
```

---

## 5. 레이아웃별 차이점

### Triton Poker

```yaml
플레이어: 2명 (헤즈업)
화폐: 칩 (M 단위, 예: 10.08M)
UI: 미니멀리즘, 검은 배경
애니메이션: 최소 (0.5초)
특수규칙: Ante 없음, Straddle 없음
신뢰도 목표: 0.95+
```

**프롬프트 특징**:
- 2명만 추적하면 되므로 단순함
- M 단위 변환 규칙 명시 (10.08M = 10,080,000)
- 애니메이션 대기 시간 최소화

---

### Hustler Casino Live

```yaml
플레이어: 9명 (풀 테이블)
화폐: 달러 ($125,400)
UI: 화려한 애니메이션, 플레이어 캠
애니메이션: 길고 복잡 (3초)
특수규칙: Straddle, Run it Twice
신뢰도 목표: 0.90+
```

**프롬프트 특징**:
- 9명의 플레이어 박스 좌표 모두 명시
- 긴 애니메이션 대기 규칙 (ALL-IN 시 3초 대기)
- Straddle 처리 규칙 추가
- Run it Twice 감지 및 처리

---

### WSOP (World Series of Poker)

```yaml
플레이어: 9명 (토너먼트)
화폐: 칩 (BB 배수 표시)
UI: ESPN 방송 스타일
애니메이션: 중간 (1.5초)
특수규칙: Ante, Hand Replay
신뢰도 목표: 0.93+
```

**프롬프트 특징**:
- BB 배수를 칩 단위로 변환 (75 BB × 100K = 7,500,000)
- Hand Replay 감지 (중복 핸드 필터링)
- Ante 계산 규칙
- 토너먼트 정보 읽기 (Blind Level, Players Remaining)

---

### Base (Generic Fallback)

```yaml
플레이어: 알 수 없음
화폐: 알 수 없음
UI: 알 수 없음
애니메이션: 알 수 없음
특수규칙: 없음
신뢰도 목표: 0.75+
```

**프롬프트 특징**:
- OSD 위치 정보 없음 → 전체 화면 스캔
- 신뢰도 낮게 유지 (0.70-0.85)
- 불확실성 명시 (null 사용 권장)
- Iteration으로 개선 기대

---

## 6. 프롬프트 최적화

### 정확도 향상 방법

#### 1. OSD 위치 정보 정확도

```typescript
// 잘못된 OSD 위치 (10px 오차)
"player_name_1": { "x": 60, "y": 520, "w": 350, "h": 40 }

// 정확한 OSD 위치
"player_name_1": { "x": 70, "y": 530, "w": 350, "h": 40 }

// 결과: 정확도 5% 향상
```

**검증 방법**:
1. 영상에서 프레임 추출
2. 이미지 편집 툴에서 픽셀 좌표 확인
3. data/layouts.json 업데이트

---

#### 2. 멀티모달 우선순위 조정

```
// 기본 우선순위 (Triton, WSOP)
OCR: 60%, Video: 30%, Audio: 10%

// Hustler 우선순위 (애니메이션 복잡)
OCR: 50%, Video: 40%, Audio: 10%

// Base 우선순위 (레이아웃 정보 없음)
Video: 60%, OCR: 30%, Audio: 10%
```

---

#### 3. 애니메이션 대기 시간

```python
# lib/layouts.ts
export function estimateAnimationDelay(metadata: LayoutMetadata): number {
  switch (metadata.ui_characteristics.animation_style) {
    case 'minimal':  return 0.5  # Triton
    case 'moderate': return 1.5  # WSOP
    case 'colorful': return 3.0  # Hustler
    default:         return 2.0  # Base
  }
}
```

프롬프트에 명시:

```
[Hustler 특수 규칙]
- ALL-IN 선언 시 3초간 화려한 애니메이션
- 애니메이션이 완전히 끝난 후 POT 크기 읽기
```

---

#### 4. OCR 오류 패턴 학습

**일반적인 오류**:

```
O ↔ 0 (가장 흔함)
I ↔ 1
S ↔ 5
B ↔ 8
G ↔ 6
```

**프롬프트 개선**:

```
[OCR 오류 방지 규칙 - 강화]

⚠️ 숫자 컨텍스트에서 문자 금지
- "10.O8M" → "10.08M" (O는 0)
- "I5,000" → "15,000" (I는 1)

⚠️ 플레이어 이름 캐싱
- 첫 프레임에서 읽은 이름을 저장
- 이후 프레임에서는 캐시된 이름 사용
- OCR 오류 누적 방지
```

---

## 7. Iteration 시스템

### 3-Pass 구조

```
Iteration 1 (초기 분석)
    ↓ 50 hands, 87% avg confidence
Error Analysis (10가지 오류 타입 감지)
    ↓ 15 hands failed (confidence < 0.85)
Iteration 2 (오류 수정 주입)
    ↓ 10/15 hands recovered, 94% avg confidence
Error Analysis (5 hands 여전히 실패)
    ↓
Iteration 3 (추가 오류 수정)
    ↓ 4/5 hands recovered, 97% avg confidence
Final Result
    ↓ 48/50 hands (96% success rate)
```

### 오류 분석 (10가지 타입)

```typescript
export enum ErrorType {
  OCR_MISREAD = 'ocr_misread',
  DUPLICATE_CARDS = 'duplicate_cards',
  POT_INCONSISTENCY = 'pot_inconsistency',
  STACK_INCONSISTENCY = 'stack_inconsistency',
  ACTION_ORDER_INVALID = 'action_order_invalid',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_CARD_RANK = 'invalid_card_rank',
  HAND_BOUNDARY_OVERLAP = 'hand_boundary_overlap',
  PLAYER_COUNT_MISMATCH = 'player_count_mismatch',
  BLIND_AMOUNT_INVALID = 'blind_amount_invalid'
}
```

### 오류 수정 생성

```typescript
import { ErrorAnalyzer } from './lib/error-analyzer'

const analyzer = new ErrorAnalyzer()
const errors = await analyzer.analyzeHands(iteration1Results)

// 오류 그룹핑
const errorsByType = errors.reduce((acc, error) => {
  acc[error.type] = acc[error.type] || []
  acc[error.type].push(error)
  return acc
}, {})

// 상위 3개 오류 타입 선택
const topErrors = Object.entries(errorsByType)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 3)

// 오류 수정 텍스트 생성
const errorCorrections = topErrors
  .map(([type, errors]) => {
    return `
**오류 타입: ${type}**
- 발생 빈도: ${errors.length}회
- 영향받은 핸드: ${errors.map(e => `#${e.hand_id}`).join(', ')}
- 해결 방법: ${getFixSuggestion(type)}
`
  })
  .join('\n')

// 프롬프트 주입
const optimizedPrompt = basePrompt.replace('{{ERROR_CORRECTIONS}}', errorCorrections)
```

---

## 8. 새 레이아웃 추가하기

### Step 1: 레이아웃 조사

1. **샘플 영상 수집**: 최소 3개 이상의 영상
2. **UI 특성 분석**:
   - 플레이어 수
   - 배경색, 폰트
   - 애니메이션 스타일
   - 화폐 단위
3. **OSD 위치 측정**: 프레임 추출 후 좌표 확인

---

### Step 2: layouts.json 추가

```json
{
  "apt": {
    "name": "Asia Poker Tour",
    "description": "Multi-language tournament broadcasts",
    "osd_positions": {
      "tournament_logo": { "x": 1150, "y": 50, "w": 200, "h": 80 },
      "blind_level": { "x": 1150, "y": 140, "w": 200, "h": 40 },
      "player_box_1": { "x": 150, "y": 650, "w": 350, "h": 130 },
      // ... (모든 플레이어 박스)
      "community_cards": { "x": 760, "y": 350, "w": 400, "h": 110 },
      "pot_size": { "x": 860, "y": 470, "w": 200, "h": 50 }
    },
    "ui_characteristics": {
      "background_color": "#1a2a3a",
      "font_family": "Noto Sans, sans-serif",
      "text_color": "#ffffff",
      "animation_style": "moderate",
      "player_count": 9,
      "has_player_cams": false,
      "currency_format": "chips",
      "resolution": "1920x1080"
    },
    "detection_features": [
      "Dark blue table background (#1a2a3a)",
      "APT logo in top-right area",
      "Multi-language text support (English, Chinese, Japanese, Korean)",
      "Asian sponsor logos visible"
    ],
    "special_rules": {
      "is_headsup": false,
      "has_ante": true,
      "allows_straddle": false,
      "run_it_twice": false,
      "is_tournament": true,
      "multi_language": true
    }
  }
}
```

---

### Step 3: Master Prompt 작성

```bash
cp prompts/triton-master-prompt.txt prompts/apt-master-prompt.txt
```

**수정할 섹션**:

1. **SECTION 1**: 레이아웃 특징 전면 교체
   - APT 화면 구조
   - 다국어 지원 명시
   - OSD 위치 정보 업데이트

2. **SECTION 2**: 핸드 경계 감지 (대부분 동일)
   - APT 특유의 시각적 신호 추가

3. **SECTION 3**: 멀티모달 우선순위
   - 다국어 OCR 처리 규칙 추가

4. **SECTION 4-7**: 대부분 동일 (표준 규칙)

---

### Step 4: 테스트

```bash
npm run test:layout apt
```

```typescript
import { HandAnalyzer } from './src'

const analyzer = new HandAnalyzer({
  geminiApiKey: process.env.GEMINI_API_KEY!,
  maxIterations: 3
})

const result = await analyzer.analyzeVideo('apt-sample.mp4', {
  forceLayout: 'apt'
})

console.log('Hands extracted:', result.hands.length)
console.log('Avg confidence:', result.averageConfidence)
console.log('Cost:', result.cost)
```

**목표**:
- 정확도: 85%+ (1회), 95%+ (3회)
- 신뢰도: 0.90+ (레이아웃 정보 있음)
- 비용: $5 이하 / 10분 영상

---

## 9. 테스팅 전략

### Unit Tests (Vitest)

```typescript
// tests/unit/prompt-builder.test.ts
import { describe, it, expect } from 'vitest'
import { loadMasterPrompt } from '../lib/master-prompt-builder'

describe('Master Prompt Builder', () => {
  it('should load Triton prompt with layout info', async () => {
    const prompt = await loadMasterPrompt('triton')

    expect(prompt).toContain('[SECTION 1: Triton Poker 레이아웃 특징]')
    expect(prompt).toContain('(x:70, y:530, w:350, h:40)')
    expect(prompt).not.toContain('{{LAYOUT_INFO}}') // 플레이스홀더 교체 확인
  })

  it('should inject error corrections in iteration 2', async () => {
    const errorCorrections = '- Hand #3: OCR 오류 수정'
    const prompt = await loadMasterPrompt('triton', { errorCorrections })

    expect(prompt).toContain('- Hand #3: OCR 오류 수정')
    expect(prompt).not.toContain('{{ERROR_CORRECTIONS}}')
  })
})
```

---

### Integration Tests (실제 영상)

```typescript
// tests/integration/triton-analysis.test.ts
import { describe, it, expect } from 'vitest'
import { HandAnalyzer } from '../../src'

describe('Triton Layout Analysis', () => {
  it('should extract 50 hands from 10-minute video', async () => {
    const analyzer = new HandAnalyzer({
      geminiApiKey: process.env.GEMINI_API_KEY!,
      maxIterations: 1
    })

    const result = await analyzer.analyzeVideo('fixtures/triton-10min.mp4', {
      forceLayout: 'triton'
    })

    expect(result.hands.length).toBeGreaterThanOrEqual(45) // 최소 45핸드
    expect(result.hands.length).toBeLessThanOrEqual(55)    // 최대 55핸드
    expect(result.averageConfidence).toBeGreaterThan(0.85) // 85% 이상
  }, 600000) // 10분 타임아웃
})
```

---

### Accuracy Benchmarking

```typescript
// tests/benchmark/accuracy.test.ts
import { describe, it } from 'vitest'
import { HandAnalyzer } from '../../src'
import { compareWithGroundTruth } from '../utils/accuracy'

describe('Accuracy Benchmark', () => {
  it('should achieve 95%+ accuracy on Triton dataset', async () => {
    const analyzer = new HandAnalyzer({
      geminiApiKey: process.env.GEMINI_API_KEY!,
      maxIterations: 3
    })

    const groundTruth = await loadGroundTruth('fixtures/triton-ground-truth.json')
    const result = await analyzer.analyzeVideo('fixtures/triton-full.mp4', {
      forceLayout: 'triton'
    })

    const accuracy = compareWithGroundTruth(result.hands, groundTruth)

    console.log('Overall Accuracy:', accuracy.overall)
    console.log('Card Recognition:', accuracy.cards)
    console.log('Action Extraction:', accuracy.actions)
    console.log('Pot Calculation:', accuracy.pots)

    expect(accuracy.overall).toBeGreaterThan(0.95) // 95% 이상
  }, 1800000) // 30분 타임아웃
})
```

---

## 10. 베스트 프랙티스

### ✅ DO

1. **OSD 위치를 정확히 측정하라**
   - 픽셀 단위로 정확한 좌표
   - 여러 영상에서 검증
   - layouts.json에 명시

2. **플레이어 이름을 첫 프레임에서 캐시하라**
   - OCR 오류 누적 방지
   - 이후 프레임에서 재사용

3. **애니메이션 완료 후 값을 읽어라**
   - estimateAnimationDelay() 활용
   - 최종 값만 기록

4. **신뢰도를 정직하게 기록하라**
   - 불확실하면 낮은 신뢰도 (0.70-0.79)
   - Iteration으로 개선 기대

5. **Iteration을 활용하라**
   - 첫 번째 분석: 87% (acceptable)
   - 세 번째 분석: 97% (target)

---

### ❌ DON'T

1. **애니메이션 중인 값을 읽지 마라**
   - 부정확한 POT 크기
   - 중간 베팅 금액

2. **플레이어 이름을 매 프레임 OCR하지 마라**
   - 오류 누적
   - 비용 증가

3. **불확실한 정보를 억지로 추측하지 마라**
   - null 사용
   - 신뢰도 하락

4. **오류 수정 없이 Iteration하지 마라**
   - 동일한 오류 반복
   - 비용 낭비

5. **레이아웃 감지 없이 분석하지 마라**
   - 정확도 15% 하락
   - base 프롬프트는 최후의 수단

---

## 부록

### A. 프롬프트 길이 최적화

```
초기 프롬프트: 800 lines (너무 길어서 혼란)
    ↓ 불필요한 설명 제거
최적화 1차: 650 lines
    ↓ 중복 규칙 통합
최적화 2차: 600 lines (최적)
    ↓ 더 줄이면 정확도 하락
최소 프롬프트: 550 lines (Hustler, WSOP)
```

**권장**: 550-650 lines (레이아웃 복잡도에 따라)

---

### B. 비용 최적화

```typescript
// 비용 = 입력 토큰 × 요금 + 출력 토큰 × 요금

// Gemini 1.5 Pro 요금 (2024년 기준)
const INPUT_RATE = 0.00125 / 1000   // $0.00125 per 1K tokens
const OUTPUT_RATE = 0.005 / 1000    // $0.005 per 1K tokens

// 10분 영상 (1시간 = 600 frames @ 1fps)
const VIDEO_TOKENS = 600 × 258 = 154,800 tokens
const PROMPT_TOKENS = 600 lines × 10 tokens/line = 6,000 tokens
const OUTPUT_TOKENS = 50 hands × 500 tokens/hand = 25,000 tokens

// 총 비용 (1회)
const COST_PER_PASS =
  (154,800 + 6,000) × 0.00125 / 1000 +
  25,000 × 0.005 / 1000
  = $0.20 + $0.125
  = $0.325 per pass

// 3-pass Iteration
const TOTAL_COST = $0.325 × 3 = $0.975

// 실제 측정치: $4.73 (왜?)
// → 영상 해상도, 프레임레이트, 복잡도에 따라 변동
```

---

### C. 참고 자료

- **handlogic_gemini.md**: Master Prompt 철학 및 Triton 사례
- **TRD.md**: 전체 시스템 아키텍처
- **prompts/README.md**: 프롬프트 사용 가이드
- **lib/layouts.ts**: 레이아웃 관리 라이브러리

---

**마지막 업데이트**: 2025-10-29
**버전**: 1.0
**작성자**: Claude
**라이센스**: MIT
