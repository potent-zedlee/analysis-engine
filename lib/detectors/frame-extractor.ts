/**
 * Frame Extractor
 *
 * Extracts frames from video files using FFmpeg
 * Supports both interval-based and timestamp-based extraction
 */

import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FrameExtractorConfig {
  outputDir?: string // Output directory for frames, default: ./frames
  frameFormat?: 'jpg' | 'png' // Frame image format, default: jpg
  quality?: number // JPEG quality (1-31, lower is better), default: 2
  resolution?: string // Frame resolution (e.g., "1280x720"), default: original
}

export interface ExtractedFrame {
  framePath: string
  timestamp: number // seconds
  frameIndex: number
}

export interface ExtractionResult {
  frames: ExtractedFrame[]
  outputDir: string
  totalFrames: number
  processingTime: number // milliseconds
}

export interface VideoMetadata {
  duration: number // seconds
  width: number
  height: number
  fps: number
  codec: string
  bitrate: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Frame Extractor Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class FrameExtractor {
  private config: Required<FrameExtractorConfig>

  constructor(config: FrameExtractorConfig = {}) {
    this.config = {
      outputDir: config.outputDir ?? './frames',
      frameFormat: config.frameFormat ?? 'jpg',
      quality: config.quality ?? 2,
      resolution: config.resolution ?? '',
    }
  }

  /**
   * Extract frames at regular intervals
   *
   * @param videoPath - Path to video file
   * @param intervalSeconds - Extract frame every N seconds
   * @returns Extraction result
   */
  async extractFramesByInterval(
    videoPath: string,
    intervalSeconds: number
  ): Promise<ExtractionResult> {
    const startTime = Date.now()

    // Validate video file
    await this.validateVideoFile(videoPath)

    // Get video metadata
    const metadata = await this.getVideoMetadata(videoPath)

    // Calculate timestamps
    const timestamps: number[] = []
    for (
      let time = 0;
      time < metadata.duration;
      time += intervalSeconds
    ) {
      timestamps.push(time)
    }

    // Extract frames
    const frames = await this.extractFramesAtTimestamps(
      videoPath,
      timestamps
    )

    return {
      frames,
      outputDir: this.config.outputDir,
      totalFrames: frames.length,
      processingTime: Date.now() - startTime,
    }
  }

  /**
   * Extract frames at specific timestamps
   *
   * @param videoPath - Path to video file
   * @param timestamps - Array of timestamps (in seconds)
   * @returns Extraction result
   */
  async extractFramesAtTimestamps(
    videoPath: string,
    timestamps: number[]
  ): Promise<ExtractedFrame[]> {
    // Validate video file
    await this.validateVideoFile(videoPath)

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true })

    const frames: ExtractedFrame[] = []

    // Extract each frame
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i]
      const framePath = path.join(
        this.config.outputDir,
        `frame_${String(i).padStart(4, '0')}_${timestamp.toFixed(2)}s.${this.config.frameFormat}`
      )

      await this.extractSingleFrame(videoPath, timestamp, framePath)

      frames.push({
        framePath,
        timestamp,
        frameIndex: i,
      })
    }

    return frames
  }

  /**
   * Extract a single frame at specific timestamp
   *
   * @param videoPath - Path to video file
   * @param timestamp - Timestamp in seconds
   * @param outputPath - Output file path
   */
  private async extractSingleFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(outputPath)

      // Set quality
      if (this.config.frameFormat === 'jpg') {
        command = command.outputOptions([`-q:v ${this.config.quality}`])
      }

      // Set resolution if specified
      if (this.config.resolution) {
        command = command.size(this.config.resolution)
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Frame extraction failed: ${err.message}`)))
        .run()
    })
  }

  /**
   * Get video metadata
   *
   * @param videoPath - Path to video file
   * @returns Video metadata
   */
  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`))
          return
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
        if (!videoStream) {
          reject(new Error('No video stream found'))
          return
        }

        // Calculate FPS from r_frame_rate (e.g., "30/1" → 30)
        const fpsMatch = videoStream.r_frame_rate?.match(/(\d+)\/(\d+)/)
        const fps = fpsMatch
          ? parseInt(fpsMatch[1]) / parseInt(fpsMatch[2])
          : 30

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps,
          codec: videoStream.codec_name || 'unknown',
          bitrate: metadata.format.bit_rate || 0,
        })
      })
    })
  }

  /**
   * Validate video file exists and is accessible
   */
  private async validateVideoFile(videoPath: string): Promise<void> {
    try {
      await fs.access(videoPath)
    } catch {
      throw new Error(`Video file not found or not accessible: ${videoPath}`)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<FrameExtractorConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FrameExtractorConfig>): void {
    if (config.outputDir !== undefined) {
      this.config.outputDir = config.outputDir
    }

    if (config.frameFormat !== undefined) {
      if (!['jpg', 'png'].includes(config.frameFormat)) {
        throw new Error('frameFormat must be "jpg" or "png"')
      }
      this.config.frameFormat = config.frameFormat
    }

    if (config.quality !== undefined) {
      if (config.quality < 1 || config.quality > 31) {
        throw new Error('quality must be between 1 and 31')
      }
      this.config.quality = config.quality
    }

    if (config.resolution !== undefined) {
      this.config.resolution = config.resolution
    }
  }

  /**
   * Clean up extracted frames
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.outputDir)
      for (const file of files) {
        if (file.startsWith('frame_') && (file.endsWith('.jpg') || file.endsWith('.png'))) {
          await fs.unlink(path.join(this.config.outputDir, file))
        }
      }
    } catch (error: any) {
      // Ignore errors if directory doesn't exist
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default FrameExtractor
