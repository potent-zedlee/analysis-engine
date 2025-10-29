# Test Video Fixtures

이 디렉토리는 통합 테스트에 사용되는 테스트 비디오 파일을 저장합니다.

## 테스트 비디오 요구사항

통합 테스트를 실행하려면 다음 비디오 파일이 필요합니다:

### test-video.mp4
- **권장 길이**: 1-5분
- **포맷**: MP4 (H.264 codec)
- **해상도**: 1280x720 이상
- **내용**: 포커 게임 영상 (Triton, Hustler, WSOP 등)

## 테스트 비디오 준비 방법

### 옵션 1: 직접 다운로드
1. YouTube에서 포커 영상 URL 복사
2. 비디오 다운로드 도구 사용 (yt-dlp 권장)
3. 이 디렉토리에 `test-video.mp4`로 저장

```bash
# yt-dlp로 다운로드 (설치 필요)
yt-dlp -f "best[height<=720]" -o fixtures/videos/test-video.mp4 <YOUTUBE_URL>
```

### 옵션 2: 샘플 비디오 생성
FFmpeg로 테스트용 샘플 비디오 생성:

```bash
ffmpeg -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:duration=60 \
  -pix_fmt yuv420p fixtures/videos/test-video.mp4
```

## 통합 테스트 실행

테스트 비디오가 준비되면 통합 테스트를 실행할 수 있습니다:

```bash
# API 키 설정
export YOUTUBE_API_KEY=your_youtube_api_key
export GEMINI_API_KEY=your_gemini_api_key

# 통합 테스트 실행
npm test tests/integration/
```

## 주의사항

- **Git에 커밋하지 마세요**: 비디오 파일은 크기가 크므로 `.gitignore`에 포함되어 있습니다.
- **저작권 주의**: 테스트 목적으로만 사용하고, 공개적으로 배포하지 마세요.
- **API 비용**: 실제 API 키를 사용하는 통합 테스트는 비용이 발생할 수 있습니다.

## API 키 없이 테스트하기

API 키가 없으면 통합 테스트가 자동으로 스킵됩니다. Unit 테스트는 API 키 없이도 실행 가능합니다:

```bash
npm test tests/unit/
```
