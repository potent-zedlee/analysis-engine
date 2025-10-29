# Hand Analysis Engine - Usage Examples

Real-world usage examples for the Hand Analysis Engine.

---

## Table of Contents

- [Basic Usage](#basic-usage)
- [Advanced Analysis](#advanced-analysis)
- [Templar Archives Integration](#templar-archives-integration)
- [Error Handling](#error-handling)
- [Batch Processing](#batch-processing)
- [Cost Optimization](#cost-optimization)
- [Production Usage](#production-usage)

---

## Basic Usage

### Example 1: Analyze a YouTube Video

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

async function analyzeYouTubeVideo() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const result = await analyzer.analyzeVideo({
    videoUrl: 'https://youtube.com/watch?v=abc123',
    layout: 'triton',
    maxIterations: 3
  })

  console.log(`✅ Analysis complete!`)
  console.log(`Total hands: ${result.totalHands}`)
  console.log(`Successful: ${result.successfulHands} (${(result.successfulHands / result.totalHands * 100).toFixed(1)}%)`)
  console.log(`Avg confidence: ${result.averageConfidence.toFixed(2)}`)
  console.log(`Processing time: ${(result.processingTime / 1000).toFixed(1)}s`)

  // Print each hand
  for (const hand of result.hands) {
    console.log(`\nHand #${hand.hand_id}:`)
    console.log(`  Players: ${hand.players.map(p => p.name).join(', ')}`)
    console.log(`  Pot: $${hand.result.pot_final}`)
    console.log(`  Winner: ${hand.result.winner}`)
    console.log(`  Confidence: ${hand.confidence}`)
  }
}

analyzeYouTubeVideo()
```

**Output:**
```
✅ Analysis complete!
Total hands: 50
Successful: 48 (96.0%)
Avg confidence: 0.96
Processing time: 825.3s

Hand #hand_1:
  Players: OSTASH, CALONGE
  Pot: $14.8
  Winner: OSTASH
  Confidence: 0.97

Hand #hand_2:
  Players: OSTASH, CALONGE
  Pot: $22.5
  Winner: CALONGE
  Confidence: 0.95
...
```

---

### Example 2: Analyze a Local Video File

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'
import { promises as fs } from 'fs'
import path from 'path'

async function analyzeLocalVideo() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const videoPath = path.join(__dirname, 'videos', 'triton_cash_game.mp4')

  // Check if file exists
  await fs.access(videoPath)

  const result = await analyzer.analyzeVideo({
    videoPath,
    layout: 'triton',
    maxIterations: 3
  })

  console.log(`Analyzed ${videoPath}`)
  console.log(`Found ${result.totalHands} hands in ${(result.processingTime / 1000).toFixed(1)}s`)

  return result
}

analyzeLocalVideo()
```

---

### Example 3: Analyze a Single Hand (Testing)

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

async function analyzeSingleHand() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const hand = await analyzer.analyzeSingleHand(
    'triton_cash_game.mp4',
    '00:05:11',  // Start time
    '00:06:45',  // End time
    'triton'     // Layout
  )

  console.log(`Hand ID: ${hand.hand_id}`)
  console.log(`Confidence: ${hand.confidence}`)
  console.log(`Players: ${hand.players.length}`)
  console.log(`Actions: ${hand.actions.preflop.length} preflop`)

  if (hand.actions.flop) {
    console.log(`Flop: ${hand.actions.flop.cards.join(' ')}`)
  }

  console.log(`Winner: ${hand.result.winner} ($${hand.result.pot_final})`)

  return hand
}

analyzeSingleHand()
```

---

## Advanced Analysis

### Example 4: Custom Iteration Logic

```typescript
import { HandAnalyzer, ErrorAnalyzer, PromptOptimizer } from 'hand-analysis-engine'

async function analyzeWithCustomIteration() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)
  const errorAnalyzer = new ErrorAnalyzer()
  const optimizer = new PromptOptimizer()

  // First attempt
  let hand = await analyzer.analyzeSingleHand(
    'video.mp4',
    '00:05:11',
    '00:06:45',
    'triton'
  )

  console.log(`Iteration 1: Confidence ${hand.confidence}`)

  // Analyze errors
  const report = await errorAnalyzer.analyzeHands([hand])
  const errors = report.errorsByHand[hand.hand_id] || []

  console.log(`Found ${errors.length} errors`)

  // Check if retry needed
  let iteration = 1
  while (iteration < 3 && optimizer.shouldRetry(hand, errors, iteration)) {
    iteration++
    console.log(`Retrying (iteration ${iteration})...`)

    // Re-analyze with optimized prompt
    hand = await analyzer.analyzeSingleHand(
      'video.mp4',
      '00:05:11',
      '00:06:45',
      'triton'
    )

    console.log(`Iteration ${iteration}: Confidence ${hand.confidence}`)
  }

  console.log(`✅ Final confidence: ${hand.confidence} after ${iteration} iterations`)

  return hand
}

analyzeWithCustomIteration()
```

---

### Example 5: Get Detailed Error Report

```typescript
import { HandAnalyzer, ErrorAnalyzer } from 'hand-analysis-engine'

async function getDetailedErrorReport() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const result = await analyzer.analyzeVideo({
    videoPath: 'video.mp4',
    layout: 'triton',
    maxIterations: 1  // No retry for testing
  })

  // Analyze all hands
  const errorAnalyzer = new ErrorAnalyzer()
  const report = await errorAnalyzer.analyzeHands(result.hands)

  console.log(`\n📊 Error Report:`)
  console.log(`Total errors: ${report.totalErrors}`)
  console.log(`Average confidence: ${report.averageConfidence.toFixed(2)}`)

  console.log(`\nErrors by severity:`)
  console.log(`  Critical: ${report.errorsBySeverity.critical || 0}`)
  console.log(`  High: ${report.errorsBySeverity.high || 0}`)
  console.log(`  Medium: ${report.errorsBySeverity.medium || 0}`)
  console.log(`  Low: ${report.errorsBySeverity.low || 0}`)

  console.log(`\nErrors by type:`)
  for (const [type, count] of Object.entries(report.errorsByType)) {
    console.log(`  ${type}: ${count}`)
  }

  console.log(`\n💡 Recommendations:`)
  for (const rec of report.recommendedActions) {
    console.log(`  - ${rec.action}: ${rec.reason}`)
  }

  return report
}

getDetailedErrorReport()
```

**Output:**
```
📊 Error Report:
Total errors: 8
Average confidence: 0.89

Errors by severity:
  Critical: 1
  High: 2
  Medium: 3
  Low: 2

Errors by type:
  ocr_misread: 3
  pot_inconsistency: 2
  stack_mismatch: 2
  invalid_action_order: 1

💡 Recommendations:
  - Retry with higher confidence threshold: 3 critical/high errors detected
  - OCR optimization needed: 3 OCR misread errors
  - Validate pot calculations: 2 pot inconsistency errors
```

---

## Templar Archives Integration

### Example 6: Save to Templar Archives

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'
import { TemplarIntegration } from 'hand-analysis-engine/templar'
import { createClient } from '@supabase/supabase-js'

async function saveToTemplarArchives() {
  // 1. Analyze video
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const result = await analyzer.analyzeVideo({
    videoUrl: 'https://youtube.com/watch?v=abc123',
    layout: 'triton',
    maxIterations: 3
  })

  console.log(`✅ Analyzed ${result.totalHands} hands`)

  // 2. Connect to Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )

  // 3. Integrate with Templar Archives
  const integration = new TemplarIntegration(supabase)

  const integrationResult = await integration.integrateHands(result.hands, {
    dayId: 'your-day-uuid',  // Get this from Templar Archives
    skipDuplicates: true
  })

  console.log(`\n💾 Integration complete!`)
  console.log(`Inserted: ${integrationResult.handsInserted}`)
  console.log(`Failed: ${integrationResult.handsFailed}`)

  if (integrationResult.errors.length > 0) {
    console.log(`\n⚠️  Errors:`)
    for (const error of integrationResult.errors) {
      console.log(`  Hand ${error.handId}: ${error.message}`)
    }
  }

  return integrationResult
}

saveToTemplarArchives()
```

---

### Example 7: Validate Before Saving

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'
import { TemplarIntegration } from 'hand-analysis-engine/templar'
import { createClient } from '@supabase/supabase-js'

async function validateBeforeSaving() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const result = await analyzer.analyzeVideo({
    videoPath: 'video.mp4',
    layout: 'triton'
  })

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )

  const integration = new TemplarIntegration(supabase)

  // Validate only (no database insert)
  const validationResult = await integration.integrateHands(result.hands, {
    dayId: 'test-day-id',
    validateOnly: true
  })

  if (!validationResult.success) {
    console.error(`❌ Validation failed:`)
    for (const error of validationResult.errors) {
      console.error(`  Hand ${error.handId}: ${error.message}`)
    }
    return
  }

  console.log(`✅ All hands valid, proceeding with save...`)

  // Now save
  const saveResult = await integration.integrateHands(result.hands, {
    dayId: 'real-day-uuid',
    skipDuplicates: true
  })

  console.log(`💾 Saved ${saveResult.handsInserted} hands`)
}

