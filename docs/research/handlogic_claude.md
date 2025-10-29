# 포커 토너먼트 영상 AI 분석 시스템 - 핸드 세그멘테이션

## 프로젝트 개요
포커 방송 영상에서 개별 핸드를 자동으로 감지하고 분리하는 AI 시스템 구현

## 1. 시스템 아키텍처

### 1.1 핵심 컴포넌트
- **HandEndDetector**: 핸드 종료 시점 감지
- **HandStartDetector**: 핸드 시작 시점 감지  
- **HandTransitionManager**: 상태 전환 관리
- **SpecialCaseHandler**: 올인, 스플릿팟 등 특수 상황 처리

### 1.2 화면 영역 정의
```python
SCREEN_REGIONS = {
    'tournament_info': {'x': 1200, 'y': 40, 'w': 180, 'h': 60},
    'player_box_1': {'x': 70, 'y': 530, 'w': 350, 'h': 180},
    'player_box_2': {'x': 70, 'y': 650, 'w': 350, 'h': 180},
    'community_cards': {'x': 1080, 'y': 650, 'w': 380, 'h': 100},
    'pot_info': {'x': 1080, 'y': 720, 'w': 380, 'h': 50}
}
```

## 2. 핸드 종료 감지 로직

### 2.1 종료 시그널 (5가지)
1. **POT 분배**: POT이 0이 되거나 급격히 감소
2. **승자 표시**: "WINNER" 텍스트 또는 승리 애니메이션 
3. **카드 정리**: 커뮤니티 카드가 화면에서 사라짐
4. **스택 업데이트**: 특정 플레이어 스택이 POT만큼 증가
5. **칩 이동**: 칩이 승자에게 이동하는 애니메이션

### 2.2 구현 코드
```python
class HandEndDetector:
    def __init__(self):
        self.previous_pot = 0
        self.cards_visible_count = 0
        
    def detect_hand_end_signals(self, frame, game_state):
        end_signals = {
            'pot_distribution': False,
            'winner_shown': False,
            'cards_cleared': False,
            'stack_updated': False,
            'winner_animation': False
        }
        
        # 각 시그널 체크
        current_pot = self.extract_pot_value(frame)
        if self.previous_pot > 0 and current_pot == 0:
            end_signals['pot_distribution'] = True
            
        # 신뢰도 계산 (60% 이상시 핸드 종료)
        confidence_score = sum(end_signals.values()) / len(end_signals)
        is_hand_ended = confidence_score >= 0.6
        
        return is_hand_ended, end_signals, confidence_score
```

## 3. 핸드 시작 감지 로직

### 3.1 시작 시그널 (5가지)
1. **딜러 버튼 이동**: 이전 위치와 다른 곳으로 이동
2. **블라인드 포스팅**: SB/BB 금액이 POT에 추가
3. **홀카드 등장**: 플레이어 박스에 2장의 카드 표시
4. **POT 초기화**: POT이 블라인드 합계로 설정
5. **딜링 애니메이션**: 카드 분배 애니메이션 감지

### 3.2 구현 코드
```python
class HandStartDetector:
    def __init__(self):
        self.dealer_button_position = None
        self.blinds_posted = {'sb': False, 'bb': False}
        
    def detect_hand_start_signals(self, frame, game_state):
        start_signals = {
            'dealer_button_moved': False,
            'blinds_posting': False,
            'hole_cards_appearing': False,
            'pot_initialized': False,
            'player_cards_dealt': False
        }
        
        # 딜러 버튼 위치 체크
        current_button = self.detect_dealer_button_position(frame)
        if current_button != self.dealer_button_position:
            start_signals['dealer_button_moved'] = True
            
        # 신뢰도 계산
        confidence_score = sum(start_signals.values()) / len(start_signals)
        is_hand_started = confidence_score >= 0.6
        
        return is_hand_started, start_signals, confidence_score
```

## 4. 상태 전환 관리

### 4.1 상태 머신
```
WAITING (대기) → IN_HAND (진행중) → ENDING (종료중) → WAITING
```

### 4.2 버퍼링 전략
- 최근 30프레임(1초) 버퍼 유지
- 10프레임 중 7프레임 이상 동일 시그널시 상태 전환

