import './style.css'
import * as THREE from 'three';
import { SimulationScene } from './scene';
import { PhysicsWorld } from './physics';
import { BridgeBuilder } from './bridge';

// UI State
let isSimulating = false;
let bridge: BridgeBuilder;

async function init() {
  const simulationScene = new SimulationScene();
  const physicsWorld = new PhysicsWorld();

  // Initialize Physics
  await physicsWorld.init();
  physicsWorld.createGround();

  // Create a visual ground to match physics
  const groundGeometry = new THREE.BoxGeometry(20, 0.2, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.position.set(0, -0.1, 0);
  groundMesh.receiveShadow = true;
  simulationScene.scene.add(groundMesh);

  // Build the Da Vinci Bridge
  bridge = new BridgeBuilder(simulationScene.scene, physicsWorld, {
    x: 30,   // 30cm beam length
    y: 3,    // 3cm beam width
    z: 1.5,  // 1.5cm beam thickness
    a: 3,    // 3cm crossing offset
    b: 3,    // 3cm edge offset
  });
  bridge.buildLayer1Bridge();

  // Create UI
  createUI();

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    // Step Physics (only when simulating)
    if (isSimulating) {
      physicsWorld.step();
      bridge.syncMeshes();
    }

    // Render
    simulationScene.render();
  }

  animate();
}

function createUI() {
  const container = document.createElement('div');
  container.id = 'ui-container';
  container.innerHTML = `
        <style>
            #ui-container {
                position: fixed;
                top: 20px;
                left: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .ui-btn {
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 500;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .ui-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            }
            .ui-btn.primary {
                background: linear-gradient(135deg, #e94560, #ff6b6b);
                color: white;
            }
            .ui-btn.secondary {
                background: rgba(255,255,255,0.1);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            }
            #status {
                color: white;
                font-size: 12px;
                background: rgba(0,0,0,0.5);
                padding: 8px 16px;
                border-radius: 6px;
                margin-top: 10px;
            }
            h2 {
                color: white;
                font-size: 18px;
                margin: 0 0 5px 0;
            }
            .subtitle {
                color: rgba(255,255,255,0.6);
                font-size: 12px;
                margin: 0 0 15px 0;
            }
        </style>
        <h2>達文西橋 3D 物理模擬</h2>
        <p class="subtitle">Da Vinci Bridge Physics Simulation</p>
        <button id="releaseBtn" class="ui-btn primary">🚀 釋放腳架 (Release)</button>
        <button id="resetBtn" class="ui-btn secondary">↺ 重置 (Reset)</button>
        <div id="status">狀態: 準備就緒</div>
    `;
  document.body.appendChild(container);

  // Event Listeners
  document.getElementById('releaseBtn')?.addEventListener('click', () => {
    if (!isSimulating) {
      bridge.releaseScaffolding();
      isSimulating = true;
      updateStatus('物理模擬中...');
    }
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    isSimulating = false;
    bridge.reset();
    updateStatus('已重置');
  });
}

function updateStatus(text: string) {
  const el = document.getElementById('status');
  if (el) el.textContent = `狀態: ${text}`;
}

init();
