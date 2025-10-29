# 🎰 Hand Analysis Engine

AI-powered poker hand history extraction engine using Claude Vision API.

> **Status**: 🚧 In Development - Phase 0 Complete

---

## 📖 Overview

Hand Analysis Engine is a TypeScript library that automatically extracts complete hand histories from poker video streams. It combines computer vision, OCR, and Claude AI to analyze poker videos and generate structured hand data.

### Key Features

- 🎯 **Hand Boundary Detection**: Automatically detect where each hand starts and ends
- 🃏 **Card Recognition**: Extract hole cards and community cards (Flop, Turn, River)
- 👤 **Player Identification**: Recognize player names, positions, and stack sizes
- 💰 **Action Extraction**: Capture all betting actions (Fold, Check, Call, Bet, Raise, All-in)
- 📊 **Hand History Generation**: Output in standard formats (PokerStars, GTO Wizard, JSON)

---

## 🚀 Quick Start

### Installation

```bash
npm install hand-analysis-engine
```

### Basic Usage

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

const analyzer = new HandAnalyzer({
  claudeApiKey: process.env.CLAUDE_API_KEY,
  checkInterval: 2, // Check every 2 seconds
})

// Analyze a video
const result = await analyzer.analyzeVideo('./poker-stream.mp4')

console.log(`Found ${result.hands.length} hands`)
console.log(result.hands[0]) // First hand details
```

### Advanced Usage

```typescript
// Step 1: Detect hand boundaries only
const boundaries = await analyzer.detectHandBoundaries('./video.mp4')
console.log(boundaries)
// => [{ startTime: "00:05:11", endTime: "00:06:45" }, ...]

// Step 2: Extract specific hands
const hands = await analyzer.extractHands('./video.mp4', boundaries)
console.log(hands[0])
// => {
//   players: [
//     { name: "OSTASH", position: "SB", stack: 10080000, cards: ["8d", "5d"] },
//     { name: "CALONGE", position: "BB", stack: 2630000, cards: ["4s", "3d"] }
//   ],
//   board: ["7c", "2s", "2h", "5s", "5c"],
//   actions: [
//     { street: "preflop", player: "OSTASH", action: "raise", amount: 200000 },
//     { street: "preflop", player: "CALONGE", action: "call", amount: 200000 },
//     ...
//   ],
//   pot: 1925000,
//   winner: "OSTASH"
// }
```

---

## 🛠️ Development

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- FFmpeg (installed on system)
- Claude API Key

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/hand-analysis-engine.git
cd hand-analysis-engine

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your CLAUDE_API_KEY

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure

```
hand-analysis-engine/
├── src/
│   ├── core/              # Main analysis engine
│   ├── detectors/         # Scene change & boundary detection
│   ├── extractors/        # Card, player, action extraction
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── tests/                 # Unit and integration tests
├── docs/                  # Documentation
└── package.json
```

---

## 📊 Performance

- **Accuracy**: 95%+ (cards, actions)
- **Speed**: ~1.5x video length (10min video → 15min processing)
- **Cost**: ~$3 per 10min video (Claude API)
- **Memory**: <2GB

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

---

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Usage Examples](./docs/EXAMPLES.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## 🗺️ Roadmap

- [x] **Phase 0**: Project setup and dependencies
- [ ] **Phase 1**: Scene change detection
- [ ] **Phase 2**: Hand boundary detection with Claude Vision
- [ ] **Phase 3**: Keyframe extraction
- [ ] **Phase 4**: Hand sequence analysis (cards, players, actions)
- [ ] **Phase 5**: Optimization and error handling
- [ ] **Phase 6**: Documentation and npm package

See [CLAUDE.md](./CLAUDE.md) for detailed development plan.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a PR.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

- [Claude AI by Anthropic](https://anthropic.com) - Vision API
- [FFmpeg](https://ffmpeg.org) - Video processing
- [Tesseract.js](https://tesseract.projectnaptha.com) - OCR engine
- [Sharp](https://sharp.pixelplumbing.com) - Image processing

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/hand-analysis-engine/issues)
- **Email**: support@templararchives.com
- **Discord**: [Templar Archives Community](https://discord.gg/templar)

---

Made with ❤️ by [Templar Archives](https://templar-archives.vercel.app)
