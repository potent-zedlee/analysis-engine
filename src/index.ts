/**
 * Hand Analysis Engine
 * Entry point for the npm package
 *
 * Main exports:
 * - HandAnalyzer: Main analysis engine
 * - TemplarIntegration: Supabase integration
 * - Core types and interfaces
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Classes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { HandAnalyzer } from './core/hand-analyzer.js'
export type {
  AnalysisOptions,
  AnalysisResult,
  // HandIterationResult, // No longer used
} from './core/hand-analyzer.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Templar Archives Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { TemplarIntegration } from '../lib/templar-integration.js'
export type {
  IntegrationOptions,
  IntegrationResult,
  IntegrationError,
} from '../lib/templar-integration.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Detectors
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { HandBoundaryDetector } from '../lib/detectors/hand-boundary-detector.js'
export type {
  HandBoundaryDetectorConfig,
  HandBoundary,
  HandBoundaryResult,
} from '../lib/detectors/hand-boundary-detector.js'

export { SceneChangeDetector } from '../lib/detectors/scene-change-detector.js'
export type {
  SceneChangeDetectorConfig,
  SceneChange,
  SceneChangeResult,
} from '../lib/detectors/scene-change-detector.js'

export { LayoutDetector } from '../lib/detectors/layout-detector.js'
export type {
  LayoutDetectorConfig,
  LayoutDetectionResult,
} from '../lib/detectors/layout-detector.js'

export { FrameExtractor } from '../lib/detectors/frame-extractor.js'
export type {
  FrameExtractorConfig,
  ExtractedFrame,
  ExtractionResult,
} from '../lib/detectors/frame-extractor.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Clients
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { GeminiClient } from '../lib/gemini-client.js'
export type {
  GeminiClientConfig,
  GeminiResponse,
} from '../lib/gemini-client.js'

export { MasterPromptBuilder } from '../lib/master-prompt-builder.js'
export type {
  MasterPrompt,
} from '../lib/master-prompt-builder.js'

export { PromptOptimizer } from '../lib/prompt-optimizer.js'
export type {
  IterationContext,
} from '../lib/prompt-optimizer.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { ErrorAnalyzer } from '../lib/error-analyzer.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// YouTube API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { YouTubeAPIClient, YouTubeAPIError } from '../lib/youtube-api.js'
export type {
  VideoMetadata,
  YouTubeAPIConfig,
} from '../lib/youtube-api.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layout System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export {
  loadAllLayouts,
  loadLayoutMetadata,
  formatOSDPositionsForPrompt,
  getRecommendedConfidenceThreshold,
  estimateAnimationDelay,
} from '../lib/layouts.js'
export type {
  LayoutMetadata,
  OSDPositions,
  UICharacteristics,
} from '../lib/layouts.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type {
  Hand,
  Player,
  Card,
  Action,
  HandResult,
} from '../lib/types/hand.js'

export type {
  HandError,
  ErrorType,
  ErrorSeverity,
} from '../lib/types/error.js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Default Export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export { HandAnalyzer as default } from './core/hand-analyzer.js'
