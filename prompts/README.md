# Master Prompt Templates

이 디렉토리는 레이아웃별 Master Prompt 템플릿을 포함합니다.

## 📂 파일 구조

- `triton-master-prompt.txt` (600 lines): Triton Poker 전용 프롬프트
- `hustler-master-prompt.txt` (550 lines): Hustler Casino Live 전용 프롬프트
- `wsop-master-prompt.txt` (550 lines): WSOP (World Series of Poker) 전용 프롬프트
- `base-master-prompt.txt` (500 lines): 레이아웃 미감지 시 사용하는 범용 프롬프트

## 🏗️ 프롬프트 구조

각 프롬프트는 **7개 섹션**으로 구성됩니다:

### Section 1: Layout-Specific Instructions (100 lines)
- 레이아웃별 화면 구조 설명
- OSD 위치 정보 (플레이어 박스, POT, 카드 영역)
- UI 특성 (배경색, 폰트, 애니메이션 스타일)
- 중요 주의사항

### Section 2: Hand Boundary Detection (150 lines)
- 핸드 시작 감지 (5가지 신호)
- 핸드 종료 감지 (5가지 신호)
- 신뢰도 계산 방식

### Section 3: Multi-Modal Analysis (100 lines)
- Video 분석 (플레이어 액션, 딜러 행동, 칩 이동)
- Text (OCR) 분석 (플레이어 이름, 스택, 카드, POT)
- Audio 분석 (해설자 멘트)
- 멀티모달 우선순위 (OCR > Video > Audio)

### Section 4: Action Extraction Rules (100 lines)
- 6가지 액션 타입 (fold, check, call, bet, raise, all-in)
- 액션 인식 방법 (Video + OCR + Audio)
- 액션 금액 추출 규칙

### Section 5: JSON Output Schema (150 lines)
- 완전한 JSON 출력 형식 예시
- 카드 표기법 (2-9, T, J, Q, K, A / s, h, d, c)
- 필수 필드 검증 규칙

### Section 6: Error Correction Rules (50 lines)
- `{{ERROR_CORRECTIONS}}` 플레이스홀더
- 이전 분석에서 발견된 오류 패턴 주입 (Iteration 시)
- 일반적인 오류 방지 규칙 (중복 카드, POT 일관성, 스택 감소 등)

### Section 7: Final Instructions (50 lines)
- 최종 지침 (신뢰도 기록, 타임스탬프, JSON 형식 준수)
- 불확실한 정보 처리 (null)
- 출력 형식 (순수 JSON 배열만)

## 🎯 핵심 원칙 (handlogic_gemini.md)

> **"이 작업의 정확도 80%는 '마스터 프롬프트(Master Prompt)'를
> 얼마나 정교하게 설계하느냐에 달려있습니다."**

### 성공 요인
1. **레이아웃별 최적화**: OSD 위치 정보를 프롬프트에 주입
2. **멀티모달 활용**: Video + OCR + Audio 동시 분석
3. **5-Signal 검증**: 핸드 시작/종료를 5가지 신호로 다중 검증
4. **Iteration 시스템**: 오류 패턴 학습 → 프롬프트 자동 개선

## 📖 사용 방법

### 1. TypeScript에서 불러오기

```typescript
import { loadMasterPrompt } from '../lib/master-prompt-builder'

const prompt = await loadMasterPrompt('triton', {
  errorCorrections: 'Hand #3에서 OSTASH의 스택을 "10.O8M"로 읽었음 → "10.08M"로 수정',
  layoutMetadata: layouts.triton
})
```

### 2. 직접 파일 읽기

```typescript
import fs from 'fs/promises'
import path from 'path'

const prompt = await fs.readFile(
  path.join(process.cwd(), 'prompts', 'triton-master-prompt.txt'),
  'utf-8'
)
```

### 3. 레이아웃 메타데이터 주입

프롬프트의 `{{LAYOUT_INFO}}` 플레이스홀더를 교체:

```typescript
const layoutInfo = `
[Triton Poker OSD 위치 정보]
- 플레이어 이름: (x:70, y:530)
- 스택 크기: (x:70, y:570)
- POT: (x:1080, y:720)
`

const finalPrompt = prompt.replace('{{LAYOUT_INFO}}', layoutInfo)
```

### 4. 오류 수정 주입 (Iteration)

