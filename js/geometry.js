import { COLORS } from './constants.js';

// Helper: Calculate beam corners
export function getBeamCorners(beam) {
    const { x, y, angle, w, h } = beam;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hw = w / 2; // Half-Width (Length direction)
    const hh = h / 2; // Half-Height (Thickness direction)

    // Relative offsets for corners
    // 0: Top-Left (Inner-Top), 1: Top-Right (Outer-Top)
    // 2: Bot-Right (Outer-Bot), 3: Bot-Left (Inner-Bot)
    return {
        innerTop: { x: x - hw * cos + hh * sin, y: y - hw * sin - hh * cos },
        outerTop: { x: x + hw * cos + hh * sin, y: y + hw * sin - hh * cos },
        outerBot: { x: x + hw * cos - hh * sin, y: y + hw * sin + hh * cos },
        innerBot: { x: x - hw * cos - hh * sin, y: y - hw * sin + hh * cos }
    };
}

// Helper: Calculate angle for attached V beam
export function calculateAttachedV(parentH, L, T, a, side) {
    // V 角度 = H 角度 + 90° (Canvas Y 向下)
    const vAngle = parentH.angle + Math.PI / 2;

    // 錨點：H 下緣，距外端 a
    const cosP = Math.cos(parentH.angle);
    const sinP = Math.sin(parentH.angle);

    // 沿 H 方向移動 (L/2 - a)，再往下緣移動 T/2
    const anchorX = parentH.x + (L / 2 - a) * cosP * side - (T / 2) * sinP;
    const anchorY = parentH.y + (L / 2 - a) * sinP * side + (T / 2) * cosP;

    // V 中心：從錨點沿 V 方向移動 L/2
    const cosV = Math.cos(vAngle);
    const sinV = Math.sin(vAngle);

    return {
        x: anchorX + (L / 2) * cosV,
        y: anchorY + (L / 2) * sinV,
        angle: vAngle,
        w: L, h: T
    };
}

// Find available P position (Y-axis slot)
export function findAvailableP(currentP, occupiedPs, mode, Pmax) {
    if (!occupiedPs.includes(currentP)) return currentP;

    if (mode === 'cis') {
        // 從 currentP+1 往 Pmax 找，找不到再從 P1 開始
        for (let p = currentP + 1; p <= Pmax; p++) {
            if (!occupiedPs.includes(p)) return p;
        }
        for (let p = 1; p < currentP; p++) {
            if (!occupiedPs.includes(p)) return p;
        }
    } else { // trans
        // 從 currentP-1 往 P1 找，找不到再從 Pmax 開始
        for (let p = currentP - 1; p >= 1; p--) {
            if (!occupiedPs.includes(p)) return p;
        }
        for (let p = Pmax; p > currentP; p--) {
            if (!occupiedPs.includes(p)) return p;
        }
    }
    return null; // 找不到可用位置
}