validateBeforeSaving()
```

---

## Error Handling

### Example 8: Robust Error Handling

```typescript
import { HandAnalyzer, GeminiParseError, GeminiAPIError } from 'hand-analysis-engine'

async function robustAnalysis() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  try {
    const result = await analyzer.analyzeVideo({
      videoUrl: 'https://youtube.com/watch?v=abc123',
      layout: 'triton',
      maxIterations: 3
    })

    console.log(`✅ Success: ${result.totalHands} hands analyzed`)
    return result

  } catch (error) {
    if (error instanceof GeminiParseError) {
      console.error(`❌ Failed to parse Gemini response:`, error.message)
      // Log raw response for debugging
      console.error(`Raw response:`, error.message.split('Response text:')[1])

    } else if (error instanceof GeminiAPIError) {
      console.error(`❌ Gemini API error:`, error.message)
      // Check if rate limit
      if (error.message.includes('quota')) {
        console.log(`⏳ Waiting 60 seconds and retrying...`)
        await new Promise(resolve => setTimeout(resolve, 60000))
        return robustAnalysis() // Retry
      }

    } else if (error instanceof Error && error.message.includes('Video file not found')) {
      console.error(`❌ Video file not accessible:`, error.message)

    } else {
      console.error(`❌ Unknown error:`, error)
    }

    throw error
  }
}

