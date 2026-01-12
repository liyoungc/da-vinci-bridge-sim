export const COLORS = {
    background: '#1a1d23', // Slate 900
    grid: '#334155',       // Slate 700
    text: '#94a3b8',       // Slate 400
    H0: '#228b22',         // Green (forestgreen)
    V0: '#da3d3d',         // Red
    V1: '#ffb6c1',         // Pink (lightpink)
    H1R: '#4169e1',        // Blue (royalblue)
    H1L: '#9370db',        // Purple (mediumpurple)
    V2: '#ff8c00',         // Orange (darkorange)
    H2R: '#00ced1',        // Cyan (darkturquoise)
    H2L: '#ffd700'         // Yellow (gold)
};

export const BEAM_MAP = {
    // id: { type, layer, side, colorKey }
    'V1-top': { type: 'vertical', layer: 1, side: 'center', color: 'V1', legacy: 'pink1' },
    'V1-bot': { type: 'vertical', layer: 1, side: 'center', color: 'V1', legacy: 'pink2' },
    'H0-top': { type: 'horizontal', layer: 0, side: 'center', color: 'H0', legacy: 'green1' },
    'H0-bot': { type: 'horizontal', layer: 0, side: 'center', color: 'H0', legacy: 'green2' },
    'V0': { type: 'vertical', layer: 0, side: 'center', color: 'V0', legacy: 'red1' },
    'H1R-top': { type: 'horizontal', layer: 1, side: 'R', color: 'H1R', legacy: 'blue1' },
    'H1R-bot': { type: 'horizontal', layer: 1, side: 'R', color: 'H1R', legacy: 'blue2' },
    'H1L-top': { type: 'horizontal', layer: 1, side: 'L', color: 'H1L', legacy: 'purple1' },
    'H1L-bot': { type: 'horizontal', layer: 1, side: 'L', color: 'H1L', legacy: 'purple2' },
    'V2-L': { type: 'vertical', layer: 2, side: 'L', color: 'V2', legacy: 'orange1' },
    'V2-R': { type: 'vertical', layer: 2, side: 'R', color: 'V2', legacy: 'orange2' },
    'H2R-top': { type: 'horizontal', layer: 2, side: 'R', color: 'H2R', legacy: 'cyan1' },
    'H2R-bot': { type: 'horizontal', layer: 2, side: 'R', color: 'H2R', legacy: 'cyan2' },
    'H2L-top': { type: 'horizontal', layer: 2, side: 'L', color: 'H2L', legacy: 'yellow1' },
    'H2L-bot': { type: 'horizontal', layer: 2, side: 'L', color: 'H2L', legacy: 'yellow2' }
};

export const INITIAL_PARAMS = {
    x: 20,      // 棍長
    y: 1.0,     // 棍寬
    z: 0.2,     // 棍厚
    a: 4,       // 水平棍邊緣到垂直棍交叉中點的距離
    b: 2,       // 垂直棍交叉中點到自己外緣的距離 (B = max(b1, b2...))
    s: 0.1,     // 相鄰水平棍間隙
    L: 2,       // 層數
    Pmax: 5,    // 最大單邊水平容許位置
    pMode: 'cis', // P 位置規則: 'cis' (往 Pmax 找) 或 'trans' (往 P1 找)
    // 舊參數別名 (相容性)
    get beamLength() { return this.x; },
    get beamWidth() { return this.y; },
    get beamThick() { return this.z; },
    get overlap() { return this.a; },
    get gap() { return this.s; }
};

export const BUILD_STEPS = [
    // 準備
    {
        beams: [],
        title: '準備開始',
        description: '達文西橋是一種「互承結構」，每根棍子既支撐別人也被別人支撐。',
        activeBeams: [],
        phase: 0
    },
    // 第一階段：核心模組
    {
        beams: ['pink1', 'pink2'],
        title: '【第一階段】步驟 1：設置底座 (V1)',
        description: 'V1：兩根垂直棍平行放置，間距 = x - 2a，作為第一層支點。',
        activeBeams: ['pink'],
        phase: 1
    },
    {
        beams: ['pink1', 'pink2', 'green1', 'green2'],
        title: '【第一階段】步驟 2：架設橫樑 (H0)',
        description: 'H0：水平橫跨在 V1 上，交叉點距離 H0 邊緣為 b。',
        activeBeams: ['green'],
        phase: 1
    },
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1'],
        title: '【第一階段】步驟 3：放置頂點 (V0)',
        description: 'V0：垂直放在 H0 正中央「上方」（中間交叉 → 垂直壓水平）。',
        activeBeams: ['red'],
        phase: 1
    },
    // 第二階段：第一層腳
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2'],
        title: '【第二階段】步驟 4：插入右腳 (H1-R)',
        description: 'H1-R：內側末端壓在 V0「上方」（末端交叉），中段穿過 V1「下方」（中間交叉）。',
        activeBeams: ['blue'],
        phase: 2
    },
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2', 'purple1', 'purple2'],
        title: '【第二階段】步驟 5：插入左腳 (H1-L)',
        description: 'H1-L：同 H1-R，但因水平棍互斥原則，放在 P2 位置（H1-R 在 P1）。',
        activeBeams: ['purple'],
        phase: 2
    },
    // 第三階段：第二層擴展
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2', 'purple1', 'purple2', 'orange1', 'orange2'],
        title: '【第三階段】步驟 6：加入第二層支點 (V2)',
        description: 'V2：放在 H1 外側末端「下方」，成為第二層支點。',
        activeBeams: ['orange'],
        phase: 3
    },
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2', 'purple1', 'purple2', 'orange1', 'orange2', 'cyan1', 'cyan2'],
        title: '【第三階段】步驟 7：插入第二層右腳 (H2-R)',
        description: 'H2-R：內側壓在 V1「上方」（末端交叉），外側穿過 V2「下方」（中間交叉）。',
        activeBeams: ['cyan'],
        phase: 3
    },
    {
        beams: ['pink1', 'pink2', 'green1', 'green2', 'red1', 'blue1', 'blue2', 'purple1', 'purple2', 'orange1', 'orange2', 'cyan1', 'cyan2', 'yellow1', 'yellow2'],
        title: '【第三階段】步驟 8：插入第二層左腳 (H2-L)',
        description: 'H2-L：同 H2-R，放在 P4 位置。H2 取代 H1 成為新的「腳」，V2 變成新支點。',
        activeBeams: ['yellow'],
        phase: 3
    }
];
