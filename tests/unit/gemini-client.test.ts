/**
 * Unit Tests for Gemini Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GeminiClient, GeminiParseError } from '../../lib/gemini-client'
import { promises as fs } from 'fs'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('GeminiClient - Configuration', () => {
  it('should initialize with API key', () => {
    const client = new GeminiClient({ apiKey: 'test-api-key' })
    expect(client).toBeInstanceOf(GeminiClient)
  })

  it('should throw error if API key is missing', () => {
    expect(() => {
      new GeminiClient({ apiKey: '' })
    }).toThrow('Gemini API key is required')
  })

  it('should use default model', () => {
    const client = new GeminiClient({ apiKey: 'test-key' })
    expect(client.getModelName()).toBe('gemini-1.5-pro-latest')
  })

  it('should accept custom model', () => {
    const client = new GeminiClient({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash-latest',
    })
    expect(client.getModelName()).toBe('gemini-1.5-flash-latest')
  })

  it('should use default temperature', () => {
    const client = new GeminiClient({ apiKey: 'test-key' })
    const config = client.getConfig()
    expect(config.temperature).toBe(0.1)
  })

  it('should accept custom temperature', () => {
    const client = new GeminiClient({
      apiKey: 'test-key',
      temperature: 0.5,
    })
    const config = client.getConfig()
    expect(config.temperature).toBe(0.5)
  })

  it('should use default maxOutputTokens', () => {
    const client = new GeminiClient({ apiKey: 'test-key' })
    const config = client.getConfig()
    expect(config.maxOutputTokens).toBe(8192)
  })

  it('should accept custom maxOutputTokens', () => {
    const client = new GeminiClient({
      apiKey: 'test-key',
      maxOutputTokens: 4096,
    })
    const config = client.getConfig()
    expect(config.maxOutputTokens).toBe(4096)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: JSON Parsing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('GeminiClient - JSON Parsing', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient({ apiKey: 'test-key' })
  })

  it('should parse plain JSON array', () => {
    const mockResponse = '[{"id": 1}, {"id": 2}]'
    // @ts-ignore - accessing private method for testing
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('should parse JSON with markdown code block', () => {
    const mockResponse = '```json\n[{"id": 1}]\n```'
    // @ts-ignore
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual([{ id: 1 }])
  })

  it('should parse JSON with generic code block', () => {
    const mockResponse = '```\n{"key": "value"}\n```'
    // @ts-ignore
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual({ key: 'value' })
  })

  it('should extract JSON from text with extra content', () => {
    const mockResponse = 'Here is the result:\n[{"id": 1}]\nEnd of response'
    // @ts-ignore
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual([{ id: 1 }])
  })

  it('should parse nested JSON objects', () => {
    const mockResponse = '{"player": {"name": "John", "stack": 1000}}'
    // @ts-ignore
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual({ player: { name: 'John', stack: 1000 } })
  })

  it('should throw GeminiParseError for invalid JSON', () => {
    const mockResponse = 'This is not JSON'
    expect(() => {
      // @ts-ignore
      client.parseJSONResponse(mockResponse)
    }).toThrow(GeminiParseError)
  })

  it('should handle empty array', () => {
    const mockResponse = '[]'
    // @ts-ignore
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual([])
  })

  it('should handle empty object', () => {
    const mockResponse = '{}'
    // @ts-ignore
    const result = client.parseJSONResponse(mockResponse)
    expect(result).toEqual({})
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: MIME Type Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('GeminiClient - MIME Type Detection', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient({ apiKey: 'test-key' })
  })

  it('should detect MP4 MIME type', () => {
    // @ts-ignore - accessing private method
    const mimeType = client.detectMimeType('video.mp4')
    expect(mimeType).toBe('video/mp4')
  })

  it('should detect MOV MIME type', () => {
    // @ts-ignore
    const mimeType = client.detectMimeType('video.mov')
    expect(mimeType).toBe('video/quicktime')
  })

  it('should detect WEBM MIME type', () => {
    // @ts-ignore
    const mimeType = client.detectMimeType('video.webm')
    expect(mimeType).toBe('video/webm')
  })

  it('should default to video/mp4 for unknown extensions', () => {
    // @ts-ignore
    const mimeType = client.detectMimeType('video.unknown')
    expect(mimeType).toBe('video/mp4')
  })

  it('should be case-insensitive', () => {
    // @ts-ignore
    const mimeType = client.detectMimeType('video.MP4')
    expect(mimeType).toBe('video/mp4')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Cost Estimation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('GeminiClient - Cost Estimation', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient({ apiKey: 'test-key' })
  })

  it('should estimate cost for small video', () => {
    const cost = client.estimateCost(10, 1000) // 10MB video, 1000 output tokens
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeLessThan(0.1) // Should be less than $0.10
  })

  it('should estimate cost for medium video', () => {
    const cost = client.estimateCost(50, 5000) // 50MB video, 5000 output tokens
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeLessThan(0.5)
  })

  it('should estimate cost for large video', () => {
    const cost = client.estimateCost(200, 8000) // 200MB video, 8000 output tokens
    expect(cost).toBeGreaterThan(0.1)
    expect(cost).toBeLessThan(2.0)
  })

  it('should increase with video size', () => {
    const cost1 = client.estimateCost(10, 1000)
    const cost2 = client.estimateCost(100, 1000)
    expect(cost2).toBeGreaterThan(cost1)
  })

  it('should increase with output tokens', () => {
    const cost1 = client.estimateCost(10, 1000)
    const cost2 = client.estimateCost(10, 5000)
    expect(cost2).toBeGreaterThan(cost1)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Text Analysis (Mocked)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('GeminiClient - Text Analysis', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient({ apiKey: 'test-key' })
    vi.clearAllMocks()
  })

  it('should analyze text and return structured response', async () => {
    // Mock the model's generateContent method
    const mockResult = {
      response: {
        text: () => '{"result": "success"}',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
        candidates: [
          {
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
      },
    }

    // @ts-ignore - mocking private property
    client.model = {
      generateContent: vi.fn().mockResolvedValue(mockResult),
    }

    const result = await client.analyzeText('Test prompt')

    expect(result.data).toEqual({ result: 'success' })
    expect(result.rawText).toBe('{"result": "success"}')
    expect(result.tokensUsed.totalTokens).toBe(30)
    expect(result.metadata.finishReason).toBe('STOP')
  })

  it('should include processing time in metadata', async () => {
    const mockResult = {
      response: {
        text: () => '[]',
        usageMetadata: {},
        candidates: [],
      },
    }

    // @ts-ignore
    client.model = {
      generateContent: vi.fn().mockResolvedValue(mockResult),
    }

    const result = await client.analyzeText('Test')

    expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: File Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('GeminiClient - File Validation', () => {
  let client: GeminiClient

  beforeEach(() => {
    client = new GeminiClient({ apiKey: 'test-key' })
  })

  it('should throw error for non-existent file', async () => {
    await expect(
      // @ts-ignore - accessing private method
      client.validateVideoFile('/non/existent/video.mp4')
    ).rejects.toThrow('Video file not found or not accessible')
  })

  it('should not throw error for existing file', async () => {
    // Mock fs.access to succeed
    vi.spyOn(fs, 'access').mockResolvedValue(undefined)

    await expect(
      // @ts-ignore
      client.validateVideoFile('existing-video.mp4')
    ).resolves.not.toThrow()

    vi.restoreAllMocks()
  })
})