robustAnalysis()
```

---

### Example 9: Retry with Exponential Backoff

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

async function analyzeWithRetry(
  videoPath: string,
  maxRetries = 3,
  initialDelay = 1000
) {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`)

      const result = await analyzer.analyzeVideo({
        videoPath,
        layout: 'triton',
        maxIterations: 3
      })

      console.log(`✅ Success on attempt ${attempt}`)
      return result

    } catch (error: any) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message)

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1)
        console.log(`⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        console.error(`❌ All ${maxRetries} attempts failed`)
        throw error
      }
    }
  }
}

analyzeWithRetry('video.mp4', 3, 1000)
```

---

## Batch Processing

### Example 10: Process Multiple Videos in Parallel

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'
import { promises as fs } from 'fs'
import path from 'path'

async function batchProcessVideos() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  // Get all video files from directory
  const videosDir = path.join(__dirname, 'videos')
  const files = await fs.readdir(videosDir)
  const videoFiles = files.filter(f => f.endsWith('.mp4'))

  console.log(`Found ${videoFiles.length} videos to process`)

  // Process in parallel (max 3 at a time to avoid rate limits)
  const chunkSize = 3
  const results = []

  for (let i = 0; i < videoFiles.length; i += chunkSize) {
    const chunk = videoFiles.slice(i, i + chunkSize)

    console.log(`\nProcessing batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(videoFiles.length / chunkSize)}...`)

    const chunkResults = await Promise.all(
      chunk.map(async (file) => {
        const videoPath = path.join(videosDir, file)

        try {
          const result = await analyzer.analyzeVideo({
            videoPath,
            layout: 'triton',
            maxIterations: 3
          })

          console.log(`  ✅ ${file}: ${result.totalHands} hands`)
          return { file, success: true, result }

        } catch (error: any) {
          console.error(`  ❌ ${file}: ${error.message}`)
          return { file, success: false, error: error.message }
        }
      })
    )

    results.push(...chunkResults)

    // Rate limit delay between batches
    if (i + chunkSize < videoFiles.length) {
      console.log(`⏳ Waiting 10 seconds before next batch...`)
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length
  const totalHands = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.result!.totalHands, 0)

  console.log(`\n📊 Batch Processing Complete:`)
  console.log(`  Videos processed: ${successful}/${videoFiles.length}`)
  console.log(`  Total hands: ${totalHands}`)

  return results
}

batchProcessVideos()
```

---

### Example 11: Process with Progress Tracking

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

async function processWithProgress(videos: string[]) {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  let completed = 0
  const results = []

  for (const video of videos) {
    console.log(`\n[${completed + 1}/${videos.length}] Processing ${video}...`)

    try {
      const result = await analyzer.analyzeVideo({
        videoPath: video,
        layout: 'triton',
        maxIterations: 3
      })

      completed++
      results.push({ video, success: true, result })

      console.log(`  ✅ Completed: ${result.totalHands} hands`)
      console.log(`  Progress: ${(completed / videos.length * 100).toFixed(1)}%`)

    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`)
      results.push({ video, success: false, error: error.message })
    }
  }

  return results
}

