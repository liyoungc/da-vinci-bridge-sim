/**
 * 達文西橋模擬器 - 兒童簡化版主邏輯
 * 包含飛入動畫系統和簡化的交互邏輯
 */

import {
    COLORS,
    BEAM_NAMES,
    SIMPLIFIED_PARAMS,
    INITIAL_PARAMS,
    BUILD_STEPS,
    ANIMATION_CONFIG,
    CELEBRATION_CONFIG
} from './kids-constants.js';

import { getTopViewBeams } from './geometry.js';
import { Renderer } from './renderer.js';

// ===== 狀態管理 =====
const state = {
    params: { ...INITIAL_PARAMS },
    currentStep: 0,        // 當前步驟（0-5）
    maxLayers: 1,          // 固定為單層
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    isAutoPlaying: false,
    autoPlayTimer: null,
    // 動畫狀態
    isAnimating: false,
    animatingBeams: new Set()
};

// ===== Canvas 和 Renderer =====
let canvas, ctx, renderer;
let confettiCanvas, confettiCtx;

// ===== 緩動函數 =====
function easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
        return n1 * t * t;
    } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

// ===== 飛入動畫系統 =====
function animateBeamEntry(beamData, fromDirection, delay = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const startTime = Date.now();
            const duration = ANIMATION_CONFIG.duration;

            // 計算起始和結束位置
            let startX = beamData.x;
            let startY = beamData.y;
            const targetX = beamData.x;
            const targetY = beamData.y;
            let startRotation = 0;

            // 根據方向設置起始位置
            if (fromDirection === 'top') {
                startY = targetY - ANIMATION_CONFIG.flyDistance.vertical;
                startRotation = ANIMATION_CONFIG.rotation.vertical;
            } else if (fromDirection === 'right') {
                startX = targetX + ANIMATION_CONFIG.flyDistance.horizontal;
                startRotation = ANIMATION_CONFIG.rotation.horizontal;
            } else if (fromDirection === 'left') {
                startX = targetX - ANIMATION_CONFIG.flyDistance.horizontal;
                startRotation = -ANIMATION_CONFIG.rotation.horizontal;
            } else if (fromDirection === 'sides') {
                // H0 特殊處理：上橫從左飛入，下橫從右飛入
                if (beamData.id === 'green1') {
                    startX = targetX - ANIMATION_CONFIG.flyDistance.horizontal;
                    startRotation = -ANIMATION_CONFIG.rotation.horizontal;
                } else {
                    startX = targetX + ANIMATION_CONFIG.flyDistance.horizontal;
                    startRotation = ANIMATION_CONFIG.rotation.horizontal;
                }
            }

            function animate() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeOutBounce(progress);

                // 計算當前位置
                beamData.animX = lerp(startX, targetX, eased);
                beamData.animY = lerp(startY, targetY, eased);
                beamData.animOpacity = eased;
                beamData.animRotation = lerp(startRotation, 0, eased);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // 動畫完成
                    beamData.animX = targetX;
                    beamData.animY = targetY;
                    beamData.animOpacity = 1;
                    beamData.animRotation = 0;
                    state.animatingBeams.delete(beamData.id);
                    resolve();
                }
            }

            state.animatingBeams.add(beamData.id);
            animate();
        }, delay);
    });
}

// 觸發步驟動畫
async function triggerStepAnimation(stepIndex) {
    const step = BUILD_STEPS[stepIndex];
    if (!step.animationFrom || stepIndex === 0) return;

    state.isAnimating = true;

    // 獲取當前步驟新增的木棍
    const prevBeams = stepIndex > 0 ? BUILD_STEPS[stepIndex - 1].beams : [];
    const newBeams = step.beams.filter(id => !prevBeams.includes(id));

    // 觸發新木棍的飛入動畫
    const animations = newBeams.map((beamId, index) => {
        // 找到對應的 beam 數據（需要先渲染一次獲取位置）
        const beamData = { id: beamId, x: 0, y: 0 };  // 這裡需要實際的 beam 位置
        return animateBeamEntry(beamData, step.animationFrom, index * ANIMATION_CONFIG.staggerDelay);
    });

    await Promise.all(animations);
    state.isAnimating = false;
}

