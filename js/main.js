import { INITIAL_PARAMS, BUILD_STEPS, COLORS_DARK, COLORS_LIGHT } from './constants.js';
import { getTopViewBeams, getSideViewBeams } from './geometry.js';
import { Renderer } from './renderer.js';

// Helper: compute max step from layer count
function getMaxStep(layers) {
    return layers === 1 ? 5 : BUILD_STEPS.length - 1;
}

// Application State
const state = {
    params: { ...INITIAL_PARAMS },
    currentStep: 0,
    currentView: 'top',
    maxLayers: 2,
    zoom: 1,
    panX: 0,
    panY: 0,
    canvasRotation: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    isAutoPlaying: false,
    autoPlayInterval: null
};

// DOM Elements
const canvas = document.getElementById('bridgeCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const renderer = new Renderer(canvas, ctx);

// Setup UI Controls
function initUI() {
    // Sliders
    ['x', 'y', 'z', 'h', 'v', 's', 'Pmax', 'tolerance'].forEach(key => {
        const slider = document.getElementById(key + 'Slider');
        const valDisplay = document.getElementById(key + 'Val');
        const numberInput = document.getElementById(key + 'Input');

        if (slider) {
            slider.value = state.params[key];
            if (valDisplay) valDisplay.textContent = state.params[key];
            if (numberInput) numberInput.value = state.params[key];

            const update = (val) => {
                state.params[key] = parseFloat(val);
                if (valDisplay) valDisplay.textContent = state.params[key];
                if (slider) slider.value = state.params[key];
                if (numberInput) numberInput.value = state.params[key];
                render();
            };

            slider.addEventListener('input', (e) => update(e.target.value));
            if (numberInput) {
                numberInput.addEventListener('input', (e) => update(e.target.value));
            }
        }
    });

    // P Position Mode
    const pCisBtn = document.getElementById('pcisModeBtn');
    const pTransBtn = document.getElementById('ptransModeBtn');

    if (pCisBtn && pTransBtn) {
        pCisBtn.addEventListener('click', () => {
            pCisBtn.classList.add('active');
            pTransBtn.classList.remove('active');
            state.params.pMode = 'cis';
            document.getElementById('pModeDesc').textContent = 'Pcis: 往 Pmax 找 (預設)'; // Logic text update
            render();
        });
        pTransBtn.addEventListener('click', () => {
            pTransBtn.classList.add('active');
            pCisBtn.classList.remove('active');
            state.params.pMode = 'trans';
            document.getElementById('pModeDesc').textContent = 'Ptrans: 往 P1 找 (交錯)';
            render();
        });
    }

    // View Toggle (Data Attributes)
    document.querySelectorAll('.view-tab[data-view]').forEach(tab => {
        tab.addEventListener('click', () => {
            state.currentView = tab.dataset.view;
            updateViewButtons();
            resetView();
        });
    });

    // Layer Toggle (Data Attributes)
    document.querySelectorAll('.view-tab[data-layer]').forEach(tab => {
        tab.addEventListener('click', () => {
            state.maxLayers = parseInt(tab.dataset.layer);
            state.params.L = state.maxLayers;
            updateLayerButtons();

            // Logic Request: Reset completely when switching layers
            state.currentStep = 0;
            updateUI();
            render();
        });
    });

    // Step Navigation
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (state.currentStep > 0) {
            state.currentStep--;
            updateUI();
            render();
        }
    });
    document.getElementById('completeBtn').addEventListener('click', () => {
        const maxStep = getMaxStep(state.maxLayers);
        state.currentStep = maxStep;
        updateUI();
        render();
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
        const maxStep = getMaxStep(state.maxLayers);
        if (state.currentStep < maxStep) {
            state.currentStep++;
            updateUI();
            render();
        }
    });
    document.getElementById('autoBtn').addEventListener('click', toggleAutoPlay);

    // Zoom/Pan/Rotate
    document.getElementById('resetViewBtn').addEventListener('click', resetView);
    document.getElementById('rotateBtn').addEventListener('click', () => {
        state.canvasRotation = (state.canvasRotation + 90) % 360;
        render();
    });
    document.getElementById('zoomSlider').addEventListener('input', (e) => {
        state.zoom = parseFloat(e.target.value);
        updateZoomUI();
        render();
    });

    // Theme
    initTheme();

    // Default to completed view
    state.currentStep = getMaxStep(state.maxLayers);

    updateUI();
    updateLayerButtons();
    updateViewButtons();
}

