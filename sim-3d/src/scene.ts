import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SimulationScene {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;

    constructor() {
        // 1. Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // 2. Setup Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 5, 0);

        // 3. Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // 4. Setup Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 5. Setup Lights
        this.setupLights();

        // 6. Setup Helpers (Grid, Axes)
        this.setupHelpers();

        // 7. Handle Window Resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setupLights() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft white light
        this.scene.add(ambientLight);

        // Directional Light (Sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(50, 50, 50);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
    }

    private setupHelpers() {
        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);

        // Axes Helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