const videos = ['video1.mp4', 'video2.mp4', 'video3.mp4']
processWithProgress(videos)
```

---

## Cost Optimization

### Example 12: Estimate Costs Before Processing

```typescript
import { GeminiClient } from 'hand-analysis-engine'
import { promises as fs } from 'fs'

async function estimateCosts(videoPath: string) {
  const client = new GeminiClient({ apiKey: process.env.GEMINI_API_KEY! })

  // Get video file size
  const stats = await fs.stat(videoPath)
  const videoSizeMB = stats.size / (1024 * 1024)

  // Estimate output tokens (conservative estimate)
  const estimatedHands = 50
  const tokensPerHand = 200
  const estimatedOutputTokens = estimatedHands * tokensPerHand

  // Calculate cost
  const cost = client.estimateCost(videoSizeMB, estimatedOutputTokens)

  console.log(`📊 Cost Estimate for ${videoPath}:`)
  console.log(`  Video size: ${videoSizeMB.toFixed(1)} MB`)
  console.log(`  Estimated hands: ${estimatedHands}`)
  console.log(`  Estimated output tokens: ${estimatedOutputTokens}`)
  console.log(`  Estimated cost: $${cost.toFixed(2)}`)

  if (cost > 5.0) {
    console.log(`  ⚠️  Warning: Cost exceeds $5.00`)
  }

  return cost
}

estimateCosts('triton_cash_game.mp4')
```

**Output:**
```
📊 Cost Estimate for triton_cash_game.mp4:
  Video size: 250.5 MB
  Estimated hands: 50
  Estimated output tokens: 10000
  Estimated cost: $4.73
```

---

### Example 13: Optimize by Reducing Iterations

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'

async function optimizeByIterations() {
  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  // Scenario 1: High accuracy (3 iterations)
  const highAccuracy = await analyzer.analyzeVideo({
    videoPath: 'video.mp4',
    layout: 'triton',
    maxIterations: 3  // 97% accuracy, higher cost
  })

  console.log(`High accuracy mode:`)
  console.log(`  Confidence: ${highAccuracy.averageConfidence.toFixed(2)}`)
  console.log(`  Iterations: ${highAccuracy.totalIterations}`)

  // Scenario 2: Balanced (2 iterations)
  const balanced = await analyzer.analyzeVideo({
    videoPath: 'video.mp4',
    layout: 'triton',
    maxIterations: 2  // 94% accuracy, medium cost
  })

  console.log(`\nBalanced mode:`)
  console.log(`  Confidence: ${balanced.averageConfidence.toFixed(2)}`)
  console.log(`  Iterations: ${balanced.totalIterations}`)

  // Scenario 3: Fast (1 iteration)
  const fast = await analyzer.analyzeVideo({
    videoPath: 'video.mp4',
    layout: 'triton',
    maxIterations: 1  // 87% accuracy, lowest cost
  })

  console.log(`\nFast mode:`)
  console.log(`  Confidence: ${fast.averageConfidence.toFixed(2)}`)
  console.log(`  Iterations: ${fast.totalIterations}`)
}

optimizeByIterations()
```

---

## Production Usage

### Example 14: Production-Ready Pipeline

