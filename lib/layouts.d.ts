export type LayoutType = 'triton' | 'hustler' | 'wsop' | 'apt' | 'base';
export interface BoundingBox {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface OSDPositions {
    [key: string]: BoundingBox;
}
export interface UICharacteristics {
    background_color: string;
    font_family: string;
    text_color: string;
    animation_style: 'minimal' | 'moderate' | 'colorful' | 'unknown';
    player_count: number;
    has_player_cams: boolean;
    currency_format: string;
    resolution: string;
}
export interface SpecialRules {
    is_headsup: boolean;
    has_ante: boolean;
    allows_straddle: boolean;
    run_it_twice: boolean;
    is_tournament?: boolean;
    multi_language?: boolean;
}
export interface LayoutMetadata {
    name: string;
    description: string;
    osd_positions: OSDPositions;
    ui_characteristics: UICharacteristics;
    detection_features: string[];
    special_rules: SpecialRules;
}
export type LayoutsDatabase = Record<LayoutType, LayoutMetadata>;
export declare function loadAllLayouts(): Promise<LayoutsDatabase>;
export declare function loadLayoutMetadata(layoutType: LayoutType): Promise<LayoutMetadata>;
export declare function getSupportedLayouts(): Promise<LayoutType[]>;
export declare function isLayoutSupported(layoutType: string): Promise<boolean>;
export declare function formatOSDPositionsForPrompt(metadata: LayoutMetadata): string;
export declare function formatDetectionFeaturesForPrompt(metadata: LayoutMetadata): string;
export declare function getSpecialRulesSummary(metadata: LayoutMetadata): string;
export declare function hasPlayerCams(metadata: LayoutMetadata): boolean;
export declare function getCurrencyFormat(metadata: LayoutMetadata): string;
export declare function getAnimationStyle(metadata: LayoutMetadata): 'minimal' | 'moderate' | 'colorful' | 'unknown';
export declare function estimateAnimationDelay(metadata: LayoutMetadata): number;
export declare function getRecommendedConfidenceThreshold(metadata: LayoutMetadata): number;
declare const _default: {
    loadAllLayouts: typeof loadAllLayouts;
    loadLayoutMetadata: typeof loadLayoutMetadata;
    getSupportedLayouts: typeof getSupportedLayouts;
    isLayoutSupported: typeof isLayoutSupported;
    formatOSDPositionsForPrompt: typeof formatOSDPositionsForPrompt;
    formatDetectionFeaturesForPrompt: typeof formatDetectionFeaturesForPrompt;
    getSpecialRulesSummary: typeof getSpecialRulesSummary;
    hasPlayerCams: typeof hasPlayerCams;
    getCurrencyFormat: typeof getCurrencyFormat;
    getAnimationStyle: typeof getAnimationStyle;
    estimateAnimationDelay: typeof estimateAnimationDelay;
    getRecommendedConfidenceThreshold: typeof getRecommendedConfidenceThreshold;
};
export default _default;
//# sourceMappingURL=layouts.d.ts.map