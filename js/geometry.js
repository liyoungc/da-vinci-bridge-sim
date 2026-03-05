import { COLORS, COLORS_DARK } from './constants.js';

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

// 核心幾何計算邏輯
export function getTopViewBeams(cx, cy, scale, params, colors = COLORS_DARK) {
    const pxPerCm = scale * 12;

    const x = params.x * pxPerCm;     // 棍長
    const y = params.y * pxPerCm;     // 棍寬
    const a = (params.h + params.y / 2) * pxPerCm;  // 交叉點到水平棍邊緣 = h + y/2
    const b = (params.v + params.y / 2) * pxPerCm;  // 交叉點到垂直棍邊緣 = v + y/2
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

    // Helper: Simple 1D overlap check (Moved up for H2-R usage)
    // "Real world" check: Do the beams physically collide in this P-slot?
    // Tolerance: allow up to N cm overlap without blocking (adjustable)
    const tolerancePx = (params.tolerance || 1) * pxPerCm;
    const checkOverlap = (centerA, centerB, len) => {
        // Only block if overlap exceeds 1cm tolerance
        return Math.abs(centerA - centerB) < (len - tolerancePx);
    };
    // Helper: compute overlap amount in pixels (positive = overlapping)
    const computeOverlapPx = (centerA, centerB, len) => {
        const overlap = len - Math.abs(centerA - centerB);
        return overlap > 0 ? overlap : 0;
    };

    // H2-R 預設在 P3 (右側)
    // 必須檢查是否跟左側的 H1-L (在 P3) 發生重疊
    let blockedFromL = [];

    // Check H0 (P1)
    if (checkOverlap(cx, H2R_X, x)) blockedFromL.push(1);

    // Check H1-L (P3 usually)
    // H1-L X coord is H1L_X
    if (checkOverlap(H1L_X, H2R_X, x)) blockedFromL.push(H1L_P);

    // Combine with Right occupied list
    let checkList_R = [...new Set([...occupiedPs_R, ...blockedFromL])];

    let H2R_P = findAvailableP(3, checkList_R, params.pMode, params.Pmax);
    if (H2R_P === null) {
        buildError = 'H2-R 無法放置：P 位置不足';
        H2R_P = 3;
    }
    occupiedPs_R.push(H2R_P);

    // H2-L 預設在 P3 (左側)
    // 如果發生重疊，H2-L 必須同時檢查被 "真正重疊到" 的右側 P 位置
    let blockedFromR = [];

    // Check H0 (P1) - H0 is at cx (Center)
    // H0 always blocks? H0 is effectively width x centered at cx.
    if (checkOverlap(cx, H2L_X, x)) blockedFromR.push(1);

    // Check H1-R (P2)
    if (checkOverlap(H1R_X, H2L_X, x)) blockedFromR.push(H1R_P);

    // Check H2-R (H2R_P)
    if (checkOverlap(H2R_X, H2L_X, x)) blockedFromR.push(H2R_P);

    // Combine with Left occupied list
    // Use Set to avoid duplicates
    let checkList_L = [...new Set([...occupiedPs_L, ...blockedFromR])];

    let H2L_P = findAvailableP(3, checkList_L, params.pMode, params.Pmax);
    if (H2L_P === null) {
        buildError = 'H2-L 無法放置：P 位置不足';
        H2L_P = 4;
    }
    occupiedPs_L.push(H2L_P);

    // 3.5. Collect overlap highlights for rendering
    const overlapHighlights = [];
    const beamKeyMap = { 'H0': 'green1', 'H1R': 'blue1', 'H1L': 'purple1', 'H2R': 'cyan1', 'H2L': 'yellow1' };
    const overlapPairs = [
        { aName: 'H2R', aX: H2R_X, aP: H2R_P, bName: 'H0',  bX: cx,    bP: 1 },
        { aName: 'H2R', aX: H2R_X, aP: H2R_P, bName: 'H1L', bX: H1L_X, bP: H1L_P },
        { aName: 'H2L', aX: H2L_X, aP: H2L_P, bName: 'H0',  bX: cx,    bP: 1 },
        { aName: 'H2L', aX: H2L_X, aP: H2L_P, bName: 'H1R', bX: H1R_X, bP: H1R_P },
        { aName: 'H2L', aX: H2L_X, aP: H2L_P, bName: 'H2R', bX: H2R_X, bP: H2R_P },
    ];
    for (const pair of overlapPairs) {
        if (pair.aP === pair.bP) {
            const overlapPx = computeOverlapPx(pair.aX, pair.bX, x);
            if (overlapPx > 0 && overlapPx <= tolerancePx) {
                const overlapCenterX = (pair.aX + pair.bX) / 2;
                const pY_top = H0_top_Y + (pair.aP - 1) * (y + s);
                const pY_bot = H0_bot_Y - (pair.aP - 1) * (y + s);
                overlapHighlights.push({
                    x: overlapCenterX,
                    topY: pY_top,
                    botY: pY_bot,
                    width: overlapPx,
                    amountMm: (overlapPx / pxPerCm * 10).toFixed(1),
                    relatedBeams: [beamKeyMap[pair.aName], beamKeyMap[pair.bName]]
                });
            }
        }
    }

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
    beams.green1 = rect(colors.H0, cx, H0_top_Y, x, y, 10, 'green1', 'horizontal');
    beams.green2 = rect(colors.H0, cx, H0_bot_Y, x, y, 10, 'green2', 'horizontal');

    // H0 末端 patch (壓在 V1 上方)
    beams.green1_tipL = rect(colors.H0, V1_left_X, H0_top_Y, y, y, 60, 'green1', 'horizontal-tip');
    beams.green1_tipR = rect(colors.H0, V1_right_X, H0_top_Y, y, y, 60, 'green1', 'horizontal-tip');
    beams.green2_tipL = rect(colors.H0, V1_left_X, H0_bot_Y, y, y, 60, 'green2', 'horizontal-tip');
    beams.green2_tipR = rect(colors.H0, V1_right_X, H0_bot_Y, y, y, 60, 'green2', 'horizontal-tip');

    // V0 (紅色頂點)
    beams.red1 = rect(colors.V0, V0_X, cy, y, x, 20, 'red1', 'vertical');

    // H1-R (藍色右腳)
    beams.blue1 = rect(colors.H1R, H1R_X, H1R_top_Y, x, y, 15, 'blue1', 'horizontal');
    beams.blue2 = rect(colors.H1R, H1R_X, H1R_bot_Y, x, y, 15, 'blue2', 'horizontal');
    // Patch
    beams.blue1_tipV0 = rect(colors.H1R, V0_X, H1R_top_Y, y, y, 25, 'blue1', 'horizontal-tip');
    beams.blue2_tipV0 = rect(colors.H1R, V0_X, H1R_bot_Y, y, y, 25, 'blue2', 'horizontal-tip');

    // H1-L (紫色左腳)
    beams.purple1 = rect(colors.H1L, H1L_X, H1L_top_Y, x, y, 15, 'purple1', 'horizontal');
    beams.purple2 = rect(colors.H1L, H1L_X, H1L_bot_Y, x, y, 15, 'purple2', 'horizontal');
    // Patch
    beams.purple1_tipV0 = rect(colors.H1L, V0_X, H1L_top_Y, y, y, 25, 'purple1', 'horizontal-tip');
    beams.purple2_tipV0 = rect(colors.H1L, V0_X, H1L_bot_Y, y, y, 25, 'purple2', 'horizontal-tip');

    // V1 (粉紅色支點)
    beams.pink1 = rect(colors.V1, V1_left_X, cy, y, x, 50, 'pink1', 'vertical');
    beams.pink2 = rect(colors.V1, V1_right_X, cy, y, x, 50, 'pink2', 'vertical');

    // ===== 第二層 =====
    // V2 (橙色第二層支點)
    beams.orange1 = rect(colors.V2, V2_left_X, cy, y, x, 90, 'orange1', 'vertical');
    beams.orange2 = rect(colors.V2, V2_right_X, cy, y, x, 90, 'orange2', 'vertical');

    // H1 外側末端 patch (壓 V2)
    beams.blue1_tipV2 = rect(colors.H1R, V2_right_X, H1R_top_Y, y, y, 100, 'blue1', 'horizontal-tip');
    beams.blue2_tipV2 = rect(colors.H1R, V2_right_X, H1R_bot_Y, y, y, 100, 'blue2', 'horizontal-tip');
    beams.purple1_tipV2 = rect(colors.H1L, V2_left_X, H1L_top_Y, y, y, 100, 'purple1', 'horizontal-tip');
    beams.purple2_tipV2 = rect(colors.H1L, V2_left_X, H1L_bot_Y, y, y, 100, 'purple2', 'horizontal-tip');

    // H2-R (青色第二層右腳)
    beams.cyan1 = rect(colors.H2R, H2R_X, H2R_top_Y, x, y, 40, 'cyan1', 'horizontal');
    beams.cyan2 = rect(colors.H2R, H2R_X, H2R_bot_Y, x, y, 40, 'cyan2', 'horizontal');
    // Patch 壓 V1
    beams.cyan1_tipV1 = rect(colors.H2R, V1_right_X, H2R_top_Y, y, y, 55, 'cyan1', 'horizontal-tip');
    beams.cyan2_tipV1 = rect(colors.H2R, V1_right_X, H2R_bot_Y, y, y, 55, 'cyan2', 'horizontal-tip');

    // H2-L (黃色第二層左腳)
    beams.yellow1 = rect(colors.H2L, H2L_X, H2L_top_Y, x, y, 40, 'yellow1', 'horizontal');
    beams.yellow2 = rect(colors.H2L, H2L_X, H2L_bot_Y, x, y, 40, 'yellow2', 'horizontal');
    // Patch 壓 V1
    beams.yellow1_tipV1 = rect(colors.H2L, V1_left_X, H2L_top_Y, y, y, 55, 'yellow1', 'horizontal-tip');
    beams.yellow2_tipV1 = rect(colors.H2L, V1_left_X, H2L_bot_Y, y, y, 55, 'yellow2', 'horizontal-tip');

    // ===== 互鎖環分析 =====
    // 定義所有 V 棍的 X 位置（相對於 cx）
    const V_X = {
        V2L: V2_left_X,
        V1L: V1_left_X,
        V0: cx,
        V1R: V1_right_X,
        V2R: V2_right_X
    };

    // 定義所有 H 棍的中心 X 和覆蓋範圍
    const H_info = {
        H0:  { center: cx,    left: cx - x / 2,    right: cx + x / 2 },
        H1R: { center: H1R_X, left: H1R_X - x / 2, right: H1R_X + x / 2 },
        H1L: { center: H1L_X, left: H1L_X - x / 2, right: H1L_X + x / 2 },
        H2R: { center: H2R_X, left: H2R_X - x / 2, right: H2R_X + x / 2 },
        H2L: { center: H2L_X, left: H2L_X - x / 2, right: H2L_X + x / 2 }
    };

    // 每根 H 棍的「主場 V 棍」：H 棍中心對齊的 V 棍
    // 編織規則：在主場 V 棍處 V 壓 H（V_over），其他交叉處 H 壓 V（H_over）
    const homeV = {
        H0:  'V0',
        H1R: 'V1R',
        H1L: 'V1L',
        H2R: 'V2R',
        H2L: 'V2L'
    };

    function getCrossingType(hName, vName) {
        const hBar = H_info[hName];
        const vX = V_X[vName];
        if (vX === undefined || !hBar) return null;

        // 檢查 H 棍是否覆蓋 V 棍位置
        if (vX < hBar.left - y / 2 || vX > hBar.right + y / 2) return null; // 不交叉

        // 編織邏輯：主場 V 棍壓在 H 上方，非主場則 H 壓在 V 上方
        if (homeV[hName] === vName) {
            return 'V_over'; // 主場：V 在上
        } else {
            return 'H_over'; // 非主場：H 在上
        }
    }

    // 相鄰 V 棍對
    const adjacentVPairs = params.L >= 2
        ? [['V2L', 'V1L'], ['V1L', 'V0'], ['V0', 'V1R'], ['V1R', 'V2R']]
        : [['V1L', 'V0'], ['V0', 'V1R']];

    const hNames = params.L >= 2
        ? ['H0', 'H1R', 'H1L', 'H2R', 'H2L']
        : ['H0', 'H1R', 'H1L'];

    let fullInterlockCount = 0;
    let halfInterlockCount = 0;
    const interlockRings = [];  // 互鎖環位置資料，用於繪製

    // H 棍的 Y 座標（上半 / 下半）
    const H_Y = {
        H0:  { top: H0_top_Y,  bot: H0_bot_Y },
        H1R: { top: H1R_top_Y, bot: H1R_bot_Y },
        H1L: { top: H1L_top_Y, bot: H1L_bot_Y },
        H2R: { top: H2R_top_Y, bot: H2R_bot_Y },
        H2L: { top: H2L_top_Y, bot: H2L_bot_Y }
    };

    for (const [vLeft, vRight] of adjacentVPairs) {
        if (V_X[vLeft] === undefined || V_X[vRight] === undefined) continue;

        // 找出同時跨越這兩根 V 棍的所有 H 棍
        const crossingHBars = [];
        for (const hName of hNames) {
            const typeL = getCrossingType(hName, vLeft);
            const typeR = getCrossingType(hName, vRight);
            if (typeL && typeR) {
                crossingHBars.push({ name: hName, left: typeL, right: typeR });
            }
        }

        // 每對 H 棍檢查是否形成互鎖環（棋盤格式交叉）
        for (let i = 0; i < crossingHBars.length; i++) {
            for (let j = i + 1; j < crossingHBars.length; j++) {
                const h1 = crossingHBars[i];
                const h2 = crossingHBars[j];

                // 四個交叉點
                const corners = [h1.left, h1.right, h2.left, h2.right];
                const hOverCount = corners.filter(c => c === 'H_over').length;

                let ringType = null;
                if (hOverCount === 2 && h1.left !== h1.right && h2.left !== h2.right
                    && h1.left !== h2.left) {
                    ringType = 'full';
                    fullInterlockCount++;
                } else if (hOverCount === 1 || hOverCount === 3) {
                    ringType = 'half';
                    halfInterlockCount++;
                }

                if (ringType) {
                    const vLeftX = V_X[vLeft];
                    const vRightX = V_X[vRight];
                    const h1Y = H_Y[h1.name];
                    const h2Y = H_Y[h2.name];
                    if (h1Y && h2Y) {
                        // 上半部分環
                        interlockRings.push({
                            type: ringType,
                            vLeftX, vRightX,
                            hTopY: Math.min(h1Y.top, h2Y.top),
                            hBotY: Math.max(h1Y.top, h2Y.top),
                            hBars: [h1.name, h2.name],
                            vBars: [vLeft, vRight],
                            group: 'top'
                        });
                        // 下半部分環
                        interlockRings.push({
                            type: ringType,
                            vLeftX, vRightX,
                            hTopY: Math.min(h1Y.bot, h2Y.bot),
                            hBotY: Math.max(h1Y.bot, h2Y.bot),
                            hBars: [h1.name, h2.name],
                            vBars: [vLeft, vRight],
                            group: 'bottom'
                        });
                    }
                }
            }
        }
    }

    // 頂部和底部各有一組（乘以 2）
    fullInterlockCount *= 2;
    halfInterlockCount *= 2;

    const topViewMetrics = {
        fullInterlockCount,
        halfInterlockCount,
        overlapCount: overlapHighlights.length
    };

    return { beams, buildError, overlapHighlights, interlockRings, topViewMetrics };
}

