/**
 * Gemini Client
 *
 * Client for Google Gemini 1.5 Pro Vision API
 * Handles video analysis and JSON response parsing
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { promises as fs } from 'fs'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GeminiClientConfig {
  apiKey: string
  model?: string // Default: gemini-1.5-pro-latest
  maxOutputTokens?: number // Default: 8192
  temperature?: number // Default: 0.1 (deterministic)
  topK?: number // Default: 40
  topP?: number // Default: 0.95
}

export interface VideoAnalysisOptions {
  videoPath: string
  prompt: string
  mimeType?: string // Default: auto-detect from file extension
}

export interface GeminiResponse<T = any> {
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
    processingTime: number // milliseconds
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gemini Client Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: GenerativeModel
  private config: Required<GeminiClientConfig>

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required')
    }

    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gemini-1.5-pro-latest',
      maxOutputTokens: config.maxOutputTokens || 8192,
      temperature: config.temperature ?? 0.1,
      topK: config.topK || 40,
      topP: config.topP || 0.95,
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey)
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        maxOutputTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
        topK: this.config.topK,
        topP: this.config.topP,
      },
    })
  }

  /**
   * Analyze video with Gemini Vision API
   *
   * @param options - Video analysis options
   * @returns Parsed JSON response with metadata
   */
  async analyzeVideo<T = any>(
    options: VideoAnalysisOptions
  ): Promise<GeminiResponse<T>> {
    const startTime = Date.now()

    // 1. Validate video file exists
    await this.validateVideoFile(options.videoPath)

    // 2. Read video file
    const videoData = await fs.readFile(options.videoPath)
    const mimeType = options.mimeType || this.detectMimeType(options.videoPath)

    // 3. Prepare video part
    const videoPart = {
      inlineData: {
        data: videoData.toString('base64'),
        mimeType,
      },
    }

    // 4. Generate content
    const result = await this.model.generateContent([options.prompt, videoPart])

    const response = result.response
    const rawText = response.text()

    // 5. Parse JSON from response
    const data = this.parseJSONResponse<T>(rawText)

    // 6. Extract token usage
    const tokensUsed = {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    }

    return {
      data,
      rawText,
      tokensUsed,
      metadata: {
        modelUsed: this.config.model,
        finishReason: response.candidates?.[0]?.finishReason || 'unknown',
        safetyRatings: response.candidates?.[0]?.safetyRatings || [],
        processingTime: Date.now() - startTime,
      },
    }
  }

  /**
   * Analyze text prompt (without video)
   * Useful for testing or text-only analysis
   *
   * @param prompt - Text prompt
   * @returns Parsed JSON response
   */
  async analyzeText<T = any>(prompt: string): Promise<GeminiResponse<T>> {
    const startTime = Date.now()

    const result = await this.model.generateContent(prompt)
    const response = result.response
    const rawText = response.text()

    const data = this.parseJSONResponse<T>(rawText)

    const tokensUsed = {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    }

    return {
      data,
      rawText,
      tokensUsed,
      metadata: {
        modelUsed: this.config.model,
        finishReason: response.candidates?.[0]?.finishReason || 'unknown',
        safetyRatings: response.candidates?.[0]?.safetyRatings || [],
        processingTime: Date.now() - startTime,
      },
    }
  }

  /**
   * Parse JSON from Gemini response text
   * Handles markdown code blocks and extra text
   *
   * @param text - Raw response text
   * @returns Parsed JSON object
   */
  private parseJSONResponse<T = any>(text: string): T {
    // Remove markdown code blocks if present
    let jsonText = text.trim()

    // Remove ```json ... ``` blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Try to find JSON array or object
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/)
    const objectMatch = jsonText.match(/\{[\s\S]*\}/)

    if (arrayMatch) {
      jsonText = arrayMatch[0]
    } else if (objectMatch) {
      jsonText = objectMatch[0]
    }

    try {
      return JSON.parse(jsonText)
    } catch (error: any) {
      throw new GeminiParseError(
        `Failed to parse JSON from Gemini response: ${error.message}\n\nResponse text:\n${text}`
      )
    }
  }

  /**
   * Validate video file exists and is accessible
   */
  private async validateVideoFile(videoPath: string): Promise<void> {
    try {
      await fs.access(videoPath)
    } catch (error) {
      throw new Error(`Video file not found or not accessible: ${videoPath}`)
    }
  }

  /**
   * Detect MIME type from file extension
   */
  private detectMimeType(videoPath: string): string {
    const ext = path.extname(videoPath).toLowerCase()

    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.flv': 'video/x-flv',
    }

    return mimeTypes[ext] || 'video/mp4'
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<GeminiClientConfig> {
    return { ...this.config }
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.config.model
  }

  /**
   * Estimate cost for video analysis
   * Based on Gemini 1.5 Pro pricing (as of 2025-01)
   *
   * @param videoFileSizeMB - Video file size in MB
   * @param estimatedOutputTokens - Estimated output tokens
   * @returns Estimated cost in USD
   */
  estimateCost(videoFileSizeMB: number, estimatedOutputTokens: number): number {
    // Gemini 1.5 Pro pricing (approximate):
    // - Input: $7.00 / 1M tokens
    // - Output: $21.00 / 1M tokens
    // - Video: ~260 tokens per MB

    const videoTokens = videoFileSizeMB * 260
    const inputCost = (videoTokens / 1_000_000) * 7.0
    const outputCost = (estimatedOutputTokens / 1_000_000) * 21.0

    return inputCost + outputCost
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Custom Error Classes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class GeminiParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiParseError'
  }
}

export class GeminiAPIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiAPIError'
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default GeminiClient