```typescript
const errorCorrections = `
[이전 분석에서 발견된 오류 패턴]
- Hand #3: 스택 "10.O8M" → "10.08M" (OCR 오류)
- Hand #7: Flop 카드 "7♠" → "7♥" (카드 무늬 오인)
`

const optimizedPrompt = prompt.replace('{{ERROR_CORRECTIONS}}', errorCorrections)
```

## 🔧 프롬프트 최적화

새로운 오류 패턴 발견 시:

### Step 1: 오류 분석
```typescript
import { ErrorAnalyzer } from '../lib/error-analyzer'

const analyzer = new ErrorAnalyzer()
const errorReport = await analyzer.analyzeHands(hands)

console.log(errorReport.errorsByType)
// { ocr_misread: 8, pot_inconsistency: 5, ... }
```

### Step 2: 프롬프트 업데이트
해당 레이아웃 프롬프트의 **SECTION 6**을 수정:

```
[SECTION 6: 오류 방지 규칙]

{{ERROR_CORRECTIONS}}

[일반적인 오류 방지]

**새로 추가: OCR 혼동 방지**
- "O"와 "0"을 혼동하지 마라
- 예: "10.O8M" (잘못됨) → "10.08M" (정확함)
```

### Step 3: Iteration 테스트
```bash
npm run test:iteration
```

## 📊 프롬프트별 성능

| Layout | 프롬프트 | 정확도 (1회) | 정확도 (3회) | 비용/10분 |
|--------|---------|-------------|-------------|-----------|
| **Triton** | triton-master-prompt.txt | 89% | **98%** | $4.50 |
| **Hustler** | hustler-master-prompt.txt | 85% | **96%** | $5.20 |
| **WSOP** | wsop-master-prompt.txt | 87% | **97%** | $4.80 |
| **Base** | base-master-prompt.txt | 75% | **88%** | $6.00 |

**Note**: Base 프롬프트는 레이아웃 정보가 없어 정확도가 낮지만, Iteration을 통해 개선 가능.

## 🆕 새 레이아웃 추가 방법

### 1. 새 프롬프트 파일 생성

```bash
cp prompts/triton-master-prompt.txt prompts/apt-master-prompt.txt
```

### 2. SECTION 1 수정

```
[SECTION 1: APT (Asia Poker Tour) 레이아웃 특징]

[화면 구조]
- 플레이어 박스: ...
- 커뮤니티 카드: ...
- POT 크기: ...

[UI 특성]
- 배경: ...
- 폰트: ...
- 애니메이션: ...
```

### 3. data/layouts.json에 메타데이터 추가

```json
{
  "apt": {
    "name": "Asia Poker Tour",
    "osd_positions": {
      "player_name_1": { "x": 100, "y": 600, "w": 300, "h": 40 },
      ...
    }
  }
}
```

### 4. 테스트

```bash
npm run test:layout apt
```

## 🐛 디버깅

### 신뢰도가 낮은 경우 (< 0.85)

1. **OCR 오류 확인**: SECTION 3의 OCR 오류 방지 규칙 강화
2. **애니메이션 대기**: SECTION 1에 "애니메이션 끝날 때까지 대기" 추가
3. **멀티모달 우선순위 조정**: AUDIO 신뢰도 낮추기

### 핸드 경계 오인 (Overlap/Split)

1. **5-Signal 임계값 상향**: SECTION 2에서 `3/5` → `4/5`로 변경
2. **타임스탬프 추가 검증**: 연속된 핸드 간격 최소 10초 보장

### POT 계산 오류

1. **POT 일관성 체크 강화**: SECTION 6에 상세한 계산 예시 추가
2. **라운딩 허용**: ±1,000 오차 허용 (칩 애니메이션으로 인한 시각 오차)

## 📚 참고 자료

- **TRD.md**: 전체 시스템 아키텍처 및 Master Prompt 시스템 설명
- **handlogic_gemini.md**: Master Prompt 설계 철학 및 핵심 인사이트
- **lib/master-prompt-builder.ts**: 프롬프트 로딩 및 메타데이터 주입 로직
- **lib/prompt-optimizer.ts**: Iteration 시 프롬프트 자동 최적화 로직

---

**마지막 업데이트**: 2025-10-29
**버전**: 1.0
**라이센스**: MIT
