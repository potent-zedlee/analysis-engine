/**
 * Layout Management Module
 *
 * Loads and manages tournament layout metadata from data/layouts.json
 * Used for dynamic prompt injection and layout-specific optimizations
 */

import fs from 'fs/promises'
import path from 'path'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Type Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type LayoutType = 'triton' | 'hustler' | 'wsop' | 'apt' | 'base'

export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

export interface OSDPositions {
  [key: string]: BoundingBox
}

export interface UICharacteristics {
  background_color: string
  font_family: string
  text_color: string
  animation_style: 'minimal' | 'moderate' | 'colorful' | 'unknown'
  player_count: number
  has_player_cams: boolean
  currency_format: string
  resolution: string
}

export interface SpecialRules {
  is_headsup: boolean
  has_ante: boolean
  allows_straddle: boolean
  run_it_twice: boolean
  is_tournament?: boolean
  multi_language?: boolean
}

export interface LayoutMetadata {
  name: string
  description: string
  osd_positions: OSDPositions
  ui_characteristics: UICharacteristics
  detection_features: string[]
  special_rules: SpecialRules
}

export type LayoutsDatabase = Record<LayoutType, LayoutMetadata>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cache
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let layoutsCache: LayoutsDatabase | null = null

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Load all layouts from data/layouts.json
 * Results are cached for performance
 */
export async function loadAllLayouts(): Promise<LayoutsDatabase> {
  if (layoutsCache) {
    return layoutsCache
  }

  const layoutsPath = path.join(process.cwd(), 'data', 'layouts.json')
  const content = await fs.readFile(layoutsPath, 'utf-8')
  const layouts: LayoutsDatabase = JSON.parse(content)

  layoutsCache = layouts
  return layouts
}

/**
 * Load metadata for a specific layout
 */
export async function loadLayoutMetadata(
  layoutType: LayoutType
): Promise<LayoutMetadata> {
  const layouts = await loadAllLayouts()
  const metadata = layouts[layoutType]

  if (!metadata) {
    throw new Error(`Layout "${layoutType}" not found in layouts.json`)
  }

  return metadata
}

/**
 * Get all supported layout types
 */
export async function getSupportedLayouts(): Promise<LayoutType[]> {
  const layouts = await loadAllLayouts()
  return Object.keys(layouts) as LayoutType[]
}

/**
 * Check if a layout type is supported
 */
