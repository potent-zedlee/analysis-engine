## Gemini 1.5 Pro를 이용한 핸드 히스토리 추출 워크플로우
이 작업은 Gemini API를 통해 프로그래밍 방식으로 접근하는 것이 가장 효과적이며, 핵심은 **"마스터 프롬프트(Master Prompt)"**를 얼마나 정교하게 설계하느냐에 달려있습니다.

### 1단계: 데이터 준비 (영상 VOD)
분석 대상: 실시간 스트림보다는, 방금 끝난 토너먼트의 고화질 VOD 파일(예: 2시간~8시간 분량)을 준비합니다.

입력: Gemini 1.5 Pro API에 이 비디오 파일 전체를 한 번에 입력으로 제공합니다. 모델은 이 영상 전체를 하나의 '문맥'으로 파악합니다.

### 2단계: "마스터 프롬프트" 설계 (가장 중요)
단순히 "핸드 히스토리 추출해 줘"라고 하면 안 됩니다. AI가 '포커 핸드'라는 개념을 정의하고, **정해진 형식(Schema)**에 맞춰 데이터를 '반복적으로' 뽑아내도록 매우 구체적으로 지시해야 합니다.

다음은 사장님의 "Poker On Air" 그래픽 스타일에 맞춰 수정/보완이 필요한 프롬프트 설계 예시입니다.

너는 세계 최고의 포커 토너먼트 분석 AI야.
나는 너에게 [Poker On Air 토너먼트 VOD] 영상을 제공한다.

너의 임무는 이 영상 전체를 처음부터 끝까지 분석하여, 영상에 등장하는 **모든 포커 핸드(Hand) 각각의 "핸드 히스토리"**를 추출하는 것이다.

**[작업 지침]**

1.  **핸드의 시작과 끝 식별:**
    * '핸드의 시작'은 첫 번째 카드가 딜링되거나, 플레이어들이 앤티(Ante) 또는 블라인드(Blind)를 내는 시점이다.
    * '핸드의 끝'은 팟(Pot)이 특정 플레이어에게 수여되거나, 마지막 플레이어가 폴드하는 시점이다.
    * 다음 핸드가 시작하기 전의 모든 광고, 해설자 잡담, 브레이크 타임은 무시한다.

2.  **핵심 정보 추출 (멀티모달 활용):**
    * **영상 (Video):** 플레이어의 액션(폴드, 벳, 콜), 딜러의 행동, 커뮤니티 카드(플랍, 턴, 리버)를 시각적으로 분석한다.
    * **텍스트 (OCR):** 화면의 그래픽(OSD)을 정확히 읽어 다음 정보를 추출한다:
        * 플레이어 이름과 포지션 (예: BTN, SB, BB)
        * 각 플레이어의 '홀 카드(Hole Cards)' (공개되었을 경우)
        * 각 플레이어의 '스택 사이즈(Chip Count)'
        * '팟 사이즈(Pot Size)'와 '베팅 금액(Bet Size)'
    * **음성 (Audio):** 해설자의 멘트 (예: "플레이어 A가 3만 칩으로 레이즈합니다")를 참고하여 영상/텍스트로 파악하기 힘든 액션을 보완한다.

3.  **출력 형식 (JSON Array):**
    * 모든 핸드 히스토리를 반드시 다음 JSON 형식의 배열(Array)로 출력해 줘. 각 핸드는 JSON 객체 1개에 해당한다.
    * 만약 정보가 불확실하거나 영상에서 찾을 수 없다면 `null` 또는 빈 배열 `[]`로 처리한다.