function initTheme() {
    const themeBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const root = document.documentElement;
    let currentTheme = localStorage.getItem('theme') || 'light';

    function applyTheme(theme) {
        if (theme === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', systemDark ? 'dark' : 'light');
            themeIcon.textContent = '🖥️';
        } else {
            root.setAttribute('data-theme', theme);
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
        render();
    }

    applyTheme(currentTheme);

    themeBtn.addEventListener('click', () => {
        if (currentTheme === 'dark') currentTheme = 'light';
        else if (currentTheme === 'light') currentTheme = 'system';
        else currentTheme = 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    });
}

function updateViewButtons() {
    document.querySelectorAll('.view-tab[data-view]').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === state.currentView);
    });
}

function updateLayerButtons() {
    document.querySelectorAll('.view-tab[data-layer]').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.layer) === state.maxLayers);
    });
}

function updateZoomUI() {
    const slider = document.getElementById('zoomSlider');
    const label = document.getElementById('zoomVal');
    if (slider) slider.value = state.zoom;
    if (label) label.textContent = Math.round(state.zoom * 100) + '%';
}

function toggleAutoPlay() {
    state.isAutoPlaying = !state.isAutoPlaying;
    const btn = document.getElementById('autoBtn');
    if (state.isAutoPlaying) {
        btn.textContent = '⏹ 停止';
        btn.classList.add('active');
        const maxStep = getMaxStep(state.maxLayers);
        state.autoPlayInterval = setInterval(() => {
            if (state.currentStep < maxStep) {
                state.currentStep++;
                updateUI();
                render();
            } else {
                toggleAutoPlay(); // Stop at end
            }
        }, 1500);
    } else {
        btn.textContent = '自動';
        btn.classList.remove('active');
        clearInterval(state.autoPlayInterval);
    }
}

function resetView() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.canvasRotation = 0;
    updateZoomUI();
    render();
}

function updateUI() {
    const step = BUILD_STEPS[state.currentStep];
    const maxStep = getMaxStep(state.maxLayers);

    document.getElementById('stepLabel').textContent = `${state.currentStep} / ${maxStep}`;
    document.getElementById('descTitle').textContent = step.title;
    document.getElementById('descText').textContent = step.description;

    const progress = (state.currentStep / maxStep) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    document.getElementById('prevBtn').disabled = state.currentStep === 0;
    document.getElementById('nextBtn').disabled = state.currentStep === maxStep;
    document.getElementById('beamCount').textContent = step.beams.length;

    document.querySelectorAll('.legend-item').forEach(item => {
        const type = item.dataset.beam;
        item.classList.remove('active', 'dimmed');
        if (step.activeBeams.includes(type)) item.classList.add('active');
        else item.classList.add('dimmed');
    });
}

// Canvas Interaction
container.addEventListener('mousedown', (e) => {
    state.isDragging = true;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
    container.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e) => {
    if (state.isDragging) {
        const dx = e.clientX - state.lastMouseX;
        const dy = e.clientY - state.lastMouseY;
        state.panX += dx;
        state.panY += dy;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        render();
    }
});
window.addEventListener('mouseup', () => {
    state.isDragging = false;
    container.style.cursor = 'grab';
});
container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    state.zoom = Math.max(0.5, Math.min(5, state.zoom + delta));
    updateZoomUI();
    render();
}, { passive: false });

// Touch Support
container.addEventListener('touchstart', (e) => {
    state.isDragging = true;
    state.lastMouseX = e.touches[0].clientX;
    state.lastMouseY = e.touches[0].clientY;
}, { passive: false });
window.addEventListener('touchmove', (e) => {
    if (state.isDragging) {
        e.preventDefault();
        const dx = e.touches[0].clientX - state.lastMouseX;
        const dy = e.touches[0].clientY - state.lastMouseY;
        state.panX += dx;
        state.panY += dy;
        state.lastMouseX = e.touches[0].clientX;
        state.lastMouseY = e.touches[0].clientY;
        render();
    }
}, { passive: false });
window.addEventListener('touchend', () => state.isDragging = false);