```typescript
import { HandAnalyzer, ErrorAnalyzer } from 'hand-analysis-engine'
import { TemplarIntegration } from 'hand-analysis-engine/templar'
import { createClient } from '@supabase/supabase-js'
import winston from 'winston'

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

async function productionPipeline(videoUrl: string, dayId: string) {
  const startTime = Date.now()

  try {
    logger.info(`Starting analysis for ${videoUrl}`)

    // 1. Analyze video
    const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

    const analysisResult = await analyzer.analyzeVideo({
      videoUrl,
      layout: 'triton',
      maxIterations: 3
    })

    logger.info(`Analysis complete: ${analysisResult.totalHands} hands`)

    // 2. Error analysis
    const errorAnalyzer = new ErrorAnalyzer()
    const errorReport = await errorAnalyzer.analyzeHands(analysisResult.hands)

    if (errorReport.errorsBySeverity.critical > 0) {
      logger.error(`Critical errors detected: ${errorReport.errorsBySeverity.critical}`)
      throw new Error('Critical errors in hand analysis')
    }

    logger.info(`Error check passed: ${errorReport.totalErrors} non-critical errors`)

    // 3. Database integration
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    )

    const integration = new TemplarIntegration(supabase)

    // Validate first
    const validationResult = await integration.integrateHands(analysisResult.hands, {
      dayId,
      validateOnly: true
    })

    if (!validationResult.success) {
      logger.error(`Validation failed: ${validationResult.handsFailed} hands`)
      throw new Error('Hand validation failed')
    }

    // Save to database
    const integrationResult = await integration.integrateHands(analysisResult.hands, {
      dayId,
      skipDuplicates: true
    })

    logger.info(`Database integration complete: ${integrationResult.handsInserted} hands inserted`)

    // 4. Final summary
    const duration = Date.now() - startTime

    const summary = {
      videoUrl,
      dayId,
      totalHands: analysisResult.totalHands,
      successfulHands: analysisResult.successfulHands,
      averageConfidence: analysisResult.averageConfidence,
      totalIterations: analysisResult.totalIterations,
      handsInserted: integrationResult.handsInserted,
      processingTime: duration,
      errors: {
        total: errorReport.totalErrors,
        critical: errorReport.errorsBySeverity.critical || 0,
        high: errorReport.errorsBySeverity.high || 0
      }
    }

    logger.info('Pipeline complete', summary)
    return summary

  } catch (error: any) {
    logger.error(`Pipeline failed: ${error.message}`, { error })
    throw error
  }
}

// Usage
productionPipeline(
  'https://youtube.com/watch?v=abc123',
  'day-uuid-from-templar-archives'
)
```

---

### Example 15: Queue-Based Processing

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'
import Bull from 'bull'
import Redis from 'ioredis'

// Setup Bull queue
const redis = new Redis(process.env.REDIS_URL)
const queue = new Bull('video-analysis', { redis })

// Job processor
queue.process(async (job) => {
  const { videoUrl, layout, dayId } = job.data

  job.progress(0)

  const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

  const result = await analyzer.analyzeVideo({
    videoUrl,
    layout,
    maxIterations: 3
  })

  job.progress(100)

  return {
    totalHands: result.totalHands,
    successfulHands: result.successfulHands,
    averageConfidence: result.averageConfidence
  }
})

// Add job to queue
async function enqueueVideo(videoUrl: string, layout: string, dayId: string) {
  const job = await queue.add({
    videoUrl,
    layout,
    dayId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })

  console.log(`Job ${job.id} added to queue`)

  // Listen to job events
  job.on('progress', (progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`)
  })

  job.on('completed', (result) => {
    console.log(`Job ${job.id} completed:`, result)
  })

  job.on('failed', (error) => {
    console.error(`Job ${job.id} failed:`, error.message)
  })

  return job
}

// Usage
enqueueVideo(
  'https://youtube.com/watch?v=abc123',
  'triton',
  'day-uuid'
)
```

---

## Testing

### Example 16: Integration Test

```typescript
import { HandAnalyzer } from 'hand-analysis-engine'
import { describe, it, expect } from 'vitest'

describe('Hand Analysis Integration', () => {
  it('should analyze a sample video', async () => {
    const analyzer = new HandAnalyzer(process.env.GEMINI_API_KEY!)

    const result = await analyzer.analyzeVideo({
      videoPath: 'tests/fixtures/sample_triton_hand.mp4',
      layout: 'triton',
      maxIterations: 3
    })

    expect(result.totalHands).toBeGreaterThan(0)
    expect(result.averageConfidence).toBeGreaterThan(0.85)
    expect(result.hands[0]).toHaveProperty('hand_id')
    expect(result.hands[0]).toHaveProperty('players')
    expect(result.hands[0]).toHaveProperty('actions')
  }, 60000) // 60 second timeout
})
```

---

## Summary

These examples cover:

✅ **Basic Usage**: YouTube & local video analysis
✅ **Advanced**: Custom iteration, error reports
✅ **Integration**: Templar Archives integration
✅ **Error Handling**: Robust retry logic, exponential backoff
✅ **Batch Processing**: Parallel processing, progress tracking
✅ **Cost Optimization**: Estimation, iteration tuning
✅ **Production**: Logging, validation, queue-based processing

For more details, see [API.md](./API.md) for complete API reference.