// ===== 渲染函數 =====
function render() {
    if (!canvas || !ctx || !renderer) return;

    // 調整 canvas 大小
    const wrapper = canvas.parentElement;
    if (canvas.width !== wrapper.clientWidth || canvas.height !== wrapper.clientHeight) {
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
    }

    // 清空畫布
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 應用縮放和平移
    ctx.save();
    ctx.translate(canvas.width / 2 + state.panX, canvas.height / 2 + state.panY);
    ctx.scale(state.zoom, state.zoom);

    // 繪製網格
    renderer.drawGrid(ctx, canvas.width, canvas.height, state.zoom, -state.panX, -state.panY, COLORS);

    // 獲取當前步驟的木棍數據（只調用 getTopViewBeams）
    const { beams, buildError } = getTopViewBeams(state.params);

    // 過濾當前步驟應該顯示的木棍
    const currentStepBeams = BUILD_STEPS[state.currentStep].beams;
    const visibleBeams = Object.values(beams).filter(beam =>
        currentStepBeams.includes(beam.parent || beam.beamType)
    );

    // 按 z-index 排序
    visibleBeams.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // 繪製木棍
    visibleBeams.forEach(beam => {
        const color = COLORS[beam.color] || '#999';

        // 如果木棍正在動畫中，使用動畫位置
        if (state.animatingBeams.has(beam.id)) {
            ctx.save();
            ctx.globalAlpha = beam.animOpacity || 1;
            ctx.translate(beam.animX || beam.x, beam.animY || beam.y);
            ctx.rotate((beam.animRotation || 0) * Math.PI / 180);
            ctx.translate(-(beam.animX || beam.x), -(beam.animY || beam.y));
        }

        renderer.drawBeam(ctx, beam, color);

        if (state.animatingBeams.has(beam.id)) {
            ctx.restore();
        }
    });

    ctx.restore();

    // 顯示錯誤訊息
    const errorMessage = document.getElementById('errorMessage');
    if (buildError) {
        errorMessage.textContent = buildError;
        errorMessage.style.display = 'block';
    } else {
        errorMessage.style.display = 'none';
    }

    // 繼續動畫循環
    if (state.isAnimating) {
        requestAnimationFrame(render);
    }
}

// ===== 更新 UI =====
function updateUI() {
    // 更新步驟標題和描述
    const step = BUILD_STEPS[state.currentStep];
    document.getElementById('stepTitle').textContent = `${step.emoji} ${step.title}`;
    document.getElementById('stepDescription').textContent = step.description;

    // 更新進度圓點
    const dots = document.querySelectorAll('.progress-dots .dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === state.currentStep);
        dot.classList.toggle('completed', index < state.currentStep);
    });

    // 更新按鈕狀態
    document.getElementById('prevBtn').disabled = state.currentStep === 0;
    document.getElementById('nextBtn').disabled = state.currentStep === BUILD_STEPS.length - 1;

    // 更新參數顯示
    document.getElementById('valueX').textContent = `${state.params.x} cm`;
    document.getElementById('valueH').textContent = `${state.params.h} cm`;
    document.getElementById('valueV').textContent = `${state.params.v} cm`;

    // 更新縮放顯示
    document.getElementById('zoomValue').textContent = `${Math.round(state.zoom * 100)}%`;

    // 如果完成所有步驟，顯示慶祝動畫
    if (state.currentStep === BUILD_STEPS.length - 1 && !state.hasShownCelebration) {
        showCelebration();
        state.hasShownCelebration = true;
    }
}

// ===== 步驟控制 =====
function nextStep() {
    if (state.currentStep < BUILD_STEPS.length - 1) {
        state.currentStep++;
        updateUI();
        triggerStepAnimation(state.currentStep);
        render();
    }
}

function prevStep() {
    if (state.currentStep > 0) {
        state.currentStep--;
        state.hasShownCelebration = false;
        updateUI();
        render();
    }
}

function autoPlay() {
    if (state.isAutoPlaying) {
        // 停止自動播放
        clearInterval(state.autoPlayTimer);
        state.isAutoPlaying = false;
        document.getElementById('autoBtn').textContent = '🎬 自動播放';
    } else {
        // 開始自動播放
        state.isAutoPlaying = true;
        document.getElementById('autoBtn').textContent = '⏸️ 暫停';

        state.autoPlayTimer = setInterval(() => {
            if (state.currentStep < BUILD_STEPS.length - 1) {
                nextStep();
            } else {
                clearInterval(state.autoPlayTimer);
                state.isAutoPlaying = false;
                document.getElementById('autoBtn').textContent = '🎬 自動播放';
            }
        }, 2000);  // 每 2 秒切換一步
    }
}

