/**
 * 達文西橋模擬器 - 兒童簡化版常量
 * 包含中文化命名、簡化參數和步驟
 */

// 兒童友好色彩方案（增加飽和度）
export const COLORS = {
    background: '#f0f4f8',  // 淺色柔和背景
    grid: '#cbd5e1',        // 網格線
    text: '#1e293b',        // 文字顏色
    // 木棍顏色（飽和度+10%）
    V1: '#ffb6c1',          // 粉色 - 支撐木棍
    H0: '#228b22',          // 綠色 - 主樑
    V0: '#da3d3d',          // 紅色 - 頂端木棍
    H1R: '#4169e1',         // 藍色 - 右側腿部
    H1L: '#9370db'          // 紫色 - 左側腿部
};

// 木棍中文化命名
export const BEAM_NAMES = {
    'V1-top': '右直一',      // 右邊的直立支撐（上）
    'V1-bot': '左直一',      // 左邊的直立支撐（下）
    'H0-top': '上橫',        // 上方的橫向主樑
    'H0-bot': '下橫',        // 下方的橫向主樑
    'V0': '中直',            // 中間的直立頂端
    'H1R-top': '右橫一上',   // 右邊支撐腿（上）
    'H1R-bot': '右橫一下',   // 右邊支撐腿（下）
    'H1L-top': '左橫一上',   // 左邊支撐腿（上）
    'H1L-bot': '左橫一下'    // 左邊支撐腿（下）
};

// 簡化版參數配置（只有 x, a, b）
export const SIMPLIFIED_PARAMS = {
    // 可調參數
    x: { min: 15, max: 25, default: 20, step: 1, label: '📏 木棍長度', hint: '調整木棍有多長', unit: 'cm' },
    a: { min: 1, max: 5, default: 2.5, step: 0.5, label: '↔️ 橫向重疊', hint: '木棍左右交叉的位置', unit: 'cm' },
    b: { min: 1, max: 5, default: 2.5, step: 0.5, label: '↕️ 縱向重疊', hint: '木棍上下交叉的位置', unit: 'cm' },

    // 固定參數（不顯示給用戶）
    y: 1.0,          // 棍寬固定
    z: 0.2,          // 棍厚固定
    s: 0.1,          // 間隙固定
    Pmax: 4,         // 位置數固定
    L: 1,            // 層數固定為 1（單層）
    pMode: 'cis'     // P模式固定
};

// 預設參數值
export const INITIAL_PARAMS = {
    x: 20,
    y: 1.0,
    z: 0.2,
    a: 2.5,
    b: 2.5,
    s: 0.1,
    L: 1,            // 兒童版固定為單層
    Pmax: 4,
    pMode: 'cis'
};

// 簡化的搭建步驟（6 步：0-5）
export const BUILD_STEPS = [
    // 步驟 0：準備開始
    {
        beams: [],
        emoji: '🎯',
        title: '準備開始',
        description: '歡迎來到達文西橋搭建遊戲！我們要用木棍搭建一座神奇的橋樑。',
        activeBeams: [],
        phase: 0
    },

    // 步驟 1：放置支撐（V1）
    {
        beams: ['pink1', 'pink2'],  // V1-L, V1-R
        emoji: '🩷',
        title: '放置支撐',
        description: '先放兩根直立的粉色木棍作為支撐，它們是橋的基礎！',
        activeBeams: ['pink'],
        phase: 1,
        chineseName: '左直一、右直一',
        animationFrom: 'top'  // 從上方飛入
    },

    // 步驟 2：橫放主樑（H0）
    {
        beams: ['pink1', 'pink2', 'green1', 'green2'],  // V1 + H0
        emoji: '💚',
        title: '橫放主樑',
        description: '放兩根綠色木棍橫跨在粉色支撐上，這是橋的主要結構。',
        activeBeams: ['green'],
        phase: 1,
        chineseName: '上橫、下橫',
        animationFrom: 'sides'  // 從兩側飛入
    },

    // 步驟 3：頂端木棍（V0）
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1'],  // V1 + H0 + V0
        emoji: '❤️',
        title: '頂端木棍',
        description: '在中間放一根紅色直立木棍，它會壓住綠色橫樑的中央。',
        activeBeams: ['red'],
        phase: 1,
        chineseName: '中直',
        animationFrom: 'top'  // 從上方飛入
    },

    // 步驟 4：右側腿部（H1-R）
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2'],
        emoji: '💙',
        title: '右側腿部',
        description: '放置右邊的藍色支撐腿，讓橋變得更穩固！',
        activeBeams: ['blue'],
        phase: 2,
        chineseName: '右橫一',
        animationFrom: 'right'  // 從右側飛入
    },

    // 步驟 5：左側腿部（H1-L） - 完成！
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2', 'purple1', 'purple2'],
        emoji: '💜',
        title: '左側腿部',
        description: '最後放置左邊的紫色支撐腿，完成這座神奇的達文西橋！🎉',
        activeBeams: ['purple'],
        phase: 2,
        chineseName: '左橫一',
        animationFrom: 'left',  // 從左側飛入
        isComplete: true  // 標記為完成步驟
    }
];

// 木棍類型映射（用於動畫和渲染）
export const BEAM_MAP = {
    'V1-top': { type: 'vertical', color: 'V1', chineseName: '右直一', legacy: 'pink1' },
    'V1-bot': { type: 'vertical', color: 'V1', chineseName: '左直一', legacy: 'pink2' },
    'H0-top': { type: 'horizontal', color: 'H0', chineseName: '上橫', legacy: 'green1' },
    'H0-bot': { type: 'horizontal', color: 'H0', chineseName: '下橫', legacy: 'green2' },
    'V0': { type: 'vertical', color: 'V0', chineseName: '中直', legacy: 'red1' },
    'H1R-top': { type: 'horizontal', color: 'H1R', chineseName: '右橫一上', legacy: 'blue1' },
    'H1R-bot': { type: 'horizontal', color: 'H1R', chineseName: '右橫一下', legacy: 'blue2' },
    'H1L-top': { type: 'horizontal', color: 'H1L', chineseName: '左橫一上', legacy: 'purple1' },
    'H1L-bot': { type: 'horizontal', color: 'H1L', chineseName: '左橫一下', legacy: 'purple2' }
};

// 動畫配置
export const ANIMATION_CONFIG = {
    duration: 600,  // 動畫時長（ms）
    staggerDelay: 150,  // 順序延遲（ms）
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // 彈跳緩動
    flyDistance: {
        vertical: 200,    // 垂直木棍飛入距離（px）
        horizontal: 300   // 橫向木棍飛入距離（px）
    },
    rotation: {
        vertical: -10,    // 垂直木棍旋轉角度（度）
        horizontal: 5     // 橫向木棍旋轉角度（度）
    }
};

// 音效配置（可選）
export const SOUND_CONFIG = {
    enabled: false,  // 預設關閉音效
    volume: 0.3,     // 音量 30%
    sounds: {
        whoosh: '/assets/sounds/whoosh.mp3',  // 飛入音效
        tap: '/assets/sounds/tap.mp3'         // 落定音效
    }
};

// 慶祝動畫配置
export const CELEBRATION_CONFIG = {
    duration: 2000,          // 慶祝動畫時長（ms）
    confettiCount: 100,      // 紙屑數量
    confettiColors: [
        '#ffb6c1', '#228b22', '#da3d3d',
        '#4169e1', '#9370db', '#ffd700',
        '#ff8c00', '#00ced1'
    ]
};