export function getTopViewBeams(cx, cy, scale, params) {
    const pxPerCm = scale * 12;

    const x = params.x * pxPerCm;     // 棍長
    const y = params.y * pxPerCm;     // 棍寬
    const a = params.a * pxPerCm;     // 水平棍邊緣到垂直棍交叉中點的距離
    const b = params.b * pxPerCm;     // 垂直棍交叉中點到自己外緣的距離
    const s = params.s * pxPerCm;     // 間隙

    // ===== 幾何計算 =====
    // V1 間距 = x - 2a
    const V1_spacing = x - 2 * a;
    const V1_left_X = cx - V1_spacing / 2;
    const V1_right_X = cx + V1_spacing / 2;

    // H0 間距 (上下) = x - 2b
    const H0_spacing = x - 2 * b;
    const H0_top_Y = cy - H0_spacing / 2;
    const H0_bot_Y = cy + H0_spacing / 2;

    // V0 在正中央
    const V0_X = cx;

    // 1. 先計算 X 軸位置 (用於碰撞檢測)
    const H1R_X = cx + (x / 2 - a - y / 2);
    const H1L_X = cx - (x / 2 - a - y / 2);

    const V2_right_X = H1R_X + x / 2 - a;
    const V2_left_X = H1L_X - x / 2 + a;

    const H2R_X = V2_right_X;
    const H2L_X = V2_left_X;

    // 2. 檢測 H2 物理重疊
    const H2R_Left_Edge = H2R_X - x / 2;
    const H2L_Right_Edge = H2L_X + x / 2;

    // Added buffer: if gap is small (less than 50% of length), consider it overlapping
    const doesH2Overlap = (H2R_Left_Edge - x * 0.5) < H2L_Right_Edge;

    // 3. 分配 P 位置 (Y軸) (使用動態 P 位置系統 - 左右獨立)
    const occupiedPs_R = [1];
    const occupiedPs_L = [1];
    let buildError = null;

    // H1-R 預設在 P2
    const H1R_P = 2;
    occupiedPs_R.push(H1R_P);

    // H1-L 必須在 P3
    const H1L_P = 3;
    occupiedPs_L.push(H1L_P);

    // H2-R 預設在 P3 (右側)
    let H2R_P = findAvailableP(3, occupiedPs_R, params.pMode, params.Pmax);
    if (H2R_P === null) {
        buildError = 'H2-R 無法放置：P 位置不足';
        H2R_P = 3;
    }
    occupiedPs_R.push(H2R_P);

    // H2-L 預設在 P3 (左側)
    // 如果發生重疊，H2-L 必須同時檢查被 H2-R 佔用的位置
    let checkList_L = doesH2Overlap ? [...occupiedPs_L, ...occupiedPs_R] : occupiedPs_L;

    let H2L_P = findAvailableP(3, checkList_L, params.pMode, params.Pmax);
    if (H2L_P === null) {
        buildError = 'H2-L 無法放置：P 位置不足';
        H2L_P = 4;
    }
    occupiedPs_L.push(H2L_P);

    // 4. 計算 Y 軸座標
    const H1R_top_Y = H0_top_Y + (H1R_P - 1) * (y + s);
    const H1R_bot_Y = H0_bot_Y - (H1R_P - 1) * (y + s);

    const H1L_top_Y = H0_top_Y + (H1L_P - 1) * (y + s);
    const H1L_bot_Y = H0_bot_Y - (H1L_P - 1) * (y + s);

    const H2R_top_Y = H0_top_Y + (H2R_P - 1) * (y + s);
    const H2R_bot_Y = H0_bot_Y - (H2R_P - 1) * (y + s);
    const H2L_top_Y = H0_top_Y + (H2L_P - 1) * (y + s);
    const H2L_bot_Y = H0_bot_Y - (H2L_P - 1) * (y + s);

    // ===== 建立構件 =====
    const rect = (color, x, y, w, h, z, parent, beamType) => ({
        color, x, y, w, h, zIndex: z, parent, beamType
    });

    let beams = {};

    // H0 (綠色橫樑) - 基礎
    beams.green1 = rect(COLORS.H0, cx, H0_top_Y, x, y, 10, 'green1', 'horizontal');
    beams.green2 = rect(COLORS.H0, cx, H0_bot_Y, x, y, 10, 'green2', 'horizontal');

    // H0 末端 patch (壓在 V1 上方)
    beams.green1_tipL = rect(COLORS.H0, V1_left_X, H0_top_Y, y, y, 60, 'green1', 'horizontal-tip');
    beams.green1_tipR = rect(COLORS.H0, V1_right_X, H0_top_Y, y, y, 60, 'green1', 'horizontal-tip');
    beams.green2_tipL = rect(COLORS.H0, V1_left_X, H0_bot_Y, y, y, 60, 'green2', 'horizontal-tip');
    beams.green2_tipR = rect(COLORS.H0, V1_right_X, H0_bot_Y, y, y, 60, 'green2', 'horizontal-tip');

    // V0 (紅色頂點)
    beams.red1 = rect(COLORS.V0, V0_X, cy, y, x, 20, 'red1', 'vertical');

    // H1-R (藍色右腳)
    beams.blue1 = rect(COLORS.H1R, H1R_X, H1R_top_Y, x, y, 15, 'blue1', 'horizontal');
    beams.blue2 = rect(COLORS.H1R, H1R_X, H1R_bot_Y, x, y, 15, 'blue2', 'horizontal');
    // Patch
    beams.blue1_tipV0 = rect(COLORS.H1R, V0_X, H1R_top_Y, y, y, 25, 'blue1', 'horizontal-tip');
    beams.blue2_tipV0 = rect(COLORS.H1R, V0_X, H1R_bot_Y, y, y, 25, 'blue2', 'horizontal-tip');

    // H1-L (紫色左腳)
    beams.purple1 = rect(COLORS.H1L, H1L_X, H1L_top_Y, x, y, 15, 'purple1', 'horizontal');
    beams.purple2 = rect(COLORS.H1L, H1L_X, H1L_bot_Y, x, y, 15, 'purple2', 'horizontal');
    // Patch
    beams.purple1_tipV0 = rect(COLORS.H1L, V0_X, H1L_top_Y, y, y, 25, 'purple1', 'horizontal-tip');
    beams.purple2_tipV0 = rect(COLORS.H1L, V0_X, H1L_bot_Y, y, y, 25, 'purple2', 'horizontal-tip');

    // V1 (粉紅色支點)
    beams.pink1 = rect(COLORS.V1, V1_left_X, cy, y, x, 50, 'pink1', 'vertical');
    beams.pink2 = rect(COLORS.V1, V1_right_X, cy, y, x, 50, 'pink2', 'vertical');

    // ===== 第二層 =====
    // V2 (橙色第二層支點)
    beams.orange1 = rect(COLORS.V2, V2_left_X, cy, y, x, 90, 'orange1', 'vertical');
    beams.orange2 = rect(COLORS.V2, V2_right_X, cy, y, x, 90, 'orange2', 'vertical');

    // H1 外側末端 patch (壓 V2)
    beams.blue1_tipV2 = rect(COLORS.H1R, V2_right_X, H1R_top_Y, y, y, 100, 'blue1', 'horizontal-tip');
    beams.blue2_tipV2 = rect(COLORS.H1R, V2_right_X, H1R_bot_Y, y, y, 100, 'blue2', 'horizontal-tip');
    beams.purple1_tipV2 = rect(COLORS.H1L, V2_left_X, H1L_top_Y, y, y, 100, 'purple1', 'horizontal-tip');
    beams.purple2_tipV2 = rect(COLORS.H1L, V2_left_X, H1L_bot_Y, y, y, 100, 'purple2', 'horizontal-tip');

    // H2-R (青色第二層右腳)
    beams.cyan1 = rect(COLORS.H2R, H2R_X, H2R_top_Y, x, y, 40, 'cyan1', 'horizontal');
    beams.cyan2 = rect(COLORS.H2R, H2R_X, H2R_bot_Y, x, y, 40, 'cyan2', 'horizontal');
    // Patch 壓 V1
    beams.cyan1_tipV1 = rect(COLORS.H2R, V1_right_X, H2R_top_Y, y, y, 55, 'cyan1', 'horizontal-tip');
    beams.cyan2_tipV1 = rect(COLORS.H2R, V1_right_X, H2R_bot_Y, y, y, 55, 'cyan2', 'horizontal-tip');

    // H2-L (黃色第二層左腳)
    beams.yellow1 = rect(COLORS.H2L, H2L_X, H2L_top_Y, x, y, 40, 'yellow1', 'horizontal');
    beams.yellow2 = rect(COLORS.H2L, H2L_X, H2L_bot_Y, x, y, 40, 'yellow2', 'horizontal');
    // Patch 壓 V1
    beams.yellow1_tipV1 = rect(COLORS.H2L, V1_left_X, H2L_top_Y, y, y, 55, 'yellow1', 'horizontal-tip');
    beams.yellow2_tipV1 = rect(COLORS.H2L, V1_left_X, H2L_bot_Y, y, y, 55, 'yellow2', 'horizontal-tip');

    return { beams, buildError };
}

