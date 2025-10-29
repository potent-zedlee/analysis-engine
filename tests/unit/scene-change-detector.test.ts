/**
 * Unit Tests for Scene Change Detector
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SceneChangeDetector } from '../../lib/detectors/scene-change-detector'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SceneChangeDetector - Configuration', () => {
  it('should initialize with default settings', () => {
    const detector = new SceneChangeDetector()
    const config = detector.getConfig()

    expect(config.threshold).toBe(0.3)
    expect(config.minSceneDuration).toBe(5)
    expect(config.checkInterval).toBe(2)
  })

  it('should accept custom threshold', () => {
    const detector = new SceneChangeDetector({ threshold: 0.5 })
    expect(detector.getConfig().threshold).toBe(0.5)
  })

  it('should accept custom minSceneDuration', () => {
    const detector = new SceneChangeDetector({ minSceneDuration: 10 })
    expect(detector.getConfig().minSceneDuration).toBe(10)
  })

  it('should accept custom checkInterval', () => {
    const detector = new SceneChangeDetector({ checkInterval: 3 })
    expect(detector.getConfig().checkInterval).toBe(3)
  })

  it('should update configuration', () => {
    const detector = new SceneChangeDetector()
    detector.updateConfig({ threshold: 0.4 })
    expect(detector.getConfig().threshold).toBe(0.4)
  })

  it('should throw error for invalid threshold', () => {
    const detector = new SceneChangeDetector()
    expect(() => {
      detector.updateConfig({ threshold: 1.5 })
    }).toThrow('Threshold must be between 0 and 1')
  })

  it('should throw error for negative minSceneDuration', () => {
    const detector = new SceneChangeDetector()
    expect(() => {
      detector.updateConfig({ minSceneDuration: -1 })
    }).toThrow('minSceneDuration must be >= 0')
  })

  it('should throw error for non-positive checkInterval', () => {
    const detector = new SceneChangeDetector()
    expect(() => {
      detector.updateConfig({ checkInterval: 0 })
    }).toThrow('checkInterval must be > 0')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Simulated Scene Change Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SceneChangeDetector - Simulation', () => {
  let detector: SceneChangeDetector

  beforeEach(() => {
    detector = new SceneChangeDetector()
  })

  it('should simulate scene changes for short video', () => {
    const result = detector.simulateSceneChanges(60) // 1 minute

    expect(result.sceneChanges.length).toBeGreaterThan(0)
    expect(result.totalFrames).toBe(1800) // 60 * 30 fps
    expect(result.totalScenes).toBeGreaterThan(0)
    expect(result.processingTime).toBeGreaterThanOrEqual(0)
  })

  it('should simulate scene changes for medium video', () => {
    const result = detector.simulateSceneChanges(600) // 10 minutes

    expect(result.sceneChanges.length).toBeGreaterThan(20)
    expect(result.totalFrames).toBe(18000) // 600 * 30 fps
  })

  it('should respect checkInterval', () => {
    const detector = new SceneChangeDetector({ checkInterval: 5 })
    const result = detector.simulateSceneChanges(100)

    // Scene changes should occur every 5 seconds
    const intervals = []
    for (let i = 1; i < result.sceneChanges.length; i++) {
      const interval =
        result.sceneChanges[i].timestamp - result.sceneChanges[i - 1].timestamp
      intervals.push(interval)
    }

    // All intervals should be approximately checkInterval
    intervals.forEach((interval) => {
      expect(interval).toBeCloseTo(5, 0)
    })
  })

  it('should generate confidence scores', () => {
    const result = detector.simulateSceneChanges(60)

    result.sceneChanges.forEach((change) => {
      expect(change.confidence).toBeGreaterThanOrEqual(0.7)
      expect(change.confidence).toBeLessThanOrEqual(1.0)
    })
  })

  it('should generate frame paths', () => {
    const result = detector.simulateSceneChanges(60)

    result.sceneChanges.forEach((change) => {
      expect(change.framePath).toContain('frame_')
      expect(change.framePath).toContain('.jpg')
    })
  })

  it('should calculate frame indices', () => {
    const result = detector.simulateSceneChanges(60)

    result.sceneChanges.forEach((change, i) => {
      // Frame index should be approximately timestamp * fps
      const expectedIndex = Math.floor(change.timestamp * 30)
      expect(change.frameIndex).toBeCloseTo(expectedIndex, 0)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Scene Duration Filtering
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SceneChangeDetector - Duration Filtering', () => {
  it('should filter out short scenes', () => {
    const detector = new SceneChangeDetector({
      checkInterval: 1, // Check every second
      minSceneDuration: 5, // Minimum 5 seconds
    })

    const result = detector.simulateSceneChanges(60)

    // Verify that all scene durations are >= minSceneDuration
    for (let i = 1; i < result.sceneChanges.length; i++) {
      const duration =
        result.sceneChanges[i].timestamp - result.sceneChanges[i - 1].timestamp
      expect(duration).toBeGreaterThanOrEqual(5)
    }
  })

  it('should allow short scenes when minSceneDuration is 0', () => {
    const detector = new SceneChangeDetector({
      checkInterval: 1,
      minSceneDuration: 0,
    })

    const result = detector.simulateSceneChanges(60)

    // Should have many scene changes (every second)
    expect(result.sceneChanges.length).toBeGreaterThan(50)
  })

  it('should reduce total scenes with longer minSceneDuration', () => {
    const detector1 = new SceneChangeDetector({ minSceneDuration: 2 })
    const detector2 = new SceneChangeDetector({ minSceneDuration: 10 })

    const result1 = detector1.simulateSceneChanges(120)
    const result2 = detector2.simulateSceneChanges(120)

    expect(result2.totalScenes).toBeLessThan(result1.totalScenes)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Edge Cases
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SceneChangeDetector - Edge Cases', () => {
  let detector: SceneChangeDetector

  beforeEach(() => {
    detector = new SceneChangeDetector()
  })

  it('should handle very short video', () => {
    const result = detector.simulateSceneChanges(1)

    expect(result.sceneChanges.length).toBe(0)
    expect(result.totalScenes).toBe(1) // Only one scene
  })

  it('should handle very long video', () => {
    const result = detector.simulateSceneChanges(3600) // 1 hour

    expect(result.sceneChanges.length).toBeGreaterThan(100)
    expect(result.processingTime).toBeLessThan(1000) // Should be fast
  })

  it('should handle zero duration', () => {
    const result = detector.simulateSceneChanges(0)

    expect(result.sceneChanges.length).toBe(0)
    expect(result.totalFrames).toBe(0)
  })
})
