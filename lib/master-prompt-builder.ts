/**
 * Master Prompt Builder
 *
 * Builds complete prompts by:
 * 1. Loading layout information from data/layouts.json
 * 2. Loading Master Prompt template from prompts/{layout}-master-prompt.txt
 * 3. Replacing placeholders with actual values
 * 4. Returning final prompt for Gemini Vision API
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import type { LayoutType } from './layouts.js'
import {
  loadLayoutMetadata,
  formatOSDPositionsForPrompt,
  getRecommendedConfidenceThreshold,
} from './layouts.js'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MasterPromptBuilderConfig {
  layoutsDataPath?: string // Default: data/layouts.json
  promptsDir?: string // Default: prompts/
}

export interface BuildPromptOptions {
  layout: LayoutType
  errorCorrections?: string // Optional: Previous iteration errors
  customPlaceholders?: Record<string, string> // Optional: Additional placeholders
}

export interface MasterPrompt {
  layout: LayoutType
  prompt: string
  placeholders: string[] // List of placeholders that were replaced
  confidence: number // Recommended confidence threshold for this layout
  metadata: {
    templatePath: string
    layoutDataPath: string
    buildTime: number // milliseconds
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Master Prompt Builder Class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class MasterPromptBuilder {
  private layoutsDataPath: string
  private promptsDir: string
  private templateCache: Map<LayoutType, string> = new Map()

  constructor(config: MasterPromptBuilderConfig = {}) {
    // Use import.meta.url to resolve paths relative to this module
    // This works in both local development and Vercel Lambda environment
    this.layoutsDataPath =
      config.layoutsDataPath || path.join(__dirname, '..', 'data', 'layouts.json')
    this.promptsDir = config.promptsDir || path.join(__dirname, '..', 'prompts')
  }

  /**
   * Build complete prompt for a given layout
   *
   * @param options - Build options including layout and optional error corrections
   * @returns Complete Master Prompt with metadata
   */
  async buildPrompt(options: BuildPromptOptions): Promise<MasterPrompt> {
    const startTime = Date.now()

    // 1. Load template
    const template = await this.loadTemplate(options.layout)

    // 2. Load layout metadata
    const metadata = await loadLayoutMetadata(options.layout)

    // 3. Format OSD positions for prompt
    const layoutInfo = formatOSDPositionsForPrompt(metadata)

    // 4. Get confidence threshold
    const confidence = getRecommendedConfidenceThreshold(metadata)

    // 4. Prepare placeholder values
    const placeholderValues: Record<string, string> = {
      LAYOUT_INFO: layoutInfo,
      ERROR_CORRECTIONS: options.errorCorrections || '',
      ...options.customPlaceholders,
    }

    // 5. Replace placeholders
    let prompt = template
    const replacedPlaceholders: string[] = []

    for (const [key, value] of Object.entries(placeholderValues)) {
      const placeholder = `{{${key}}}`
      if (template.includes(placeholder)) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), value)
        replacedPlaceholders.push(key)
      }
    }

    return {
      layout: options.layout,
      prompt,
      placeholders: replacedPlaceholders,
      confidence,
      metadata: {
        templatePath: this.getTemplatePath(options.layout),
        layoutDataPath: this.layoutsDataPath,
        buildTime: Date.now() - startTime,
      },
    }
  }

  /**
   * Load Master Prompt template from file
   * Uses caching to avoid repeated file reads
   *
   * @param layout - Layout type
   * @returns Template string
   */
  private async loadTemplate(layout: LayoutType): Promise<string> {
    // Check cache first
    if (this.templateCache.has(layout)) {
      return this.templateCache.get(layout)!
    }

    // Load from file
    const templatePath = this.getTemplatePath(layout)

    try {
      const template = await fs.readFile(templatePath, 'utf-8')
      this.templateCache.set(layout, template)
      return template
    } catch (error: any) {
      throw new Error(
        `Failed to load template for layout "${layout}" from ${templatePath}: ${error.message}`
      )
    }
  }

  /**
   * Get template file path for a layout
   */
  private getTemplatePath(layout: LayoutType): string {
    return path.join(this.promptsDir, `${layout}-master-prompt.txt`)
  }

  /**
   * Clear template cache
   * Useful for testing or when templates are updated
   */
  clearCache(): void {
    this.templateCache.clear()
  }

  /**
   * Preload all templates into cache
   * Useful for optimizing performance at startup
   */
  async preloadTemplates(): Promise<void> {
    const layouts: LayoutType[] = ['triton', 'hustler', 'wsop', 'apt', 'base']

    await Promise.all(
      layouts.map(async (layout) => {
        try {
          await this.loadTemplate(layout)
        } catch (error) {
          // Silently skip missing templates
        }
      })
    )
  }

  /**
   * Validate that all required templates exist
   *
   * @returns Array of missing template layouts
   */
  async validateTemplates(): Promise<LayoutType[]> {
    const layouts: LayoutType[] = ['triton', 'hustler', 'wsop', 'apt', 'base']
    const missing: LayoutType[] = []

    await Promise.all(
      layouts.map(async (layout) => {
        try {
          await this.loadTemplate(layout)
        } catch (error) {
          missing.push(layout)
        }
      })
    )

    return missing
  }

  /**
   * Get list of available placeholders in a template
   *
   * @param layout - Layout type
   * @returns Array of placeholder names (without {{ }})
   */
  async getTemplatePlaceholders(layout: LayoutType): Promise<string[]> {
    const template = await this.loadTemplate(layout)
    const regex = /\{\{([A-Z_]+)\}\}/g
    const placeholders: string[] = []

    let match
    while ((match = regex.exec(template)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1])
      }
    }

    return placeholders
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default MasterPromptBuilder
