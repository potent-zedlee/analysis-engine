# AI Poker Analyzer Specification  
**버전:** 1.0  
**작성일:** 2025년 10월 29일 (Asia/Seoul)  
**작성자:** Zed  
**목적:** 포커 토너먼트 영상에서 핸드 단위 정보를 자동 추출 및 분석하는 시스템 구현을 위한 Codex 기준 사양서.  
**주의:** 얼굴 인식·신원 추정 등은 대한민국 개인정보보호법 (PIPA) 상 민감정보로 분류되므로 별도 동의 및 법률 검토가 필요합니다 .

---

## 1️⃣ 프로젝트 개요
- **목표:** 포커 영상에서 핸드별로 플레이어, 카드, 액션, 결과를 JSON 형태로 자동 구조화.  
- **주요 출력:**  
  1. 핸드 ID 및 타임스탬프  
  2. 플레이어 리스트 (이름·스택·위치)  
  3. 보드카드 / 홀카드  
  4. 액션 타임라인  
  5. Pot 및 승자  
  6. 핸드 랭킹  

---

## 2️⃣ 전체 아키텍처
1. **Preprocessing:** FFmpeg → 프레임 추출 및 리사이즈   
2. **Scene Detection:** PySceneDetect로 핸드 단위 분할   
3. **Object Detection:** YOLOv8 (카드·HUD·플레이어)   
4. **OCR:** PaddleOCR (이름·스택 텍스트 추출)   
5. **Card Classifier:** CNN 모델로 랭크·무늬 분류  
6. **Action Parser:** 프레임 변화 추적 기반 액션 인식  
7. **Rule Engine:** treys 라이브러리로 핸드 평가   
8. **LLM 보정(선택):** LLaVA / GPT-4V 활용   
9. **Storage/UI:** JSON → DB → Streamlit 대시보드   

---

10. 파일 구조 제안

poker-analyzer/
├── data/
│   ├── raw_videos/
│   ├── frames/
│   ├── labels/
├── models/
│   ├── hand_segmentation/
│   ├── hud_ocr/
│   ├── player_recognition/
│   ├── action_detection/
├── output/
│   ├── json/
│   ├── csv/
│   ├── sqlite/
├── src/
│   ├── main.py
│   ├── hand_detector.py
│   ├── ocr_extractor.py
│   ├── player_tracker.py
│   ├── action_parser.py
│   ├── poker_validator.py
├── requirements.txt
└── README.md

4. 주요 모듈별 설명

4.1 Hand Segmentation Module

목표: 한 영상에서 핸드 단위(Deal~Showdown)를 자동 분리
접근 방식:
	•	영상 프레임 단위로 로고·테이블 초기화 장면 감지
	•	카드 배분 그래픽 등장 타이밍 분석
	•	“POT RESET” 등 HUD 변화 기반 탐지
기술 스택: OpenCV, SceneDetect, PySceneDetect, FFmpeg, ResNet-18 fine-tuning

⸻

4.2 HUD OCR Module

목표: 영상 좌하단 HUD에서 카드·스택·포트·이름 인식
접근 방식:
	•	영역별 Crop 후 OCR
	•	텍스트 위치별 고정 매핑 (예: 왼쪽=SB, 오른쪽=BB)
	•	카드 패턴(♠, ♥, ♦, ♣) 전처리

기술 스택: EasyOCR, PaddleOCR, cv2.threshold + dilation

출력 예시:
{
“player1”: { “name”: “OSTASH”, “cards”: [“8♦”, “5♦”], “stack”: 10.08, “position”: “SB” },
“player2”: { “name”: “CALONGE”, “cards”: [“4♠”, “3♥”], “stack”: 2.63, “position”: “BB” },
“board”: [“7♠”, “2♠”, “2♥”, “5♥”, “5♣”],
“pot”: 1925000
}

⸻

4.3 Player Recognition Module

목표: 영상 속 얼굴과 HUD 이름을 매칭하여 플레이어 식별
접근 방식:
	•	얼굴 임베딩(face embedding) 추출 (facenet, insightface)
	•	HUD 이름과 프레임 타이밍 매칭
	•	동일 인물의 다각도 보정

기술 스택: DeepFace, dlib, face_recognition, DeepSORT or ByteTrack

⸻

4.4 Action Extraction Module

목표: 각 플레이어의 베팅, 체크, 폴드, 콜 등 액션 감지
접근 방식:
	•	HUD 텍스트 변화(“BET”, “CALL”, “RAISE”) 추적
	•	칩 이동 및 사운드 이벤트 감지
	•	손 움직임 기반 모션 분석

기술 스택: YOLOv8, Whisper, OpenPose

출력 예시:
[
{ “street”: “flop”, “player”: “OSTASH”, “action”: “bet”, “amount”: 1100000 },
{ “street”: “flop”, “player”: “CALONGE”, “action”: “fold” }
]

⸻

4.5 Poker Logic Verification Module

목표: 인식된 결과가 텍사스 홀덤 규칙에 부합하는지 검증
검증 항목:
	•	각 핸드당 2장의 홀카드
	•	보드 카드 5장 이하
	•	Preflop → Flop → Turn → River 순서
	•	Pot, Bet Size 일관성

기술 스택: Deuces (treys), Custom Validator

⸻
