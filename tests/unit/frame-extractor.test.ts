/**
 * Unit Tests for Frame Extractor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FrameExtractor } from '../../lib/detectors/frame-extractor'
import { promises as fs } from 'fs'

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = vi.fn((videoPath: string) => {
    const command = {
      seekInput: vi.fn().mockReturnThis(),
      frames: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      outputOptions: vi.fn().mockReturnThis(),
      size: vi.fn().mockReturnThis(),
      on: vi.fn(function (event: string, callback: any) {
        if (event === 'end') {
          // Simulate successful extraction
          setTimeout(callback, 10)
        }
        return this
      }),
      run: vi.fn(),
    }
    return command
  })

  // Mock ffprobe
  mockFfmpeg.ffprobe = vi.fn((videoPath: string, callback: any) => {
    callback(null, {
      format: {
        duration: 600,
        bit_rate: 5000000,
      },
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          r_frame_rate: '30/1',
        },
      ],
    })
  })

  return { default: mockFfmpeg }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('FrameExtractor - Configuration', () => {
  it('should initialize with default settings', () => {
    const extractor = new FrameExtractor()
    const config = extractor.getConfig()

    expect(config.outputDir).toBe('./frames')
    expect(config.frameFormat).toBe('jpg')
    expect(config.quality).toBe(2)
    expect(config.resolution).toBe('')
  })

  it('should accept custom output directory', () => {
    const extractor = new FrameExtractor({ outputDir: './custom-frames' })
    expect(extractor.getConfig().outputDir).toBe('./custom-frames')
  })

  it('should accept custom frame format', () => {
    const extractor = new FrameExtractor({ frameFormat: 'png' })
    expect(extractor.getConfig().frameFormat).toBe('png')
  })

  it('should accept custom quality', () => {
    const extractor = new FrameExtractor({ quality: 5 })
    expect(extractor.getConfig().quality).toBe(5)
  })

  it('should accept custom resolution', () => {
    const extractor = new FrameExtractor({ resolution: '1280x720' })
    expect(extractor.getConfig().resolution).toBe('1280x720')
  })

  it('should update configuration', () => {
    const extractor = new FrameExtractor()
    extractor.updateConfig({ quality: 10 })
    expect(extractor.getConfig().quality).toBe(10)
  })

  it('should throw error for invalid frame format', () => {
    const extractor = new FrameExtractor()
    expect(() => {
      // @ts-ignore - testing invalid input
      extractor.updateConfig({ frameFormat: 'bmp' })
    }).toThrow('frameFormat must be "jpg" or "png"')
  })

  it('should throw error for invalid quality', () => {
    const extractor = new FrameExtractor()
    expect(() => {
      extractor.updateConfig({ quality: 50 })
    }).toThrow('quality must be between 1 and 31')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Video Metadata
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('FrameExtractor - Video Metadata', () => {
  let extractor: FrameExtractor

  beforeEach(() => {
    extractor = new FrameExtractor()
    // Mock fs.access to succeed
    vi.spyOn(fs, 'access').mockResolvedValue(undefined)
  })

  it('should get video metadata', async () => {
    const metadata = await extractor.getVideoMetadata('test-video.mp4')

    expect(metadata.duration).toBe(600)
    expect(metadata.width).toBe(1920)
    expect(metadata.height).toBe(1080)
    expect(metadata.fps).toBe(30)
    expect(metadata.codec).toBe('h264')
    expect(metadata.bitrate).toBe(5000000)
  })

  it('should calculate fps from r_frame_rate', async () => {
    const metadata = await extractor.getVideoMetadata('test-video.mp4')
    expect(metadata.fps).toBe(30) // 30/1 = 30
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Frame Extraction by Interval
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('FrameExtractor - Extract by Interval', () => {
  let extractor: FrameExtractor

  beforeEach(() => {
    extractor = new FrameExtractor({ outputDir: './test-frames' })
    // Mock fs.access to succeed
    vi.spyOn(fs, 'access').mockResolvedValue(undefined)
    // Mock fs.mkdir to succeed
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined)
  })

  it('should extract frames at regular intervals', async () => {
    const result = await extractor.extractFramesByInterval('test-video.mp4', 60)

    expect(result.frames.length).toBeGreaterThan(0)
    expect(result.outputDir).toBe('./test-frames')
    expect(result.totalFrames).toBe(result.frames.length)
    expect(result.processingTime).toBeGreaterThanOrEqual(0)
  })

  it('should calculate correct timestamps for intervals', async () => {
    const result = await extractor.extractFramesByInterval('test-video.mp4', 120)

    // Video duration is 600s, interval is 120s
    // Expected timestamps: 0, 120, 240, 360, 480
    expect(result.frames.length).toBe(5)
    expect(result.frames[0].timestamp).toBe(0)
    expect(result.frames[1].timestamp).toBe(120)
    expect(result.frames[2].timestamp).toBe(240)
  })

  it('should assign sequential frame indices', async () => {
    const result = await extractor.extractFramesByInterval('test-video.mp4', 100)

    result.frames.forEach((frame, i) => {
      expect(frame.frameIndex).toBe(i)
    })
  })

  it('should generate frame paths with correct format', async () => {
    const result = await extractor.extractFramesByInterval('test-video.mp4', 100)

    result.frames.forEach((frame) => {
      expect(frame.framePath).toContain('test-frames')
      expect(frame.framePath).toContain('frame_')
      expect(frame.framePath).toMatch(/\d+\.\d{2}s\.jpg$/)
    })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Frame Extraction by Timestamps
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('FrameExtractor - Extract by Timestamps', () => {
  let extractor: FrameExtractor

  beforeEach(() => {
    extractor = new FrameExtractor()
    // Mock fs.access to succeed
    vi.spyOn(fs, 'access').mockResolvedValue(undefined)
    // Mock fs.mkdir to succeed
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined)
  })

  it('should extract frames at specific timestamps', async () => {
    const timestamps = [10, 20, 30, 40, 50]
    const frames = await extractor.extractFramesAtTimestamps(
      'test-video.mp4',
      timestamps
    )

    expect(frames.length).toBe(5)
    expect(frames[0].timestamp).toBe(10)
    expect(frames[1].timestamp).toBe(20)
    expect(frames[2].timestamp).toBe(30)
  })

  it('should handle empty timestamps array', async () => {
    const frames = await extractor.extractFramesAtTimestamps(
      'test-video.mp4',
      []
    )

    expect(frames.length).toBe(0)
  })

  it('should handle single timestamp', async () => {
    const frames = await extractor.extractFramesAtTimestamps(
      'test-video.mp4',
      [100]
    )

    expect(frames.length).toBe(1)
    expect(frames[0].timestamp).toBe(100)
  })

  it('should create output directory if it does not exist', async () => {
    const mkdirSpy = vi.spyOn(fs, 'mkdir')
    await extractor.extractFramesAtTimestamps('test-video.mp4', [10])

    expect(mkdirSpy).toHaveBeenCalledWith('./frames', { recursive: true })
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Error Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('FrameExtractor - Error Handling', () => {
  let extractor: FrameExtractor

  beforeEach(() => {
    extractor = new FrameExtractor()
  })

  it('should throw error for non-existent video file', async () => {
    // Mock fs.access to fail
    vi.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT'))

    await expect(
      extractor.extractFramesByInterval('non-existent.mp4', 10)
    ).rejects.toThrow('Video file not found or not accessible')
  })

  it('should throw error for invalid video file', async () => {
    // Mock fs.access to succeed but ffprobe to fail
    vi.spyOn(fs, 'access').mockResolvedValue(undefined)

    const ffmpeg = await import('fluent-ffmpeg')
    ffmpeg.default.ffprobe = vi.fn((path: string, callback: any) => {
      callback(new Error('Invalid video file'), null)
    })

    await expect(
      extractor.getVideoMetadata('invalid.mp4')
    ).rejects.toThrow('Failed to get video metadata')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Cleanup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('FrameExtractor - Cleanup', () => {
  let extractor: FrameExtractor

  beforeEach(() => {
    extractor = new FrameExtractor({ outputDir: './test-frames' })
  })

  it('should clean up extracted frames', async () => {
    // Mock fs.readdir to return frame files
    vi.spyOn(fs, 'readdir').mockResolvedValue([
      'frame_0000_10.00s.jpg',
      'frame_0001_20.00s.jpg',
      'other-file.txt',
    ] as any)

    const unlinkSpy = vi.spyOn(fs, 'unlink').mockResolvedValue(undefined)

    await extractor.cleanup()

    // Should only delete frame files
    expect(unlinkSpy).toHaveBeenCalledTimes(2)
  })

  it('should not throw error if output directory does not exist', async () => {
    // Mock fs.readdir to fail with ENOENT
    const error: any = new Error('ENOENT')
    error.code = 'ENOENT'
    vi.spyOn(fs, 'readdir').mockRejectedValue(error)

    await expect(extractor.cleanup()).resolves.not.toThrow()
  })

  it('should throw error for other cleanup errors', async () => {
    // Mock fs.readdir to fail with different error
    const error: any = new Error('Permission denied')
    error.code = 'EACCES'
    vi.spyOn(fs, 'readdir').mockRejectedValue(error)

    await expect(extractor.cleanup()).rejects.toThrow()
  })
})