**[요청 JSON 출력 형식]**
[
  {
    "hand_id": 1, // 핸드 순차 번호
    "video_timestamp_start": "HH:MM:SS", // 영상 내 핸드 시작 타임스탬프
    "players": [ // 핸드 시작 시점의 플레이어 정보
      {
        "name": "Player A",
        "position": "BTN",
        "stack_start": 150000,
        "hole_cards": ["Ah", "Kc"] // 공개된 경우
      },
      {
        "name": "Player B",
        "position": "SB",
        "stack_start": 80000,
        "hole_cards": null
      },
      // (나머지 플레이어들)
    ],
    "blinds": {
      "sb_amount": 1000,
      "bb_amount": 2000,
      "ante": 200
    },
    "actions": {
      "preflop": [
        {"player": "Player C (UTG)", "action": "folds"},
        {"player": "Player A (BTN)", "action": "raises", "amount": 6000},
        {"player": "Player B (SB)", "action": "folds"},
        {"player": "Player D (BB)", "action": "calls", "amount": 4000}
      ],
      "flop": {
        "cards": ["Qc", "Ts", "9d"],
        "pot_size_before": 14200,
        "actions": [
          {"player": "Player D (BB)", "action": "checks"},
          {"player": "Player A (BTN)", "action": "bets", "amount": 7000},
          {"player": "Player D (BB)", "action": "calls", "amount": 7000}
        ]
      },
      "turn": {
        "card": "2h",
        "pot_size_before": 28200,
        "actions": [
          {"player": "Player D (BB)", "action": "checks"},
          {"player": "Player A (BTN)", "action": "checks"}
        ]
      },
      "river": {
        "card": "Jc",
        "pot_size_before": 28200,
        "actions": [
           // ... (이하 생략) ...
        ]
      }
    },
    "showdown": [
      {"player": "Player A (BTN)", "hand": ["Ah", "Kc"], "hand_rank": "K-High"},
      {"player": "Player D (BB)", "hand": ["Qh", "Jd"], "hand_rank": "Two Pair (Queens, Jacks)"}
    ],
    "result": {
      "pot_final": 50000,
      "winner": "Player D (BB)"
    },
    "summary_commentary": "해설자가 '리버에 절묘하게 투 페어가 완성되었다'고 언급함." // (음성 분석 기반)
  },
  {
    "hand_id": 2,
    // (다음 핸드 정보)
  }
]

### 3단계: 실행 및 결과 검증 (Iteration)
실행: 준비된 VOD와 이 마스터 프롬프트를 Gemini 1.5 Pro API로 전송하여 실행합니다. 영상 길이에 따라 처리 시간이 몇 분 정도 소요될 수 있습니다.

결과 (Output): 모델은 거대한 JSON 텍스트를 반환합니다. 이 텍스트에는 영상 속 모든 핸드의 히스토리가 위에서 정의한 구조대로 담겨있을 것입니다.

검증 및 수정:

100% 완벽하지 않을 수 있습니다. 1~2개 핸드를 샘플로 검증합니다.

오류 예: 'Player A'를 'P1ayer A'로 읽거나(OCR 오류), 베팅 금액을 잘못 읽거나, 포지션을 혼동할 수 있습니다.

개선: 오류가 발생했다면 프롬프트를 수정합니다. (예: "플레이어 이름은 항상 화면 왼쪽 상단 그래픽을 기준으로 해줘.", "베팅 금액은 팟 사이즈 그래픽 바로 아래 숫자를 읽어줘.")

이 과정을 몇 번 반복(Iteration)하여 "Poker On Air" 스트림 그래픽과 스타일에 최적화된 마스터 프롬프트를 완성해야 합니다.

## 📌 핵심 성공 전략: "그래픽(OSD)의 일관성"
Gemini 1.5 Pro가 아무리 뛰어나도, 이 작업의 **정확도 80%는 "Poker On Air" 스트림의 그래픽(OSD)**이 얼마나 깔끔하고 일관적이냐에 달려있습니다.

Best: 플레이어 이름, 스택, 팟, 베팅 금액, 홀 카드가 항상 고정된 위치에, 읽기 쉬운 폰트로, 애니메이션 효과 없이 표시되는 것이 가장 좋습니다.

Worst: 정보가 화려한 애니메이션과 함께 나타났다 사라지거나, 위치가 자주 바뀌면 AI가 혼동하기 쉽습니다.

만약 "GG Breakdown" 프로젝트를 위해 이 데이터 추출을 자동화하는 것이 장기 목표라면, 라이브 스트림의 **그래픽 디자인 단계(UI/UX)**부터 AI가 읽기 쉽도록 설계하는 것을 강력히 추천합니다.

이 방법론을 활용하면, VOD 한 편을 통째로 입력하고 몇 분 만에 수백 개의 핸드 히스토리 DB를 자동으로 구축하는 강력한 분석 파이프라인을 만들 수 있습니다.