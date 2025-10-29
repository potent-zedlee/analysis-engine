/**
 * Unit Tests for Master Prompt Builder
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MasterPromptBuilder } from '../../lib/master-prompt-builder'
import { promises as fs } from 'fs'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Template Loading
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Template Loading', () => {
  let builder: MasterPromptBuilder

  beforeEach(() => {
    builder = new MasterPromptBuilder()
  })

  it('should load Triton template', async () => {
    const result = await builder.buildPrompt({
      layout: 'triton',
    })

    expect(result.layout).toBe('triton')
    expect(result.prompt).toBeTruthy()
    expect(result.prompt.length).toBeGreaterThan(100)
    expect(result.metadata.templatePath).toContain('triton-master-prompt.txt')
  })

  it('should load Hustler template', async () => {
    const result = await builder.buildPrompt({
      layout: 'hustler',
    })

    expect(result.layout).toBe('hustler')
    expect(result.prompt).toBeTruthy()
    expect(result.metadata.templatePath).toContain('hustler-master-prompt.txt')
  })

  it('should load WSOP template', async () => {
    const result = await builder.buildPrompt({
      layout: 'wsop',
    })

    expect(result.layout).toBe('wsop')
    expect(result.prompt).toBeTruthy()
  })

  it('should load APT template', async () => {
    const result = await builder.buildPrompt({
      layout: 'apt',
    })

    expect(result.layout).toBe('apt')
    expect(result.prompt).toBeTruthy()
  })

  it('should load Base template', async () => {
    const result = await builder.buildPrompt({
      layout: 'base',
    })

    expect(result.layout).toBe('base')
    expect(result.prompt).toBeTruthy()
  })

  it('should throw error for non-existent template', async () => {
    const builder = new MasterPromptBuilder({
      promptsDir: path.join(process.cwd(), 'non-existent-dir'),
    })

    await expect(
      builder.buildPrompt({ layout: 'triton' })
    ).rejects.toThrow('Failed to load template')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Placeholder Replacement
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Placeholder Replacement', () => {
  let builder: MasterPromptBuilder

  beforeEach(() => {
    builder = new MasterPromptBuilder()
  })

  it('should replace LAYOUT_INFO placeholder', async () => {
    const result = await builder.buildPrompt({
      layout: 'triton',
    })

    // Should not contain placeholder
    expect(result.prompt).not.toContain('{{LAYOUT_INFO}}')

    // Should contain OSD position info (in Korean)
    expect(result.prompt).toContain('플레이어 이름')
    expect(result.placeholders).toContain('LAYOUT_INFO')
  })

  it('should replace ERROR_CORRECTIONS placeholder when provided', async () => {
    const errorCorrections = `
    Error 1: Misread player name "Phil" as "Phii"
    Correction: Player name is "Phil"
    `

    const result = await builder.buildPrompt({
      layout: 'triton',
      errorCorrections,
    })

    // Should not contain placeholder
    expect(result.prompt).not.toContain('{{ERROR_CORRECTIONS}}')

    // Should contain error corrections
    expect(result.prompt).toContain('Misread player name')
    expect(result.placeholders).toContain('ERROR_CORRECTIONS')
  })

  it('should handle empty ERROR_CORRECTIONS', async () => {
    const result = await builder.buildPrompt({
      layout: 'triton',
      errorCorrections: '',
    })

    // Should replace with empty string
    expect(result.prompt).not.toContain('{{ERROR_CORRECTIONS}}')
    expect(result.placeholders).toContain('ERROR_CORRECTIONS')
  })

  it('should handle custom placeholders', async () => {
    const result = await builder.buildPrompt({
      layout: 'base',
      customPlaceholders: {
        CUSTOM_FIELD: 'Custom Value',
      },
    })

    // If template contains CUSTOM_FIELD, it should be replaced
    // (base template doesn't have CUSTOM_FIELD, so this is a general test)
    expect(result.prompt).not.toContain('{{CUSTOM_FIELD}}')
  })

  it('should track replaced placeholders', async () => {
    const result = await builder.buildPrompt({
      layout: 'triton',
      errorCorrections: 'Some errors',
    })

    expect(result.placeholders).toBeInstanceOf(Array)
    expect(result.placeholders.length).toBeGreaterThan(0)
    expect(result.placeholders).toContain('LAYOUT_INFO')
    expect(result.placeholders).toContain('ERROR_CORRECTIONS')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Metadata
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Metadata', () => {
  let builder: MasterPromptBuilder

  beforeEach(() => {
    builder = new MasterPromptBuilder()
  })

  it('should include metadata in result', async () => {
    const result = await builder.buildPrompt({
      layout: 'triton',
    })

    expect(result.metadata).toBeDefined()
    expect(result.metadata.templatePath).toBeTruthy()
    expect(result.metadata.layoutDataPath).toBeTruthy()
    expect(result.metadata.buildTime).toBeGreaterThanOrEqual(0)
  })

  it('should include confidence threshold', async () => {
    const result = await builder.buildPrompt({
      layout: 'triton',
    })

    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('should have different confidence for different layouts', async () => {
    const triton = await builder.buildPrompt({ layout: 'triton' })
    const base = await builder.buildPrompt({ layout: 'base' })

    // Triton should have higher confidence than base
    expect(triton.confidence).toBeGreaterThan(base.confidence)
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Caching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Caching', () => {
  let builder: MasterPromptBuilder

  beforeEach(() => {
    builder = new MasterPromptBuilder()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should cache templates after first load', async () => {
    const fsSpy = vi.spyOn(fs, 'readFile')

    // First call
    await builder.buildPrompt({ layout: 'triton' })
    const firstCallCount = fsSpy.mock.calls.length

    // Second call
    await builder.buildPrompt({ layout: 'triton' })
    const secondCallCount = fsSpy.mock.calls.length

    // Should not read file again
    expect(secondCallCount).toBe(firstCallCount)
  })

  it('should clear cache when requested', async () => {
    const fsSpy = vi.spyOn(fs, 'readFile')

    // First call
    await builder.buildPrompt({ layout: 'triton' })
    const firstCallCount = fsSpy.mock.calls.length

    // Clear cache
    builder.clearCache()

    // Second call
    await builder.buildPrompt({ layout: 'triton' })
    const secondCallCount = fsSpy.mock.calls.length

    // Should read file again
    expect(secondCallCount).toBeGreaterThan(firstCallCount)
  })

  it('should preload all templates', async () => {
    await builder.preloadTemplates()

    const fsSpy = vi.spyOn(fs, 'readFile')

    // Should not read file (already cached)
    await builder.buildPrompt({ layout: 'triton' })
    await builder.buildPrompt({ layout: 'hustler' })

    expect(fsSpy).not.toHaveBeenCalled()
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Template Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Template Validation', () => {
  it('should validate all templates exist', async () => {
    const builder = new MasterPromptBuilder()
    const missing = await builder.validateTemplates()

    // All templates should exist
    expect(missing).toEqual([])
  })

  it('should detect missing templates', async () => {
    const builder = new MasterPromptBuilder({
      promptsDir: path.join(process.cwd(), 'non-existent-dir'),
    })

    const missing = await builder.validateTemplates()

    // All templates should be missing
    expect(missing.length).toBeGreaterThan(0)
    expect(missing).toContain('triton')
    expect(missing).toContain('hustler')
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Placeholder Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Placeholder Detection', () => {
  let builder: MasterPromptBuilder

  beforeEach(() => {
    builder = new MasterPromptBuilder()
  })

  it('should detect all placeholders in template', async () => {
    const placeholders = await builder.getTemplatePlaceholders('triton')

    expect(placeholders).toBeInstanceOf(Array)
    expect(placeholders.length).toBeGreaterThan(0)
    expect(placeholders).toContain('LAYOUT_INFO')
    expect(placeholders).toContain('ERROR_CORRECTIONS')
  })

  it('should not duplicate placeholders', async () => {
    const placeholders = await builder.getTemplatePlaceholders('triton')

    const unique = [...new Set(placeholders)]
    expect(placeholders.length).toBe(unique.length)
  })

  it('should work for all layouts', async () => {
    const layouts = ['triton', 'hustler', 'wsop', 'apt', 'base']

    for (const layout of layouts) {
      const placeholders = await builder.getTemplatePlaceholders(layout as any)
      expect(placeholders).toBeInstanceOf(Array)
    }
  })
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Test Suite: Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('MasterPromptBuilder - Configuration', () => {
  it('should accept custom layouts data path', () => {
    const customPath = '/custom/path/layouts.json'
    const builder = new MasterPromptBuilder({
      layoutsDataPath: customPath,
    })

    expect(builder).toBeInstanceOf(MasterPromptBuilder)
  })

  it('should accept custom prompts directory', () => {
    const customDir = '/custom/prompts'
    const builder = new MasterPromptBuilder({
      promptsDir: customDir,
    })

    expect(builder).toBeInstanceOf(MasterPromptBuilder)
  })

  it('should use default paths when not specified', () => {
    const builder = new MasterPromptBuilder()

    expect(builder).toBeInstanceOf(MasterPromptBuilder)
  })
})
