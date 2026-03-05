export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        // Canvas size usually updated via layout in Main, but good to track here
    }

    // 箭頭標註函數
    drawArrow(beam, label) {
        const { ctx } = this;
        ctx.save();

        // 箭頭起點往外延伸更多，避免與棍子重疊
        const arrowStartX = beam.x + 100;
        const arrowStartY = beam.y - 120;
        const arrowEndX = beam.x + 30; // 指向棍子中心附近
        const arrowEndY = beam.y - 30;

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Noto Sans TC", sans-serif';

        // 畫線
        ctx.beginPath();
        ctx.moveTo(arrowStartX, arrowStartY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();

        // 畫箭頭頭
        const headLen = 10;
        const angle = Math.atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(arrowEndX - headLen * Math.cos(angle - Math.PI / 6), arrowEndY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(arrowEndX - headLen * Math.cos(angle + Math.PI / 6), arrowEndY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        // 文字
        ctx.fillText(label, arrowStartX + 5, arrowStartY - 5);
        ctx.restore();
    }

    drawBeam(beam, highlight = false) {
        const { ctx } = this;
        ctx.save();

        const isTip = beam.beamType === 'horizontal-tip';

        if (!isTip) {
            // 只有主棍子加陰影，patch 不加（避免框線感）
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 3;
        }

        if (beam.angle !== undefined) {
            ctx.translate(beam.x, beam.y);
            ctx.rotate(beam.angle);
            ctx.translate(-beam.x, -beam.y);
        }
        const rx = beam.x - beam.w / 2;
        const ry = beam.y - beam.h / 2;
        ctx.fillStyle = beam.color;
        ctx.beginPath();
        if (isTip) {
            // Patch 用直角矩形，與同色棍子無縫連接
            ctx.rect(rx, ry, beam.w, beam.h);
        } else {
            ctx.roundRect(rx, ry, beam.w, beam.h, 2);
        }
        ctx.fill();
        ctx.restore();
    }

    drawOverlapHighlight(highlight) {
        const { ctx } = this;
        // Draw for both top and bottom Y positions
        for (const y of [highlight.topY, highlight.botY]) {
            ctx.save();
            // Red glow circle
            const radius = Math.max(highlight.width * 0.8, 14);
            const gradient = ctx.createRadialGradient(highlight.x, y, 0, highlight.x, y, radius);
            gradient.addColorStop(0, 'rgba(255, 40, 40, 0.55)');
            gradient.addColorStop(0.5, 'rgba(255, 40, 40, 0.25)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(highlight.x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px "Noto Sans TC", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`\u91CD\u758A ${highlight.amountMm} mm`, highlight.x, y - radius - 2);
            ctx.restore();
        }
    }

    drawInterlockRing(ring, index, barWidth) {
        const { ctx } = this;
        ctx.save();

        // 每個環用不同顏色，醒目且互不遮擋
        const colors = [
            { stroke: '#00ffff', fill: 'rgba(0, 255, 255, 0.12)', label: 'cyan' },
            { stroke: '#ff00ff', fill: 'rgba(255, 0, 255, 0.12)', label: 'magenta' },
            { stroke: '#ffff00', fill: 'rgba(255, 255, 0, 0.12)', label: 'yellow' },
            { stroke: '#00ff88', fill: 'rgba(0, 255, 136, 0.12)', label: 'green' },
            { stroke: '#ff8800', fill: 'rgba(255, 136, 0, 0.12)', label: 'orange' },
            { stroke: '#88aaff', fill: 'rgba(136, 170, 255, 0.12)', label: 'blue' },
            { stroke: '#ff4488', fill: 'rgba(255, 68, 136, 0.12)', label: 'pink' },
            { stroke: '#aaffaa', fill: 'rgba(170, 255, 170, 0.12)', label: 'lime' },
        ];
        const colorSet = colors[index % colors.length];

        // 用 barWidth 做偏移量，避免完全重疊
        const pad = barWidth * 0.3;
        const offset = (index % 4) * pad * 0.4;

        const left = ring.vLeftX - barWidth / 2 - pad - offset;
        const right = ring.vRightX + barWidth / 2 + pad + offset;
        const top = ring.hTopY - barWidth / 2 - pad - offset;
        const bottom = ring.hBotY + barWidth / 2 + pad + offset;
        const w = right - left;
        const h = bottom - top;
        const r = Math.min(6, barWidth * 0.5);

        // 半透明填充
        ctx.fillStyle = colorSet.fill;
        ctx.beginPath();
        ctx.roundRect(left, top, w, h, r);
        ctx.fill();

        // 醒目邊框
        const dashType = ring.type === 'full' ? [] : [6, 4];
        ctx.setLineDash(dashType);
        ctx.strokeStyle = colorSet.stroke;
        ctx.lineWidth = ring.type === 'full' ? 2.5 : 1.5;
        ctx.shadowColor = colorSet.stroke;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(left, top, w, h, r);
        ctx.stroke();

        // 第二層描邊增加亮度
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = ring.type === 'full' ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.roundRect(left + 1, top + 1, w - 2, h - 2, Math.max(0, r - 1));
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
    }

    drawGrid(panX, panY, zoom, params = null, view = 'top', theme = 'dark') {
        const { ctx, width, height } = this;
        const gridSize = 50 * zoom;
        const offsetX = panX % gridSize;
        const offsetY = panY % gridSize;

        // Background
        ctx.fillStyle = theme === 'light' ? '#f8fafc' : '#0a0a15';
        ctx.fillRect(0, 0, width, height);

        // P-Regions (if params exist and view is top)
        if (params && view === 'top') {
            const cx = width / 2 + panX;
            const cy = height / 2 + panY;
            const pxPerCm = zoom * 12;
            const y = params.y * pxPerCm;
            const s = params.s * pxPerCm;
            // From geometry.js: H0_spacing = x - 2b
            const b = (params.v + params.y / 2) * pxPerCm;  // b = v + y/2
            const xVal = params.x * pxPerCm;
            const H0_spacing = xVal - 2 * b;
            const H0_top_Y = cy - H0_spacing / 2;
            const H0_bot_Y = cy + H0_spacing / 2;

            // Draw P1, P2, P3... regions
            const regionH = y;
            const Pmax = params.Pmax || 4;

            ctx.font = `bold ${12 * zoom}px "Noto Sans TC", sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            for (let p = 1; p <= Pmax; p++) {
                // Calculate Y for top and bottom Pn
                // geometry.js: H1_top_Y = H0_top_Y + (P - 1) * (y + s)
                const topY = H0_top_Y + (p - 1) * (y + s);
                const botY = H0_bot_Y - (p - 1) * (y + s); // Symmetric mirror ? No, geometry uses minus for bot Y?
                // geometry.js: H1R_bot_Y = H0_bot_Y - (H1R_P - 1) * (y + s);
                // Wait, H0_bot_Y is bellow cy. H beams stack downwards from H0_top and Upwards from H0_bot?
                // Let's check geometry.js H1R_bot_Y logic.
                // H0_bot_Y = cy + H0_spacing/2. 
                // H1R_bot_Y = H0_bot_Y - ... 
                // Ah, geometry.js logic: H0 is outer, H1 is inner? 
                // Let's trust logic from geometry.js: 
                // H1R_top_Y = H0_top_Y + (p - 1) * (y + s); 
                // H1R_bot_Y = H0_bot_Y - (p - 1) * (y + s);

                // Color bands (Faintly visible colors)
                // Adjust alpha for Light Theme
                const alpha = theme === 'light' ? 0.15 : 0.08;
                const colors = [
                    `rgba(255, 99, 71, ${alpha})`,   // P1 Red tint
                    `rgba(65, 105, 225, ${alpha})`,  // P2 Blue tint
                    `rgba(60, 179, 113, ${alpha})`,  // P3 Green tint
                    `rgba(255, 165, 0, ${alpha})`,   // P4 Orange tint
                    `rgba(147, 112, 219, ${alpha})`  // P5 Purple tint
                ];
                ctx.fillStyle = colors[(p - 1) % colors.length];

                // Top Band
                ctx.fillRect(0, topY - y / 2, width, y);
                // Bot Band
                ctx.fillRect(0, botY - y / 2, width, y);

                // Labels (Outside the beam area)
                const labelX_L = cx - (xVal) * 1.5;
                ctx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.5)';
                ctx.fillText(`P${p}`, labelX_L, topY);
                ctx.fillText(`P${p}`, labelX_L, botY);
            }
        }

        // Grid Lines
        const gridColor = theme === 'light' ? '#cbd5e1' : '#334155';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.beginPath();

        for (let x = offsetX; x < width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = offsetY; y < height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    }
}
