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
        // 實心填充，減少邊線
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 3;

        if (beam.angle !== undefined) {
            ctx.translate(beam.x, beam.y);
            ctx.rotate(beam.angle);
            ctx.translate(-beam.x, -beam.y);
        }
        const rx = beam.x - beam.w / 2;
        const ry = beam.y - beam.h / 2;
        ctx.fillStyle = beam.color;
        ctx.beginPath();
        ctx.roundRect(rx, ry, beam.w, beam.h, 2);
        ctx.fill();
        // 不繪製邊線，避免重疊問題
        ctx.restore();
    }

    drawGrid(panX, panY, zoom) {
        const { ctx, width, height } = this;
        const gridSize = 50 * zoom;
        const offsetX = panX % gridSize;
        const offsetY = panY % gridSize;

        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim() || '#334155';
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
