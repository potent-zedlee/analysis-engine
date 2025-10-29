/**
 * Integration Tests for Full Pipeline
 *
 * These tests require actual video files in fixtures/videos/
 * They test the complete flow from video input to hand boundaries detection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { YouTubeAPIClient } from '../../lib/youtube-api'
import { LayoutDetector } from '../../lib/detectors/layout-detector'
import { FrameExtractor } from '../../lib/detectors/frame-extractor'
import { SceneChangeDetector } from '../../lib/detectors/scene-change-detector'
import { HandBoundaryDetector } from '../../lib/detectors/hand-boundary-detector'
import { MasterPromptBuilder } from '../../lib/master-prompt-builder'
import path from 'path'
import { promises as fs } from 'fs'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TEST_VIDEO_PATH = path.join(process.cwd(), 'fixtures/videos/test-video.mp4')
const TEST_FRAMES_DIR = path.join(process.cwd(), 'fixtures/frames')
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'test-key'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key'

// Skip tests if no API keys are provided
const shouldSkip = !process.env.YOUTUBE_API_KEY || !process.env.GEMINI_API_KEY
const describeOrSkip = shouldSkip ? describe.skip : describe

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Full Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describeOrSkip('Integration - Full Pipeline', () => {
  let youtubeClient: YouTubeAPIClient
  let layoutDetector: LayoutDetector
  let frameExtractor: FrameExtractor
  let sceneChangeDetector: SceneChangeDetector
  let handBoundaryDetector: HandBoundaryDetector
  let promptBuilder: MasterPromptBuilder

  beforeAll(() => {
    youtubeClient = new YouTubeAPIClient({ apiKey: YOUTUBE_API_KEY })
    layoutDetector = new LayoutDetector(youtubeClient)
    frameExtractor = new FrameExtractor({ outputDir: TEST_FRAMES_DIR })
    sceneChangeDetector = new SceneChangeDetector()
    handBoundaryDetector = new HandBoundaryDetector({ geminiApiKey: GEMINI_API_KEY })
    promptBuilder = new MasterPromptBuilder()
  })

  afterAll(async () => {
    // Cleanup test frames
    try {
      await frameExtractor.cleanup()
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it('should detect layout from YouTube URL', async () => {
    // This test requires a real YouTube URL
    const testUrl = 'https://youtube.com/watch?v=triton12345'

    // Skip if video file doesn't exist
    try {
      await fs.access(TEST_VIDEO_PATH)
    } catch {
      console.log('⚠️  Test video not found, skipping integration test')
      return
    }

    const result = await layoutDetector.detectLayout(testUrl)

    expect(result.layout).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.metadata).toBeDefined()
  })

  it('should extract frames from video', async () => {
    // Skip if video file doesn't exist
    try {
      await fs.access(TEST_VIDEO_PATH)
    } catch {
      console.log('⚠️  Test video not found, skipping integration test')
      return
    }

    const result = await frameExtractor.extractFramesByInterval(TEST_VIDEO_PATH, 10)

    expect(result.frames.length).toBeGreaterThan(0)
    expect(result.totalFrames).toBe(result.frames.length)

    // Verify frames were actually created
    for (const frame of result.frames) {
      await expect(fs.access(frame.framePath)).resolves.not.toThrow()
    }
  })

  it('should detect scene changes from frames', async () => {
    // Skip if frames directory doesn't exist
    try {
      await fs.access(TEST_FRAMES_DIR)
    } catch {
      console.log('⚠️  Test frames not found, skipping integration test')
      return
    }

    const result = await sceneChangeDetector.detectFromFrames(TEST_FRAMES_DIR, 30)

    expect(result.sceneChanges.length).toBeGreaterThan(0)
    expect(result.totalScenes).toBeGreaterThan(0)
  })

  it('should build master prompt for detected layout', async () => {
    const prompt = await promptBuilder.buildPrompt({
      layout: 'triton',
      videoUrl: 'https://youtube.com/watch?v=triton12345',
    })

    expect(prompt.prompt).toBeTruthy()
    expect(prompt.prompt.length).toBeGreaterThan(500)
    expect(prompt.confidence).toBeGreaterThan(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Component Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describeOrSkip('Integration - Component Workflow', () => {
  it('should work with heuristic hand boundary detection', async () => {
    // This test doesn't require Gemini API
    const sceneChangeDetector = new SceneChangeDetector()
    const handBoundaryDetector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })

    // Simulate a 10-minute video
    const sceneChanges = sceneChangeDetector.simulateSceneChanges(600)

    expect(sceneChanges.sceneChanges.length).toBeGreaterThan(0)

    // Use heuristic detection (free, no API calls)
    const boundaries = handBoundaryDetector.detectBoundariesHeuristic(sceneChanges.sceneChanges)

    expect(boundaries.boundaries.length).toBeGreaterThan(0)
    expect(boundaries.totalCost).toBe(0)
  })

  it('should handle video metadata extraction', async () => {
    // Skip if video file doesn't exist
    try {
      await fs.access(TEST_VIDEO_PATH)
    } catch {
      console.log('⚠️  Test video not found, skipping integration test')
      return
    }

    const frameExtractor = new FrameExtractor()
    const metadata = await frameExtractor.getVideoMetadata(TEST_VIDEO_PATH)

    expect(metadata.duration).toBeGreaterThan(0)
    expect(metadata.width).toBeGreaterThan(0)
    expect(metadata.height).toBeGreaterThan(0)
    expect(metadata.fps).toBeGreaterThan(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Performance Benchmarks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describeOrSkip('Integration - Performance', () => {
  it('should process 1-minute video in reasonable time', async () => {
    // Skip if video file doesn't exist
    try {
      await fs.access(TEST_VIDEO_PATH)
    } catch {
      console.log('⚠️  Test video not found, skipping integration test')
      return
    }

    const startTime = Date.now()

    const frameExtractor = new FrameExtractor({ outputDir: TEST_FRAMES_DIR })
    await frameExtractor.extractFramesByInterval(TEST_VIDEO_PATH, 2)

    const processingTime = Date.now() - startTime

    // Should process in less than 30 seconds
    expect(processingTime).toBeLessThan(30000)
  })

  it('should handle multiple concurrent frame extractions', async () => {
    // Skip if video file doesn't exist
    try {
      await fs.access(TEST_VIDEO_PATH)
    } catch {
      console.log('⚠️  Test video not found, skipping integration test')
      return
    }

    const frameExtractor = new FrameExtractor({ outputDir: TEST_FRAMES_DIR })

    // Extract frames at different timestamps concurrently
    const promises = [
      frameExtractor.extractFramesAtTimestamps(TEST_VIDEO_PATH, [0, 1, 2]),
      frameExtractor.extractFramesAtTimestamps(TEST_VIDEO_PATH, [3, 4, 5]),
      frameExtractor.extractFramesAtTimestamps(TEST_VIDEO_PATH, [6, 7, 8]),
    ]

    const results = await Promise.all(promises)

    expect(results[0].length).toBe(3)
    expect(results[1].length).toBe(3)
    expect(results[2].length).toBe(3)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Error Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Integration - Error Handling', () => {
  it('should handle missing video file gracefully', async () => {
    const frameExtractor = new FrameExtractor()

    await expect(
      frameExtractor.extractFramesByInterval('non-existent.mp4', 10)
    ).rejects.toThrow('Video file not found')
  })

  it('should handle invalid YouTube URL', async () => {
    // Only run this test if API key is provided
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('⚠️  YOUTUBE_API_KEY not set, skipping test')
      return
    }

    const youtubeClient = new YouTubeAPIClient({ apiKey: process.env.YOUTUBE_API_KEY })
    const layoutDetector = new LayoutDetector(youtubeClient)

    await expect(
      layoutDetector.detectLayout('not-a-url')
    ).rejects.toThrow()
  })

  it('should handle network errors', async () => {
    // Only run this test if API key is provided
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('⚠️  YOUTUBE_API_KEY not set, skipping test')
      return
    }

    const youtubeClient = new YouTubeAPIClient({
      apiKey: 'invalid-api-key-for-testing',
      timeout: 1000
    })
    const layoutDetector = new LayoutDetector(youtubeClient)

    await expect(
      layoutDetector.detectLayout('https://youtube.com/watch?v=test123test')
    ).rejects.toThrow()
  })
})
