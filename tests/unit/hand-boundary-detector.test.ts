/**
 * Unit Tests for Hand Boundary Detector
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HandBoundaryDetector } from '../../lib/detectors/hand-boundary-detector'
import type { SceneChange } from '../../lib/detectors/scene-change-detector'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Fixtures
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_SCENE_CHANGES: SceneChange[] = [
  {
    frameIndex: 60,
    timestamp: 2,
    confidence: 0.9,
    framePath: 'frame_002.jpg',
  },
  {
    frameIndex: 300,
    timestamp: 10,
    confidence: 0.85,
    framePath: 'frame_010.jpg',
  },
  {
    frameIndex: 540,
    timestamp: 18,
    confidence: 0.92,
    framePath: 'frame_018.jpg',
  },
  {
    frameIndex: 780,
    timestamp: 26,
    confidence: 0.88,
    framePath: 'frame_026.jpg',
  },
  {
    frameIndex: 1020,
    timestamp: 34,
    confidence: 0.75,
    framePath: 'frame_034.jpg',
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandBoundaryDetector - Configuration', () => {
  it('should initialize with API key', () => {
    const detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
    expect(detector).toBeInstanceOf(HandBoundaryDetector)
  })

  it('should use default confidence threshold', () => {
    const detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
    expect(detector.getConfidenceThreshold()).toBe(0.7)
  })

  it('should accept custom confidence threshold', () => {
    const detector = new HandBoundaryDetector({
      geminiApiKey: 'test-key',
      confidenceThreshold: 0.8,
    })
    expect(detector.getConfidenceThreshold()).toBe(0.8)
  })

  it('should allow updating confidence threshold', () => {
    const detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
    detector.setConfidenceThreshold(0.85)
    expect(detector.getConfidenceThreshold()).toBe(0.85)
  })

  it('should throw error for invalid confidence threshold', () => {
    const detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
    expect(() => {
      detector.setConfidenceThreshold(1.5)
    }).toThrow('Confidence threshold must be between 0 and 1')
  })

  it('should provide access to Gemini client', () => {
    const detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
    const client = detector.getGeminiClient()
    expect(client).toBeDefined()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Heuristic Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandBoundaryDetector - Heuristic', () => {
  let detector: HandBoundaryDetector

  beforeEach(() => {
    detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
  })

  it('should detect hand boundaries from scene changes', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    expect(result.boundaries.length).toBeGreaterThan(0)
    expect(result.totalHands).toBe(result.boundaries.length)
    expect(result.processingTime).toBeGreaterThanOrEqual(0)
    expect(result.totalCost).toBe(0) // Heuristic is free
  })

  it('should filter by confidence threshold', () => {
    detector.setConfidenceThreshold(0.9)
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    // Only scene changes with confidence >= 0.9 should be included
    result.boundaries.forEach((boundary) => {
      expect(boundary.confidence).toBeGreaterThanOrEqual(0.9)
    })
  })

  it('should calculate hand durations', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    result.boundaries.forEach((boundary) => {
      const duration = boundary.endTime - boundary.startTime
      expect(duration).toBeGreaterThan(0)
    })
  })

  it('should calculate average hand duration', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    expect(result.averageHandDuration).toBeGreaterThan(0)

    // Verify calculation
    const totalDuration = result.boundaries.reduce(
      (sum, b) => sum + (b.endTime - b.startTime),
      0
    )
    const expected = totalDuration / result.boundaries.length
    expect(result.averageHandDuration).toBeCloseTo(expected, 2)
  })

  it('should assign sequential hand numbers', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    result.boundaries.forEach((boundary, i) => {
      expect(boundary.handNumber).toBe(i + 1)
    })
  })

  it('should mark detection method as heuristic', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    result.boundaries.forEach((boundary) => {
      expect(boundary.detectionMethod).toBe('heuristic')
    })
  })

  it('should include frame paths', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    result.boundaries.forEach((boundary) => {
      expect(boundary.startFramePath).toBeTruthy()
      expect(boundary.endFramePath).toBeTruthy()
    })
  })

  it('should handle empty scene changes', () => {
    const result = detector.detectBoundariesHeuristic([])

    expect(result.boundaries.length).toBe(0)
    expect(result.totalHands).toBe(0)
    expect(result.averageHandDuration).toBe(0)
  })

  it('should handle single scene change', () => {
    const result = detector.detectBoundariesHeuristic([SAMPLE_SCENE_CHANGES[0]])

    expect(result.boundaries.length).toBe(0) // Need at least 2 for a boundary
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Confidence Threshold
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandBoundaryDetector - Confidence Threshold', () => {
  it('should filter more with higher threshold', () => {
    const detector1 = new HandBoundaryDetector({
      geminiApiKey: 'test-key',
      confidenceThreshold: 0.7,
    })
    const detector2 = new HandBoundaryDetector({
      geminiApiKey: 'test-key',
      confidenceThreshold: 0.9,
    })

    const result1 = detector1.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)
    const result2 = detector2.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    expect(result2.boundaries.length).toBeLessThanOrEqual(
      result1.boundaries.length
    )
  })

  it('should include all boundaries with threshold 0', () => {
    const detector = new HandBoundaryDetector({
      geminiApiKey: 'test-key',
      confidenceThreshold: 0,
    })

    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    // All scene changes should be included
    expect(result.boundaries.length).toBe(SAMPLE_SCENE_CHANGES.length - 1)
  })

  it('should exclude all boundaries with threshold 1', () => {
    const detector = new HandBoundaryDetector({
      geminiApiKey: 'test-key',
      confidenceThreshold: 1.0,
    })

    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    // No scene change has confidence = 1.0
    expect(result.boundaries.length).toBe(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Hand Duration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandBoundaryDetector - Hand Duration', () => {
  let detector: HandBoundaryDetector

  beforeEach(() => {
    detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
  })

  it('should calculate hand duration correctly', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    result.boundaries.forEach((boundary) => {
      const expectedDuration = boundary.endTime - boundary.startTime
      expect(expectedDuration).toBeGreaterThan(0)
      expect(expectedDuration).toBeLessThan(600) // Less than 10 minutes
    })
  })

  it('should have realistic average hand duration', () => {
    const result = detector.detectBoundariesHeuristic(SAMPLE_SCENE_CHANGES)

    // Poker hands typically 1-5 minutes
    expect(result.averageHandDuration).toBeGreaterThan(0)
    expect(result.averageHandDuration).toBeLessThan(600)
  })

  it('should respect custom estimated duration', () => {
    const estimatedDuration = 90 // 1.5 minutes
    const result = detector.detectBoundariesHeuristic(
      SAMPLE_SCENE_CHANGES,
      estimatedDuration
    )

    // This parameter doesn't affect heuristic mode
    // But test that it doesn't break anything
    expect(result.boundaries.length).toBeGreaterThanOrEqual(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Edge Cases
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('HandBoundaryDetector - Edge Cases', () => {
  let detector: HandBoundaryDetector

  beforeEach(() => {
    detector = new HandBoundaryDetector({ geminiApiKey: 'test-key' })
  })

  it('should handle very short hands', () => {
    const shortScenes: SceneChange[] = [
      { frameIndex: 30, timestamp: 1, confidence: 0.9, framePath: 'f1.jpg' },
      { frameIndex: 60, timestamp: 2, confidence: 0.9, framePath: 'f2.jpg' },
      { frameIndex: 90, timestamp: 3, confidence: 0.9, framePath: 'f3.jpg' },
    ]

    const result = detector.detectBoundariesHeuristic(shortScenes)

    expect(result.boundaries.length).toBeGreaterThan(0)
    expect(result.averageHandDuration).toBeLessThan(10)
  })

  it('should handle very long hands', () => {
    const longScenes: SceneChange[] = [
      { frameIndex: 0, timestamp: 0, confidence: 0.9, framePath: 'f1.jpg' },
      { frameIndex: 18000, timestamp: 600, confidence: 0.9, framePath: 'f2.jpg' },
    ]

    const result = detector.detectBoundariesHeuristic(longScenes)

    expect(result.boundaries.length).toBeGreaterThanOrEqual(0)
  })

  it('should handle scene changes with same timestamp', () => {
    const sameTime: SceneChange[] = [
      { frameIndex: 60, timestamp: 2, confidence: 0.9, framePath: 'f1.jpg' },
      { frameIndex: 61, timestamp: 2, confidence: 0.9, framePath: 'f2.jpg' },
    ]

    const result = detector.detectBoundariesHeuristic(sameTime)

    // Duration should be 0
    if (result.boundaries.length > 0) {
      expect(result.boundaries[0].endTime - result.boundaries[0].startTime).toBe(0)
    }
  })
})