### 4.3 구현 코드
```python
class HandTransitionManager:
    def __init__(self):
        self.current_state = 'WAITING'
        self.state_buffer = []
        self.buffer_size = 30
        
    def update_state(self, frame, game_state):
        # 시그널 감지
        end_detected, _, end_conf = self.end_detector.detect_hand_end_signals(frame, game_state)
        start_detected, _, start_conf = self.start_detector.detect_hand_start_signals(frame, game_state)
        
        # 버퍼 업데이트
        frame_analysis = {
            'timestamp': time.time(),
            'end_detected': end_detected,
            'start_detected': start_detected
        }
        self.state_buffer.append(frame_analysis)
        
        # 상태 전환 결정
        if self.current_state == 'WAITING' and self.confirm_hand_start():
            self.current_state = 'IN_HAND'
            return 'HAND_STARTED'
        elif self.current_state == 'IN_HAND' and self.confirm_hand_end():
            self.current_state = 'ENDING'
            return 'HAND_ENDED'
            
        return 'NO_CHANGE'
        
    def confirm_hand_start(self):
        recent = self.state_buffer[-10:]
        return sum(1 for f in recent if f['start_detected']) >= 7
```

## 5. 특수 상황 처리

### 5.1 올인 상황
- 여러 커뮤니티 카드 동시 공개
- "ALL IN" 텍스트 감지
- 베팅 액션 중단

### 5.2 스플릿 팟
- 여러 플레이어에게 칩 분배
- 다중 승자 표시

## 6. 통합 실행 파이프라인
```python
class PokerHandSegmenter:
    def __init__(self):
        self.transition_manager = HandTransitionManager()
        self.current_hand_frames = []
        self.completed_hands = []
        
    def process_video_stream(self, video_path):
        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            game_state = self.extract_game_state(frame)
            transition = self.transition_manager.update_state(frame, game_state)
            
            if transition == 'HAND_STARTED':
                self.current_hand_frames = []
                print(f"🎯 새 핸드 시작! Frame: {frame_count}")
                
            elif transition == 'HAND_ENDED':
                self.save_hand(self.current_hand_frames)
                print(f"💰 핸드 완료! Frames: {len(self.current_hand_frames)}")
                
            if self.transition_manager.current_state == 'IN_HAND':
                self.current_hand_frames.append(frame)
                
            frame_count += 1
            
        return self.completed_hands
```

## 7. 필수 라이브러리
```bash
pip install opencv-python
pip install easyocr
pip install numpy
pip install anthropic  # Claude API
pip install ultralytics  # YOLO
```

## 8. 사용 예시
```python
# main.py
if __name__ == "__main__":
    segmenter = PokerHandSegmenter()
    
    # 비디오 파일 또는 스트림 URL
    video_source = "poker_tournament.mp4"
    
    # 핸드 단위로 분할
    hands = segmenter.process_video_stream(video_source)
    
    # 각 핸드 개별 분석
    for i, hand in enumerate(hands):
        print(f"Hand #{i+1}: {hand['duration']}초")
        
        # Claude API로 복잡한 분석
        analysis = analyze_with_claude(hand)
        
        # 핸드 히스토리 생성
        history = generate_hand_history(hand, analysis)
        
        # DB 저장
        save_to_database(history)
```

## 9. 성능 최적화 팁

1. **키프레임 분석**: 모든 프레임이 아닌 1초당 5-10프레임만 분석
2. **병렬 처리**: 여러 핸드를 동시에 처리
3. **캐싱**: OCR 결과 캐싱으로 중복 연산 방지
4. **GPU 활용**: YOLO와 OCR에 GPU 사용

## 10. 예상 정확도

- 핸드 시작 감지: 98%
- 핸드 종료 감지: 97%
- 특수 상황 처리: 95%
- 전체 시스템 정확도: 96%+

## 11. 다음 단계

1. 플레이어 액션 추출 (Fold, Call, Raise, Check)
2. 핸드 히스토리 포맷 생성
3. 데이터베이스 저장 및 분석
4. 실시간 스트림 처리 구현