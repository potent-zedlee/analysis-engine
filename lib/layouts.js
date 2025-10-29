import fs from 'fs/promises';
import path from 'path';
let layoutsCache = null;
export async function loadAllLayouts() {
    if (layoutsCache) {
        return layoutsCache;
    }
    const layoutsPath = path.join(process.cwd(), 'data', 'layouts.json');
    const content = await fs.readFile(layoutsPath, 'utf-8');
    const layouts = JSON.parse(content);
    layoutsCache = layouts;
    return layouts;
}
export async function loadLayoutMetadata(layoutType) {
    const layouts = await loadAllLayouts();
    const metadata = layouts[layoutType];
    if (!metadata) {
        throw new Error(`Layout "${layoutType}" not found in layouts.json`);
    }
    return metadata;
}
export async function getSupportedLayouts() {
    const layouts = await loadAllLayouts();
    return Object.keys(layouts);
}
export async function isLayoutSupported(layoutType) {
    const supportedLayouts = await getSupportedLayouts();
    return supportedLayouts.includes(layoutType);
}
export function formatOSDPositionsForPrompt(metadata) {
    const lines = [];
    lines.push(`[${metadata.name} OSD 위치 정보]`);
    const keyPositions = [
        'player_name_1',
        'player_stack_1',
        'community_cards',
        'pot_size',
        'dealer_button'
    ];
    for (const key of keyPositions) {
        const pos = metadata.osd_positions[key];
        if (pos) {
            const label = formatPositionLabel(key);
            lines.push(`- ${label}: (x:${pos.x}, y:${pos.y}, w:${pos.w}, h:${pos.h})`);
        }
    }
    lines.push('');
    lines.push('[화면 읽기 우선순위]');
    lines.push('1. 항상 위 좌표의 고정된 텍스트를 먼저 읽어라');
    lines.push('2. 애니메이션 중인 텍스트는 무시하고, 최종 값만 읽어라');
    lines.push('3. 플레이어 이름은 첫 프레임에서 캐시하라');
    return lines.join('\n');
}
function formatPositionLabel(key) {
    const labels = {
        'player_name_1': '플레이어 이름',
        'player_stack_1': '스택 크기',
        'community_cards': '커뮤니티 카드',
        'pot_size': 'POT 크기',
        'dealer_button': '딜러 버튼'
    };
    return labels[key] || key;
}
export function formatDetectionFeaturesForPrompt(metadata) {
    const lines = [];
    lines.push('[감지 특징]');
    for (const feature of metadata.detection_features) {
        lines.push(`- ${feature}`);
    }
    return lines.join('\n');
}
export function getSpecialRulesSummary(metadata) {
    const rules = metadata.special_rules;
    const lines = [];
    if (rules.is_headsup) {
        lines.push('- 헤즈업 (2명)');
    }
    else {
        lines.push(`- ${metadata.ui_characteristics.player_count}명 테이블`);
    }
    if (rules.has_ante) {
        lines.push('- Ante 있음');
    }
    if (rules.allows_straddle) {
        lines.push('- Straddle 허용');
    }
    if (rules.run_it_twice) {
        lines.push('- Run it Twice 허용');
    }
    if (rules.is_tournament) {
        lines.push('- 토너먼트 형식');
    }
    if (rules.multi_language) {
        lines.push('- 다국어 지원');
    }
    return lines.join('\n');
}
export function hasPlayerCams(metadata) {
    return metadata.ui_characteristics.has_player_cams;
}
export function getCurrencyFormat(metadata) {
    return metadata.ui_characteristics.currency_format;
}
export function getAnimationStyle(metadata) {
    return metadata.ui_characteristics.animation_style;
}
export function estimateAnimationDelay(metadata) {
    const style = getAnimationStyle(metadata);
    switch (style) {
        case 'minimal':
            return 0.5;
        case 'moderate':
            return 1.5;
        case 'colorful':
            return 3.0;
        case 'unknown':
            return 2.0;
        default:
            return 2.0;
    }
}
export function getRecommendedConfidenceThreshold(metadata) {
    if (metadata.name === 'Triton Poker') {
        return 0.95;
    }
    if (metadata.name === 'World Series of Poker') {
        return 0.93;
    }
    if (metadata.name === 'Hustler Casino Live') {
        return 0.90;
    }
    if (metadata.name === 'Generic Poker Stream') {
        return 0.75;
    }
    return 0.85;
}
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
};
//# sourceMappingURL=layouts.js.map