export async function isLayoutSupported(layoutType: string): Promise<boolean> {
  const supportedLayouts = await getSupportedLayouts()
  return supportedLayouts.includes(layoutType as LayoutType)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utility Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Format OSD position metadata for prompt injection
 *
 * Example output:
 * ```
 * [Triton Poker OSD 위치 정보]
 * - 플레이어 이름: (x:70, y:530, w:350, h:40)
 * - 스택 크기: (x:70, y:570, w:350, h:40)
 * ```
 */
export function formatOSDPositionsForPrompt(metadata: LayoutMetadata): string {
  const lines: string[] = []
  lines.push(`[${metadata.name} OSD 위치 정보]`)

  // Key positions only (not all positions)
  const keyPositions = [
    'player_name_1',
    'player_stack_1',
    'community_cards',
    'pot_size',
    'dealer_button'
  ]

  for (const key of keyPositions) {
    const pos = metadata.osd_positions[key]
    if (pos) {
      const label = formatPositionLabel(key)
      lines.push(`- ${label}: (x:${pos.x}, y:${pos.y}, w:${pos.w}, h:${pos.h})`)
    }
  }

  lines.push('')
  lines.push('[화면 읽기 우선순위]')
  lines.push('1. 항상 위 좌표의 고정된 텍스트를 먼저 읽어라')
  lines.push('2. 애니메이션 중인 텍스트는 무시하고, 최종 값만 읽어라')
  lines.push('3. 플레이어 이름은 첫 프레임에서 캐시하라')

  return lines.join('\n')
}

/**
 * Convert position key to Korean label
 */
function formatPositionLabel(key: string): string {
  const labels: Record<string, string> = {
    'player_name_1': '플레이어 이름',
    'player_stack_1': '스택 크기',
    'community_cards': '커뮤니티 카드',
    'pot_size': 'POT 크기',
    'dealer_button': '딜러 버튼'
  }

  return labels[key] || key
}

/**
 * Get detection features as formatted text for prompts
 */
export function formatDetectionFeaturesForPrompt(
  metadata: LayoutMetadata
): string {
  const lines: string[] = []
  lines.push('[감지 특징]')

  for (const feature of metadata.detection_features) {
    lines.push(`- ${feature}`)
  }

  return lines.join('\n')
}

/**
 * Get special rules summary
 */
export function getSpecialRulesSummary(metadata: LayoutMetadata): string {
  const rules = metadata.special_rules
  const lines: string[] = []

  if (rules.is_headsup) {
    lines.push('- 헤즈업 (2명)')
  } else {
    lines.push(`- ${metadata.ui_characteristics.player_count}명 테이블`)
  }

  if (rules.has_ante) {
    lines.push('- Ante 있음')
  }

  if (rules.allows_straddle) {
    lines.push('- Straddle 허용')
  }

  if (rules.run_it_twice) {
    lines.push('- Run it Twice 허용')
  }

  if (rules.is_tournament) {
    lines.push('- 토너먼트 형식')
  }

  if (rules.multi_language) {
    lines.push('- 다국어 지원')
  }

  return lines.join('\n')
}

/**
 * Check if layout has player webcam feeds
 */
export function hasPlayerCams(metadata: LayoutMetadata): boolean {
  return metadata.ui_characteristics.has_player_cams
}

/**
 * Get currency format for the layout
 */
export function getCurrencyFormat(metadata: LayoutMetadata): string {
  return metadata.ui_characteristics.currency_format
}

/**
 * Get animation style (for timing adjustments)
 */
export function getAnimationStyle(
  metadata: LayoutMetadata
): 'minimal' | 'moderate' | 'colorful' | 'unknown' {
  return metadata.ui_characteristics.animation_style
}

/**
 * Estimate animation delay (in seconds)
 * Used to determine how long to wait for animations to complete
 */
export function estimateAnimationDelay(metadata: LayoutMetadata): number {
  const style = getAnimationStyle(metadata)

  switch (style) {
    case 'minimal':
      return 0.5 // Triton: very fast
    case 'moderate':
      return 1.5 // WSOP: moderate
    case 'colorful':
      return 3.0 // Hustler: slow, flashy
    case 'unknown':
      return 2.0 // Default
    default:
      return 2.0
  }
}

/**
 * Get recommended confidence threshold for layout
 * Layouts with better OSD get higher base confidence
 */
export function getRecommendedConfidenceThreshold(
  metadata: LayoutMetadata
): number {
  // Triton: minimalist, clear OSD → high confidence
  if (metadata.name === 'Triton Poker') {
    return 0.95
  }

  // WSOP: clear ESPN graphics → high confidence
  if (metadata.name === 'World Series of Poker') {
    return 0.93
  }

  // Hustler: colorful, animations → medium confidence
  if (metadata.name === 'Hustler Casino Live') {
    return 0.90
  }

  // Base: no layout info → low confidence
  if (metadata.name === 'Generic Poker Stream') {
    return 0.75
  }

  return 0.85 // Default
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
  loadAllLayouts,
  loadLayoutMetadata,
  getSupportedLayouts,
  isLayoutSupported,
  formatOSDPositionsForPrompt,
  formatDetectionFeaturesForPrompt,
  getSpecialRulesSummary,
  hasPlayerCams,
  getCurrencyFormat,
  getAnimationStyle,
  estimateAnimationDelay,
  getRecommendedConfidenceThreshold
}