export function getSideViewBeams(cx, cy, scale, params, colors = COLORS_DARK) {
    const pxPerCm = scale * 12;
    const L = params.x * pxPerCm;
    const W = params.y * pxPerCm;
    const T = params.z * pxPerCm;
    const a = (params.h + params.y / 2) * pxPerCm;  // a = h + y/2

    // Center V0 vertically at cy
    // yV0 = cy
    // Relationships:
    // yH0 = yV0 + T
    // yV1 = yH0 + T = yV0 + 2T
    // groundY = yV1 + T/2 = yV0 + 2.5T
    // So if yV0 is cy, then groundY = cy + 2.5 * T
    const groundY = cy + 2.5 * T;

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

    const distToCenter = L / 2 - a - W / 2;
    const cosH1 = Math.cos(H1_angle);
    const sinH1 = Math.sin(H1_angle);
    const perpX = sinH1;
    const perpY = -cosH1;

    const H1R_Center = {
        x: P1.x + (distToCenter * cosH1) + (T / 2 * perpX),
        y: P1.y + (distToCenter * sinH1) + (T / 2 * perpY)
    };

    const H1R = { x: H1R_Center.x, y: H1R_Center.y, angle: H1_angle, w: L, h: T };

    // Define Level 2 variables in outer scope so they are accessible for mechanics
    let H2R_Center = null;
    let H2_angle = 0;

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
    H2_angle = directAngle2 + Math.asin(Math.min(1, T / dist2)); // Assign to outer var

    const cosH2 = Math.cos(H2_angle);
    const sinH2 = Math.sin(H2_angle);
    const perpX2 = sinH2;
    const perpY2 = -cosH2;

    H2R_Center = { // Assign to outer var
        x: P3.x + (distToCenter * cosH2) + (T / 2 * perpX2),
        y: P3.y + (distToCenter * sinH2) + (T / 2 * perpY2)
    };

    // --- Step 5: Output & Mirroring ---
    const beams = {
        // Layer 0
        red1: { ...V0, color: colors.V0, zIndex: 100 },
        green1: { color: colors.H0, x: cx, y: yH0, w: L, h: T, zIndex: 90 },
        pink1: { color: colors.V1, x: V1_left_X, y: yV1, w: W, h: T, angle: 0, zIndex: 80 },
        pink2: { ...V1R, color: colors.V1, zIndex: 80 },
        // Layer 1
        blue1: { ...H1R, color: colors.H1R, zIndex: 70 },
        purple1: { x: cx - (H1R.x - cx), y: H1R.y, angle: -H1R.angle, w: L, h: T, color: COLORS.H1L, zIndex: 70 },
    };

    if (params.L >= 2) {
        beams.orange1 = { x: cx - (V2R.x - cx), y: V2R.y, angle: -V2R.angle, w: W, h: T, color: COLORS.V2, zIndex: 60 };
        beams.orange2 = { ...V2R, color: COLORS.V2, zIndex: 60 };

        const H2R = { x: H2R_Center.x, y: H2R_Center.y, angle: H2_angle, w: L, h: T };
        beams.cyan1 = { ...H2R, color: COLORS.H2R, zIndex: 50 };
        beams.yellow1 = { x: cx - (H2R.x - cx), y: H2R.y, angle: -H2R.angle, w: L, h: T, color: COLORS.H2L, zIndex: 50 };
    }

    // Calculate True Height (Top of V0 to Lowest Point of Legs)
    const topY = yV0 - T / 2;
    let lowestY = groundY; // Default to center stack ground
    let spanX_R = V1_right_X; // Default to V1 span

    // Get lowest point of active legs
    if (params.L >= 2) {
        // H2R (and H2L) are the lowest.
        lowestY = H2R_Center.y + (L / 2 * Math.sin(H2_angle)) + (T / 2 * Math.cos(H2_angle));
        spanX_R = H2R_Center.x + (L / 2 * Math.cos(H2_angle)) - (T / 2 * Math.sin(H2_angle));
    } else {
        // Lowest Y for H1R
        lowestY = H1R_Center.y + (L / 2 * Math.sin(H1_angle)) + (T / 2 * Math.cos(H1_angle));
        spanX_R = H1R_Center.x + (L / 2 * Math.cos(H1_angle)) - (T / 2 * Math.sin(H1_angle));
    }

    const trueSpan = (spanX_R - cx) * 2;

    // Use the active leg angle based on layer count
    const activeLegAngle = params.L >= 2 ? H2_angle : H1_angle;

    const mechanics = {
        span: trueSpan / pxPerCm,
        angle: Math.abs(activeLegAngle * 180 / Math.PI),
        height: (lowestY - topY) / pxPerCm
    };

    return { beams, mechanics };
}