// Render Loop
function render() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    renderer.setSize(canvas.width, canvas.height);

    // Theme & Colors
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const currentColors = theme === 'light' ? COLORS_LIGHT : COLORS_DARK;

    const cx = canvas.width / 2 + state.panX;
    const cy = canvas.height / 2 + state.panY;
    const scale = state.zoom;

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid (Pass params for P-region styling)
    renderer.drawGrid(state.panX, state.panY, state.zoom, state.params, state.currentView, theme);

    // Apply Global Rotation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(state.canvasRotation * Math.PI / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Calculate Beams
    let allBeams;
    let buildError = null;
    let overlapHighlights = [];

    if (state.currentView === 'top') {
        const result = getTopViewBeams(cx, cy, scale, state.params, currentColors);
        allBeams = result.beams;
        buildError = result.buildError;
        overlapHighlights = result.overlapHighlights || [];
    } else {
        const result = getSideViewBeams(cx, cy, scale, state.params, currentColors);
        allBeams = result.beams;

        // Update Stats
        if (result.mechanics) {
            document.getElementById('spanLength').textContent = result.mechanics.span.toFixed(1);
            document.getElementById('legAngle').textContent = result.mechanics.angle.toFixed(1) + '°';
            if (result.mechanics.height !== undefined) {
                document.getElementById('totalHeight').textContent = result.mechanics.height.toFixed(1);
            }
        }
    }

    // Error Sync: Check Top View for errors even if in Side View
    // Side view physically cannot be built if Top view has overlaps/P-position failures.
    if (!buildError && state.currentView === 'side') {
        const topResult = getTopViewBeams(cx, cy, scale, state.params, currentColors);
        if (topResult.buildError) {
            buildError = topResult.buildError;
            // Only clear beams if strictly necessary.
            // If we clear beams, it looks "broken" if no error text is seen.
            // But user asked "if top fails, side should not build".
            // Let's explicitly clear beams BUT ensure error is very visible.
            allBeams = {};
        }
    }

    // Filter Beams based on Step
    const currentStepData = BUILD_STEPS[state.currentStep];
    const visibleBeams = currentStepData.beams;

    Object.entries(allBeams)
        .filter(([key, beam]) => visibleBeams.includes(key) || (beam.parent && visibleBeams.includes(beam.parent)))
        .sort(([, a], [, b]) => {
            const zA = a.zIndex ?? 0;
            const zB = b.zIndex ?? 0;
            return zA - zB;
        })
        .forEach(([, beam]) => {
            // Check legacy mapping if key not found (for new geometry.js logic if keys changed)
            // Constants has BEAM_MAP, but geometry.js returns keys like 'pink1', 'red1'.
            // BUILD_STEPS uses these keys. Consistent.
            // H2 logic might introduce new keys? checked geometry.js, keys match.

            renderer.drawBeam(beam);

            // Debug Arrow (?)
            // if (key === 'H2L-top') renderer.drawArrow(beam, 'H2L'); 
            // Not needed for prod.
        });

    // Draw overlap highlights (only for top view, only if related beams are visible)
    if (state.currentView === 'top' && overlapHighlights.length > 0) {
        for (const highlight of overlapHighlights) {
            const bothVisible = highlight.relatedBeams.every(
                bk => visibleBeams.includes(bk) || visibleBeams.some(vb => allBeams[vb]?.parent === bk)
            );
            if (bothVisible) {
                renderer.drawOverlapHighlight(highlight);
            }
        }
    }

    // Error Message (Show in both views if error exists)
    if (buildError) {
        ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        // Move above the bridge (shift UP significantly)
        // Bridge is centered at cy. Move to cy - 250?
        ctx.fillText('⚠ 無法搭建', cx, cy - 250);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(255, 200, 200, 0.9)';
        ctx.fillText(buildError, cx, cy - 220);
    }

    ctx.restore();
}

// Start
initUI();
render();
window.addEventListener('resize', render);
