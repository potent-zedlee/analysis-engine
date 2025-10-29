# Hand Analysis Engine API Reference

Complete API documentation for the Hand Analysis Engine library.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Core Classes](#core-classes)
  - [HandAnalyzer](#handanalyzer)
  - [GeminiClient](#geminiclient)
  - [MasterPromptBuilder](#masterpromptbuilder)
  - [ErrorAnalyzer](#erroranalyzer)
  - [PromptOptimizer](#promptoptimizer)
  - [TemplarIntegration](#templarintegration)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

// Analyze a video
const result = await analyzer.analyzeVideo({
  videoUrl: 'https://youtube.com/watch?v=...',
  layout: 'triton',
  maxIterations: 3
})

console.log(`Found ${result.totalHands} hands`)
console.log(`Success rate: ${(result.successfulHands / result.totalHands * 100).toFixed(1)}%`)
```

---

## Core Classes

### HandAnalyzer

Main analysis engine that orchestrates the entire pipeline.

#### Constructor

```typescript
constructor(apiKey: string)
```

**Parameters:**
- `apiKey` (string): Gemini API key from Google AI Studio

**Example:**
```typescript
const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)
```

---

#### Methods

##### `analyzeVideo(options: AnalysisOptions): Promise<AnalysisResult>`

Analyze a video and extract all hands with automatic iteration.

**Parameters:**

```typescript
interface AnalysisOptions {
  videoUrl?: string        // YouTube URL
  videoPath?: string       // Local file path
  layout?: string          // Layout type (triton, hustler, wsop, apt)
  maxIterations?: number   // Default: 3
}
```

**Returns:**

```typescript
interface AnalysisResult {
  hands: Hand[]                // Successfully analyzed hands
  totalHands: number           // Total hands detected
  successfulHands: number      // Hands with confidence above threshold
  failedHands: number          // Hands that failed all iterations
  averageConfidence: number    // Average confidence across all hands
  totalIterations: number      // Total iterations performed
  processingTime: number       // Total processing time in ms
}
```

**Example:**

```typescript
const result = await analyzer.analyzeVideo({
  videoUrl: 'https://youtube.com/watch?v=abc123',
  layout: 'triton',
  maxIterations: 3
})

console.log(`Hands: ${result.totalHands}`)
console.log(`Successful: ${result.successfulHands}`)
console.log(`Avg Confidence: ${result.averageConfidence}`)
console.log(`Iterations: ${result.totalIterations}`)
console.log(`Processing time: ${result.processingTime}ms`)
```

---

##### `analyzeSingleHand(videoSource, startTime, endTime, layout?): Promise<Hand>`

Analyze a single hand without iteration (for testing).

**Parameters:**
- `videoSource` (string): Video URL or local path
- `startTime` (string): Start time (e.g., "00:05:11")
- `endTime` (string): End time (e.g., "00:06:45")
- `layout` (string, optional): Layout type (default: "triton")

**Returns:** `Hand` object

**Example:**

```typescript
const hand = await analyzer.analyzeSingleHand(
  'video.mp4',
  '00:05:11',
  '00:06:45',
  'triton'
)

console.log(`Hand ID: ${hand.hand_id}`)
console.log(`Confidence: ${hand.confidence}`)
console.log(`Players: ${hand.players.length}`)
```

---

### GeminiClient

Low-level client for Google Gemini 1.5 Pro Vision API.

#### Constructor

```typescript
constructor(config: GeminiClientConfig)
```

**Parameters:**

```typescript
interface GeminiClientConfig {
  apiKey: string
  model?: string              // Default: gemini-1.5-pro-latest
  maxOutputTokens?: number    // Default: 8192
  temperature?: number        // Default: 0.1 (deterministic)
  topK?: number               // Default: 40
  topP?: number               // Default: 0.95
}
```

**Example:**

```typescript
const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.1,
  maxOutputTokens: 8192
})
```

---

#### Methods

##### `analyzeVideo<T>(options: VideoAnalysisOptions): Promise<GeminiResponse<T>>`

Analyze video with Gemini Vision API.

**Parameters:**

```typescript
interface VideoAnalysisOptions {
  videoPath: string
  prompt: string
  mimeType?: string  // Default: auto-detect from file extension
}
```

**Returns:**

```typescript
interface GeminiResponse<T> {
  data: T
  rawText: string
  tokensUsed: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata: {
    modelUsed: string
    finishReason: string
    safetyRatings: any[]
    processingTime: number  // milliseconds
  }
}
```

**Example:**

```typescript
const response = await client.analyzeVideo<Hand>({
  videoPath: 'hand_clip.mp4',
  prompt: masterPrompt
})

console.log(`Hand: ${response.data.hand_id}`)
console.log(`Tokens used: ${response.tokensUsed.totalTokens}`)
console.log(`Processing time: ${response.metadata.processingTime}ms`)
```

---

##### `analyzeText<T>(prompt: string): Promise<GeminiResponse<T>>`

Analyze text prompt without video (for testing).

**Example:**

```typescript
const response = await client.analyzeText<Hand>(
  'Extract hand history from this text: ...'
)
```

---

##### `estimateCost(videoFileSizeMB: number, estimatedOutputTokens: number): number`

Estimate cost for video analysis based on Gemini 1.5 Pro pricing.

**Parameters:**
- `videoFileSizeMB` (number): Video file size in MB
- `estimatedOutputTokens` (number): Estimated output tokens

**Returns:** Estimated cost in USD

**Example:**

```typescript
const cost = client.estimateCost(50, 2000) // 50MB video, 2000 output tokens
console.log(`Estimated cost: $${cost.toFixed(2)}`)
```

---

### MasterPromptBuilder

Builds complete prompts by combining templates with layout metadata.

#### Constructor

```typescript
constructor(config?: MasterPromptBuilderConfig)
```

**Parameters:**

```typescript
interface MasterPromptBuilderConfig {
  layoutsDataPath?: string  // Default: data/layouts.json
  promptsDir?: string       // Default: prompts/
}
```

**Example:**

```typescript
const builder = new MasterPromptBuilder({
  promptsDir: './prompts',
  layoutsDataPath: './data/layouts.json'
})
```

---

#### Methods

##### `buildPrompt(options: BuildPromptOptions): Promise<MasterPrompt>`

Build complete prompt for a given layout.

**Parameters:**

```typescript
interface BuildPromptOptions {
  layout: LayoutType
  errorCorrections?: string               // Optional: Previous iteration errors
  customPlaceholders?: Record<string, string>  // Optional: Additional placeholders
}
```

**Returns:**

```typescript
interface MasterPrompt {
  layout: LayoutType
  prompt: string
  placeholders: string[]  // List of placeholders that were replaced
  confidence: number      // Recommended confidence threshold for this layout
  metadata: {
    templatePath: string
    layoutDataPath: string
    buildTime: number     // milliseconds
  }
}
```

**Example:**

```typescript
const masterPrompt = await builder.buildPrompt({
  layout: 'triton',
  errorCorrections: 'Previous errors: OCR misread player name "OSTASH" as "0STASH"'
})

console.log(`Prompt length: ${masterPrompt.prompt.length} chars`)
console.log(`Placeholders replaced: ${masterPrompt.placeholders.join(', ')}`)
console.log(`Recommended confidence: ${masterPrompt.confidence}`)
```

---

##### `preloadTemplates(): Promise<void>`

Preload all templates into cache (optimizes startup time).

**Example:**

```typescript
await builder.preloadTemplates()
```

---

##### `validateTemplates(): Promise<LayoutType[]>`

Validate that all required templates exist.

**Returns:** Array of missing template layouts

**Example:**

```typescript
const missing = await builder.validateTemplates()
if (missing.length > 0) {
  console.warn(`Missing templates: ${missing.join(', ')}`)
}
```

---

##### `getTemplatePlaceholders(layout: LayoutType): Promise<string[]>`

Get list of available placeholders in a template.

**Example:**

```typescript
const placeholders = await builder.getTemplatePlaceholders('triton')
console.log(`Available placeholders: ${placeholders.join(', ')}`)
// => ['LAYOUT_INFO', 'ERROR_CORRECTIONS']
```

---

### ErrorAnalyzer

Detects and analyzes errors in extracted hand histories.

#### Constructor

```typescript
constructor()
```

**Example:**

```typescript
const analyzer = new ErrorAnalyzer()
```

---

#### Methods

##### `analyzeHands(hands: Hand[]): Promise<ErrorReport>`

Analyze hands for errors.

**Returns:**

```typescript
interface ErrorReport {
  totalErrors: number
  errorsByType: Record<ErrorType, number>
  errorsByHand: Record<string, HandError[]>
  errorsBySeverity: Record<ErrorSeverity, number>
  averageConfidence: number
  recommendedActions: Recommendation[]
}
```

**Example:**

```typescript
const report = await analyzer.analyzeHands(hands)

console.log(`Total errors: ${report.totalErrors}`)
console.log(`Critical errors: ${report.errorsBySeverity.critical || 0}`)
console.log(`Average confidence: ${report.averageConfidence}`)

// Print recommendations
for (const rec of report.recommendedActions) {
  console.log(`- ${rec.action}: ${rec.reason}`)
}
```

---

### PromptOptimizer

Optimizes prompts based on previous iteration errors.

#### Constructor

```typescript
constructor()
```

**Example:**

```typescript
const optimizer = new PromptOptimizer()
```

---

#### Methods

##### `optimizePrompt(basePrompt: string, context: IterationContext): OptimizationResult`

Optimize prompt based on previous errors.

**Parameters:**

```typescript
interface IterationContext {
  iterationNumber: number
  previousErrors: HandError[]
  previousConfidence: number
  handId: string
}
```

**Returns:**

```typescript
interface OptimizationResult {
  optimizedPrompt: string
  confidenceThreshold: number
  focusAreas: string[]
}
```

**Example:**

```typescript
const optimized = optimizer.optimizePrompt(basePrompt, {
  iterationNumber: 2,
  previousErrors: errors,
  previousConfidence: 0.75,
  handId: 'hand_1'
})

console.log(`New confidence threshold: ${optimized.confidenceThreshold}`)
console.log(`Focus areas: ${optimized.focusAreas.join(', ')}`)
```

---

##### `getConfidenceThreshold(iterationNumber: number): number`

Get confidence threshold for a given iteration.

**Returns:**
- Iteration 1: 0.85
- Iteration 2: 0.90
- Iteration 3: 0.95

**Example:**

```typescript
const threshold = optimizer.getConfidenceThreshold(2)
console.log(`Threshold for iteration 2: ${threshold}`) // => 0.90
```

---

##### `shouldRetry(hand: Hand, errors: HandError[], iterationNumber: number): boolean`

Determine if a hand should be retried.

**Returns:** `true` if retry needed, `false` if hand is good enough

**Example:**

```typescript
const shouldRetry = optimizer.shouldRetry(hand, errors, 2)
if (shouldRetry) {
  console.log('Retrying hand due to low confidence or critical errors')
}
```

---

### TemplarIntegration

Integrates hand analysis results with Templar Archives PostgreSQL database.

#### Constructor

```typescript
constructor(supabase: SupabaseClient)
```

**Parameters:**
- `supabase` (SupabaseClient): Supabase client instance

**Example:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

const integration = new TemplarIntegration(supabase)
```

---

#### Methods

##### `integrateHands(hands: Hand[], options: IntegrationOptions): Promise<IntegrationResult>`

Integrate multiple hands into Templar Archives.

**Parameters:**

```typescript
interface IntegrationOptions {
  dayId: string              // UUID of the day (video) in Templar Archives
  skipDuplicates?: boolean   // If true, skip hands that already exist
  validateOnly?: boolean     // If true, only validate without inserting
}
```

**Returns:**

```typescript
interface IntegrationResult {
  success: boolean
  handsInserted: number
  handsFailed: number
  errors: IntegrationError[]
}
```

**Example:**

```typescript
const result = await integration.integrateHands(hands, {
  dayId: 'your-day-uuid',
  skipDuplicates: true
})

console.log(`Inserted: ${result.handsInserted}`)
console.log(`Failed: ${result.handsFailed}`)

if (!result.success) {
  for (const error of result.errors) {
    console.error(`Hand ${error.handId}: ${error.message}`)
  }
}
```

---

## Type Definitions

### Hand

```typescript
interface Hand {
  hand_id: string
  timestamp: number
  video_url?: string
  layout: string
  blinds: {
    sb_amount: number
    bb_amount: number
    ante?: number
  }
  players: Player[]
  actions: {
    preflop: Action[]
    flop?: Street
    turn?: Street
    river?: Street
  }
  result: {
    winner: string
    pot_final: number
    winning_hand?: string
  }
  confidence: number
  extraction_method: 'gemini_vision' | 'claude_vision'
}
```

### Player

```typescript
interface Player {
  name: string
  position: string
  stack_start: number
  stack_end: number
  hole_cards?: Card[]
}
```

### Action

```typescript
interface Action {
  player: string
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
}
```

### Street

```typescript
interface Street {
  pot_size_before: number
  cards: Card[]
  actions: Action[]
}
```

### Card

```typescript
type Card = string  // e.g., "As", "Kh", "Qd", "Jc"
```

### HandError

```typescript
interface HandError {
  type: ErrorType
  handId: string
  message: string
  severity: ErrorSeverity
  context?: any
}

type ErrorType =
  | 'duplicate_card'
  | 'invalid_card'
  | 'pot_inconsistency'
  | 'stack_mismatch'
  | 'invalid_action_order'
  | 'ocr_misread'
  | 'missing_player'
  | 'invalid_position'
  | 'ante_mismatch'
  | 'straddle_error'
  | 'other'

type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low'
```

### LayoutType

```typescript
type LayoutType = 'triton' | 'hustler' | 'wsop' | 'apt' | 'base'
```

---

## Error Handling

### Custom Errors

#### GeminiParseError

Thrown when JSON parsing fails.

```typescript
try {
  const response = await client.analyzeVideo(...)
} catch (error) {
  if (error instanceof GeminiParseError) {
    console.error('Failed to parse Gemini response:', error.message)
  }
}
```

#### GeminiAPIError

Thrown when Gemini API request fails.

```typescript
try {
  const response = await client.analyzeVideo(...)
} catch (error) {
  if (error instanceof GeminiAPIError) {
    console.error('Gemini API error:', error.message)
  }
}
```

### Validation Errors

`TemplarIntegration` throws validation errors:

```typescript
try {
  await integration.integrateHands(hands, { dayId: 'test' })
} catch (error) {
  console.error('Validation error:', error.message)
  // => "Hand must have at least one player"
  // => "Hand must have preflop actions"
}
```

---

## Advanced Usage

### Custom Error Corrections

```typescript
const analyzer = new HandAnalyzer(apiKey)

// First iteration
const hand1 = await analyzer.analyzeSingleHand(
  'video.mp4',
  '00:05:11',
  '00:06:45',
  'triton'
)

// Analyze errors
const errorAnalyzer = new ErrorAnalyzer()
const report = await errorAnalyzer.analyzeHands([hand1])

// Build optimized prompt
const builder = new MasterPromptBuilder()
const optimizer = new PromptOptimizer()

const optimized = optimizer.optimizePrompt(
  await builder.buildPrompt({ layout: 'triton' }).then(r => r.prompt),
  {
    iterationNumber: 2,
    previousErrors: report.errorsByHand[hand1.hand_id] || [],
    previousConfidence: hand1.confidence,
    handId: hand1.hand_id
  }
)

// Retry with optimized prompt
// ...
```

### Batch Processing

```typescript
const analyzer = new HandAnalyzer(apiKey)

const videos = [
  'video1.mp4',
  'video2.mp4',
  'video3.mp4'
]

const results = await Promise.all(
  videos.map(video => analyzer.analyzeVideo({
    videoPath: video,
    layout: 'triton',
    maxIterations: 3
  }))
)

const totalHands = results.reduce((sum, r) => sum + r.totalHands, 0)
console.log(`Processed ${totalHands} hands from ${videos.length} videos`)
```

### Progress Tracking

```typescript
const analyzer = new HandAnalyzer(apiKey)

// Note: Current version doesn't support progress callbacks
// This is a planned feature for v2.0

const result = await analyzer.analyzeVideo({
  videoUrl: 'https://youtube.com/watch?v=abc123',
  layout: 'triton',
  maxIterations: 3
})
```

### Cost Optimization

```typescript
const client = new GeminiClient({ apiKey })

// Estimate before processing
const videoSizeMB = 50
const estimatedOutputTokens = 2000
const cost = client.estimateCost(videoSizeMB, estimatedOutputTokens)

console.log(`Estimated cost: $${cost.toFixed(2)}`)

if (cost > 5.0) {
  console.warn('Video analysis will exceed $5, consider reducing video length')
}
```

### Template Validation

```typescript
const builder = new MasterPromptBuilder()

// Validate all templates exist
const missing = await builder.validateTemplates()

if (missing.length > 0) {
  console.error(`Missing templates for: ${missing.join(', ')}`)
  process.exit(1)
}

// Preload templates for faster performance
await builder.preloadTemplates()

console.log('All templates loaded and validated')
```

---

## Performance Tips

1. **Preload Templates**: Call `builder.preloadTemplates()` at startup to avoid repeated file I/O
2. **Batch Processing**: Process multiple videos in parallel with `Promise.all()`
3. **Skip Duplicates**: Use `skipDuplicates: true` when integrating hands to avoid database errors
4. **Optimize Iterations**: Set `maxIterations: 2` for faster processing if 97% accuracy is not critical
5. **Cache Results**: Store analyzed hands in memory or database to avoid re-processing

---

## Rate Limits

Gemini 1.5 Pro API rate limits (as of 2025-01):
- **Requests per minute**: 60 RPM
- **Tokens per minute**: 32,000 TPM

To avoid rate limits:
- Add delay between requests: `await new Promise(r => setTimeout(r, 1000))`
- Implement retry logic with exponential backoff
- Monitor `tokensUsed` in responses

---

## License

MIT License - see [LICENSE](../LICENSE) for details.