// ===== 慶祝動畫 =====
function showCelebration() {
    const celebration = document.getElementById('celebration');
    celebration.style.display = 'flex';

    // 繪製紙屑動畫
    drawConfetti();

    // 3 秒後隱藏
    setTimeout(() => {
        celebration.style.display = 'none';
    }, CELEBRATION_CONFIG.duration + 1000);
}

function drawConfetti() {
    if (!confettiCanvas || !confettiCtx) return;

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const confetti = [];
    for (let i = 0; i < CELEBRATION_CONFIG.confettiCount; i++) {
        confetti.push({
            x: Math.random() * confettiCanvas.width,
            y: -20,
            size: Math.random() * 10 + 5,
            color: CELEBRATION_CONFIG.confettiColors[Math.floor(Math.random() * CELEBRATION_CONFIG.confettiColors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360
        });
    }

    function animateConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        confetti.forEach((c, index) => {
            c.y += c.speedY;
            c.x += c.speedX;
            c.rotation += 2;

            confettiCtx.save();
            confettiCtx.translate(c.x, c.y);
            confettiCtx.rotate(c.rotation * Math.PI / 180);
            confettiCtx.fillStyle = c.color;
            confettiCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
            confettiCtx.restore();

            if (c.y > confettiCanvas.height) {
                confetti.splice(index, 1);
            }
        });

        if (confetti.length > 0) {
            requestAnimationFrame(animateConfetti);
        }
    }

    animateConfetti();
}

// ===== 事件監聽 =====
function setupEventListeners() {
    // 步驟控制
    document.getElementById('prevBtn').addEventListener('click', prevStep);
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('autoBtn').addEventListener('click', autoPlay);

    // 參數控制
    document.getElementById('paramX').addEventListener('input', (e) => {
        state.params.x = parseFloat(e.target.value);
        updateUI();
        render();
    });

    document.getElementById('paramH').addEventListener('input', (e) => {
        state.params.h = parseFloat(e.target.value);
        updateUI();
        render();
    });

    document.getElementById('paramV').addEventListener('input', (e) => {
        state.params.v = parseFloat(e.target.value);
        updateUI();
        render();
    });

    // 重置參數
    document.getElementById('resetParamsBtn').addEventListener('click', () => {
        state.params = { ...INITIAL_PARAMS };
        document.getElementById('paramX').value = INITIAL_PARAMS.x;
        document.getElementById('paramH').value = INITIAL_PARAMS.h;
        document.getElementById('paramV').value = INITIAL_PARAMS.v;
        updateUI();
        render();
    });

    // 縮放控制
    document.getElementById('zoomSlider').addEventListener('input', (e) => {
        state.zoom = parseFloat(e.target.value);
        updateUI();
        render();
    });

    // 重置視圖
    document.getElementById('resetViewBtn').addEventListener('click', () => {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
        document.getElementById('zoomSlider').value = 1;
        updateUI();
        render();
    });

    // 拖動畫布
    canvas.addEventListener('mousedown', (e) => {
        state.isDragging = true;
        state.dragStartX = e.clientX - state.panX;
        state.dragStartY = e.clientY - state.panY;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (state.isDragging) {
            state.panX = e.clientX - state.dragStartX;
            state.panY = e.clientY - state.dragStartY;
            render();
        }
    });

    canvas.addEventListener('mouseup', () => {
        state.isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
        state.isDragging = false;
        canvas.style.cursor = 'grab';
    });

    // 觸控支援
    let touchStartX = 0, touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX - state.panX;
            touchStartY = e.touches[0].clientY - state.panY;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            state.panX = e.touches[0].clientX - touchStartX;
            state.panY = e.touches[0].clientY - touchStartY;
            render();
        }
    });

    // 窗口調整
    window.addEventListener('resize', () => {
        render();
    });
}

// ===== 初始化 =====
function init() {
    // 獲取 Canvas 元素
    canvas = document.getElementById('bridgeCanvas');
    ctx = canvas.getContext('2d');
    confettiCanvas = document.getElementById('confettiCanvas');
    confettiCtx = confettiCanvas.getContext('2d');

    // 初始化 Renderer
    renderer = new Renderer();

    // 設置事件監聽
    setupEventListeners();

    // 初始渲染
    updateUI();
    render();
}

// 頁面載入後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