export function getSideViewBeams(cx, cy, scale, params) {
    const pxPerCm = scale * 12;
    const L = params.x * pxPerCm;
    const W = params.y * pxPerCm;
    const T = params.z * pxPerCm;
    const a = params.a * pxPerCm;

    const groundY = cy + 180;

    // --- Step 1: Establish Base Coordinates (Layer 0) ---
    const effL = L - 2 * a;
    const stackHeight = 2 * T;
    const liftAngle = Math.asin(Math.min(1, stackHeight / effL));

    const V1_span = effL * Math.cos(liftAngle);
    const V1_right_X = cx + V1_span / 2;
    const V1_left_X = cx - V1_span / 2;
    const yV1 = groundY - T / 2;
    const yV0 = yV1 - 2 * T;

    const V0 = { x: cx, y: yV0, angle: 0, w: W, h: T };
    const V1R = { x: V1_right_X, y: yV1, angle: 0, w: W, h: T };
    const yH0 = yV1 - T;

    // --- Step 2: Calculate H1-R (Right Leg) ---
    const P1 = { x: cx + W / 2, y: yV0 - T / 2 };
    const P2 = { x: V1_right_X - W / 2, y: yV1 + T / 2 };

    const dx = P2.x - P1.x;
    const dy = P2.y - P1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const directAngle = Math.atan2(dy, dx);
    const offsetAngle = Math.asin(Math.min(1, T / dist));
    const H1_angle = directAngle + offsetAngle;

    const distToCenter = L / 2 - a;
    const cosH1 = Math.cos(H1_angle);
    const sinH1 = Math.sin(H1_angle);
    const perpX = sinH1;
    const perpY = -cosH1;

    const H1R_Center = {
        x: P1.x + (distToCenter * cosH1) + (T / 2 * perpX),
        y: P1.y + (distToCenter * sinH1) + (T / 2 * perpY)
    };

    const H1R = { x: H1R_Center.x, y: H1R_Center.y, angle: H1_angle, w: L, h: T };

    // --- Step 3: Calculate V2 (Second Layer Pivot) ---
    const V2_angle = H1_angle;
    const H1_corners = getBeamCorners(H1R);
    const V2_Anchor = {
        x: H1_corners.outerBot.x - a * cosH1,
        y: H1_corners.outerBot.y - a * sinH1
    };

    const normX = -sinH1;
    const normY = cosH1;
    const V2R_Center = {
        x: V2_Anchor.x + (T / 2) * normX,
        y: V2_Anchor.y + (T / 2) * normY
    };
    const V2R = { x: V2R_Center.x, y: V2R_Center.y, angle: V2_angle, w: W, h: T };

    // --- Step 4: Calculate H2-R (Second Layer Leg) ---
    const P3 = { x: V1_right_X + W / 2, y: yV1 - T / 2 };
    const V2_corners = getBeamCorners(V2R);
    const P4 = V2_corners.innerBot;

    const dx2 = P4.x - P3.x;
    const dy2 = P4.y - P3.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const directAngle2 = Math.atan2(dy2, dx2);
    const H2_angle = directAngle2 + Math.asin(Math.min(1, T / dist2));

    const cosH2 = Math.cos(H2_angle);
    const sinH2 = Math.sin(H2_angle);
    const perpX2 = sinH2;
    const perpY2 = -cosH2;

    const H2R_Center = {
        x: P3.x + (distToCenter * cosH2) + (T / 2 * perpX2),
        y: P3.y + (distToCenter * sinH2) + (T / 2 * perpY2)
    };

    // --- Step 5: Output & Mirroring ---
    const beams = {
        // Layer 0
        red1: { ...V0, color: COLORS.V0, zIndex: 100 },
        green1: { color: COLORS.H0, x: cx, y: yH0, w: L, h: T, zIndex: 90 }, // Visual only
        pink1: { color: COLORS.V1, x: V1_left_X, y: yV1, w: W, h: T, angle: 0, zIndex: 80 },
        pink2: { ...V1R, color: COLORS.V1, zIndex: 80 },
        // Layer 1
        blue1: { ...H1R, color: COLORS.H1R, zIndex: 70 },
        purple1: { x: cx - (H1R.x - cx), y: H1R.y, angle: -H1R.angle, w: L, h: T, color: COLORS.H1L, zIndex: 70 },
    };

    if (params.L >= 2) { // Logic for 2nd layer if params.L set (actually controlled by maxLayers in Main)
        // We output beams regardless, Main decides which to show? 
        // No, current logic is strict. Let's just output them, Main filters by 'activeBeams'.

        beams.orange1 = { x: cx - (V2R.x - cx), y: V2R.y, angle: -V2R.angle, w: W, h: T, color: COLORS.V2, zIndex: 60 };
        beams.orange2 = { ...V2R, color: COLORS.V2, zIndex: 60 };

        const H2R = { x: H2R_Center.x, y: H2R_Center.y, angle: H2_angle, w: L, h: T };
        beams.cyan1 = { ...H2R, color: COLORS.H2R, zIndex: 50 };
        beams.yellow1 = { x: cx - (H2R.x - cx), y: H2R.y, angle: -H2R.angle, w: L, h: T, color: COLORS.H2L, zIndex: 50 };
    }

    const mechanics = {
        span: V1_span / pxPerCm,
        angle: Math.abs(H1_angle * 180 / Math.PI)
    };

    return { beams, mechanics };
}