// 純計算：結構關鍵指標（不需要 canvas）
export function computeStructuralMetrics(params) {
    const x = params.x;
    const y = params.y;
    const z = params.z;
    const h = params.h;
    const v = params.v;
    const a = h + y / 2;
    const b = v + y / 2;

    // V1 間距（橋墩寬度）
    const V1_spacing = x - 2 * a;

    // V1-V2 相鄰垂直棍距離（俯視圖 X 軸方向）
    const V1_V2_distance = params.L >= 2 ? (x / 2 - a - y / 2) : null;

    // 側視圖力學（簡化計算，不需要 canvas 座標）
    const effL = x - 2 * a;
    const stackHeight = 2 * z;
    const liftAngle = Math.asin(Math.min(1, stackHeight / effL));
    const V1_span = effL * Math.cos(liftAngle);

    // H1 角度
    const P1x = y / 2;
    const P1y = -(z / 2);
    const P2x = V1_span / 2 - y / 2;
    const P2y = 2 * z + z / 2;
    const dx = P2x - P1x;
    const dy = P2y - P1y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const directAngle = Math.atan2(dy, dx);
    const offsetAngle = Math.asin(Math.min(1, z / dist));
    const H1_angle = directAngle + offsetAngle;

    let activeLegAngle = H1_angle;

    if (params.L >= 2) {
        // 簡化 H2 角度計算
        const distToCenter = x / 2 - a - y / 2;
        const cosH1 = Math.cos(H1_angle);
        const sinH1 = Math.sin(H1_angle);

        // V2 anchor 從 H1 外端
        const H1_outerBot_x = P1x + (x / 2) * cosH1 - (z / 2) * sinH1;
        const H1_outerBot_y = P1y + (x / 2) * sinH1 + (z / 2) * cosH1;
        const V2_anchor_x = H1_outerBot_x - a * cosH1;
        const V2_anchor_y = H1_outerBot_y - a * sinH1;

        // P3 (H2 inner anchor at V1)
        const P3x = V1_span / 2 + y / 2;
        const P3y = 2 * z - z / 2;

        // V2 inner bottom corner
        const normX = -sinH1;
        const normY = cosH1;
        const V2_cx = V2_anchor_x + (z / 2) * normX;
        const V2_cy = V2_anchor_y + (z / 2) * normY;
        const cosV2 = Math.cos(H1_angle);
        const sinV2 = Math.sin(H1_angle);
        const P4x = V2_cx - (y / 2) * cosV2 - (z / 2) * sinV2;
        const P4y = V2_cy - (y / 2) * sinV2 + (z / 2) * cosV2;

        const dx2 = P4x - P3x;
        const dy2 = P4y - P3y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const directAngle2 = Math.atan2(dy2, dx2);
        const H2_angle = directAngle2 + Math.asin(Math.min(1, z / dist2));
        activeLegAngle = H2_angle;
    }

    // 取銳角（與水平線的夾角），角度可能在第二象限（>90°）
    let slopeAngleRad = Math.abs(activeLegAngle) % Math.PI;
    if (slopeAngleRad > Math.PI / 2) slopeAngleRad = Math.PI - slopeAngleRad;
    const legAngleDeg = slopeAngleRad * 180 / Math.PI;
    const legAngleRad = slopeAngleRad;

    // 需要摩擦係數 μ_min = tan(θ)，θ 為腿與水平面的銳角
    const requiredFriction = Math.tan(legAngleRad);

    // h/x 互鎖參與比率
    const interlockRatio = (2 * a) / x;

    // 俯視圖指標（呼叫 top view 計算）
    const topResult = getTopViewBeams(0, 0, 1, params);
    const topMetrics = topResult.topViewMetrics || {};

    // 側視圖跨距和高度（簡化）
    // 使用 dummy canvas 參數來取得 mechanics
    const sideResult = getSideViewBeams(0, 0, 1, params);
    const mechanics = sideResult.mechanics || {};

    // 高跨比
    const heightSpanRatio = mechanics.span > 0 ? mechanics.height / mechanics.span : 0;

    return {
        // 基本幾何
        V1_spacing: parseFloat(V1_spacing.toFixed(2)),
        V1_V2_distance: V1_V2_distance !== null ? parseFloat(V1_V2_distance.toFixed(2)) : null,

        // 側視圖力學
        span: mechanics.span,
        height: mechanics.height,
        legAngle: parseFloat(legAngleDeg.toFixed(2)),
        heightSpanRatio: parseFloat(heightSpanRatio.toFixed(3)),

        // 穩定性指標
        requiredFriction: parseFloat(requiredFriction.toFixed(3)),
        interlockRatio: parseFloat(interlockRatio.toFixed(3)),

        // 互鎖環分析
        fullInterlockCount: topMetrics.fullInterlockCount || 0,
        halfInterlockCount: topMetrics.halfInterlockCount || 0,
        overlapCount: topMetrics.overlapCount || 0,

        // 建造狀態
        buildError: topResult.buildError || null,

        // 輸入參數
        params: { x, y, z, h, v, s: params.s, L: params.L, Pmax: params.Pmax, pMode: params.pMode, tolerance: params.tolerance }
    };
}
