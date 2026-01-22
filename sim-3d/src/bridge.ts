import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from './physics';

/**
 * Beam configuration parameters (all in cm, matching existing system)
 */
export interface BeamParams {
    x: number; // Beam length (棍長)
    y: number; // Beam width (棍寬)
    z: number; // Beam thickness (棍厚)
    a: number; // Horizontal edge to vertical crossing point (水平棍邊緣到垂直棍交叉中點的距離)
    b: number; // Vertical crossing point to outer edge (垂直棍交叉中點到自己外緣的距離)
}

/**
 * Represents a single beam in the bridge
 */
interface Beam {
    id: string;
    type: 'vertical' | 'horizontal';
    layer: number;
    color: number;
    mesh: THREE.Mesh;
    rigidBody: RAPIER.RigidBody | null;
}

/**
 * Da Vinci Bridge 3D Builder
 * Generates the complete bridge geometry based on the parametric model
 */
export class BridgeBuilder {
    private params: BeamParams;
    private scene: THREE.Scene;
    private physicsWorld: PhysicsWorld;
    private beams: Map<string, Beam> = new Map();
    private scaffoldingBodies: RAPIER.RigidBody[] = [];
    private scale: number = 0.1; // cm to meters (Rapier uses meters)

    // Colors matching existing simulation
    private readonly COLORS = {
        V0: 0xda3d3d,  // Red - vertex
        V1: 0xffb6c1,  // Pink - first layer pivot
        V2: 0xff8c00,  // Orange - second layer pivot
        H0: 0x228b22,  // Green - core horizontal
        H1R: 0x4169e1, // Blue - right leg
        H1L: 0x9370db, // Purple - left leg
        H2R: 0x00ced1, // Cyan - second layer right
        H2L: 0xffd700, // Yellow - second layer left
    };

    constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, params?: Partial<BeamParams>) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.params = {
            x: 30,  // 30cm beam length
            y: 3,   // 3cm beam width
            z: 1.5, // 1.5cm beam thickness
            a: 3,   // 3cm crossing offset
            b: 3,   // 3cm edge offset
            ...params
        };
    }

    /**
     * Creates a single beam mesh and optionally its physics body
     */
    private createBeam(
        id: string,
        type: 'vertical' | 'horizontal',
        layer: number,
        color: number,
        position: THREE.Vector3,
        rotation: THREE.Euler,
        isDynamic: boolean = true
    ): Beam {
        const { x, y, z } = this.params;
        const s = this.scale;

        // Geometry: Use beam dimensions
        // For horizontal beams: length is X, width is Y, thickness is Z
        // For vertical beams: length is Y (displayed as height), width is Y, thickness is Z
        const length = type === 'horizontal' ? x * s : y * s;
        const width = y * s;
        const thickness = z * s;

        const geometry = new THREE.BoxGeometry(length, thickness, width);
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.8,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { id, type, layer };
        this.scene.add(mesh);

        // Physics body
        let rigidBody: RAPIER.RigidBody | null = null;
        if (this.physicsWorld.world) {
            const bodyDesc = isDynamic
                ? RAPIER.RigidBodyDesc.dynamic()
                : RAPIER.RigidBodyDesc.kinematicPositionBased();

            bodyDesc.setTranslation(position.x, position.y, position.z);
            // Convert Euler to quaternion for physics
            const q = new THREE.Quaternion().setFromEuler(rotation);
            bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });

            rigidBody = this.physicsWorld.world.createRigidBody(bodyDesc);

            const colliderDesc = RAPIER.ColliderDesc.cuboid(
                length / 2,
                thickness / 2,
                width / 2
            )
                .setFriction(0.4) // Wood friction
                .setRestitution(0.1);

            this.physicsWorld.world.createCollider(colliderDesc, rigidBody);
        }

        return { id, type, layer, color, mesh, rigidBody };
    }

    /**
     * Builds a minimal 1-layer Da Vinci bridge
     * Core structure: V0 (apex), H0 (core horizontal), V1 (pivots), H1 (legs)
     */
    public buildLayer1Bridge(): void {
        const { x, z, a, b } = this.params;
        const s = this.scale;

        // All coordinates in 3D space (Y is up, X is right, Z is front)
        // Ground level at Y=0

        // --- Calculate Key Geometry ---
        // V1 span (horizontal distance between V1 pivots)
        const V1_spacing = (x - 2 * a) * s;

        // Stack height (vertical offset from V0 to V1)
        const stackHeight = 2 * z * s;

        // V1 Y position (on the ground, with half-thickness offset)
        const V1_Y = z * s / 2;

        // V0 Y position (at apex)
        const V0_Y = V1_Y + stackHeight;

        // H0 Y position (between V0 and V1)
        const H0_Y = V0_Y - z * s;

        // Calculate leg angle
        const effL = (x - 2 * a) * s;
        const liftAngle = Math.asin(Math.min(1, stackHeight / effL));
        const V1_X = V1_spacing / 2 * Math.cos(liftAngle);

        // --- Build Beams with Scaffolding (Start Kinematic) ---

        // V0: Central apex (Red)
        const v0 = this.createBeam(
            'V0', 'vertical', 0, this.COLORS.V0,
            new THREE.Vector3(0, V0_Y, 0),
            new THREE.Euler(0, 0, Math.PI / 2), // Rotated to be horizontal in the XZ plane
            false // Start kinematic for assembly
        );
        this.beams.set('V0', v0);
        if (v0.rigidBody) this.scaffoldingBodies.push(v0.rigidBody);

        // H0: Core horizontal beams (Green) - Front and Back
        const H0_Z_offset = (x - 2 * b) * s / 2;
        const h0Front = this.createBeam(
            'H0-Front', 'horizontal', 0, this.COLORS.H0,
            new THREE.Vector3(0, H0_Y, H0_Z_offset),
            new THREE.Euler(0, 0, 0),
            false
        );
        this.beams.set('H0-Front', h0Front);
        if (h0Front.rigidBody) this.scaffoldingBodies.push(h0Front.rigidBody);

        const h0Back = this.createBeam(
            'H0-Back', 'horizontal', 0, this.COLORS.H0,
            new THREE.Vector3(0, H0_Y, -H0_Z_offset),
            new THREE.Euler(0, 0, 0),
            false
        );
        this.beams.set('H0-Back', h0Back);
        if (h0Back.rigidBody) this.scaffoldingBodies.push(h0Back.rigidBody);

        // V1: Pivot beams (Pink) - Left and Right
        const v1Right = this.createBeam(
            'V1-Right', 'vertical', 0, this.COLORS.V1,
            new THREE.Vector3(V1_X, V1_Y, 0),
            new THREE.Euler(0, 0, Math.PI / 2),
            false
        );
        this.beams.set('V1-Right', v1Right);
        if (v1Right.rigidBody) this.scaffoldingBodies.push(v1Right.rigidBody);

        const v1Left = this.createBeam(
            'V1-Left', 'vertical', 0, this.COLORS.V1,
            new THREE.Vector3(-V1_X, V1_Y, 0),
            new THREE.Euler(0, 0, Math.PI / 2),
            false
        );
        this.beams.set('V1-Left', v1Left);
        if (v1Left.rigidBody) this.scaffoldingBodies.push(v1Left.rigidBody);

        // H1: Leg beams (Blue/Purple) - Calculate angle
        const H1_angle = liftAngle;
        const H1_length = x * s;

        // H1 center offset from V0 (along the angled leg)
        const H1_offset_X = (H1_length / 2 - a * s) * Math.cos(H1_angle);
        const H1_offset_Y = (H1_length / 2 - a * s) * Math.sin(H1_angle);

        // H1-Right (Blue) - angles downward to the right
        const h1RightFront = this.createBeam(
            'H1R-Front', 'horizontal', 1, this.COLORS.H1R,
            new THREE.Vector3(H1_offset_X, V0_Y - H1_offset_Y, H0_Z_offset),
            new THREE.Euler(0, 0, -H1_angle),
            false
        );
        this.beams.set('H1R-Front', h1RightFront);
        if (h1RightFront.rigidBody) this.scaffoldingBodies.push(h1RightFront.rigidBody);

        const h1RightBack = this.createBeam(
            'H1R-Back', 'horizontal', 1, this.COLORS.H1R,
            new THREE.Vector3(H1_offset_X, V0_Y - H1_offset_Y, -H0_Z_offset),
            new THREE.Euler(0, 0, -H1_angle),
            false
        );
        this.beams.set('H1R-Back', h1RightBack);
        if (h1RightBack.rigidBody) this.scaffoldingBodies.push(h1RightBack.rigidBody);

        // H1-Left (Purple) - angles downward to the left (mirrored)
        const h1LeftFront = this.createBeam(
            'H1L-Front', 'horizontal', 1, this.COLORS.H1L,
            new THREE.Vector3(-H1_offset_X, V0_Y - H1_offset_Y, H0_Z_offset),
            new THREE.Euler(0, 0, H1_angle),
            false
        );
        this.beams.set('H1L-Front', h1LeftFront);
        if (h1LeftFront.rigidBody) this.scaffoldingBodies.push(h1LeftFront.rigidBody);

        const h1LeftBack = this.createBeam(
            'H1L-Back', 'horizontal', 1, this.COLORS.H1L,
            new THREE.Vector3(-H1_offset_X, V0_Y - H1_offset_Y, -H0_Z_offset),
            new THREE.Euler(0, 0, H1_angle),
            false
        );
        this.beams.set('H1L-Back', h1LeftBack);
        if (h1LeftBack.rigidBody) this.scaffoldingBodies.push(h1LeftBack.rigidBody);

        console.log(`Bridge built with ${this.beams.size} beams`);
    }

    /**
     * Release all scaffolding - convert kinematic bodies to dynamic
     */
    public releaseScaffolding(): void {
        if (!this.physicsWorld.world) return;

        this.beams.forEach((beam) => {
            if (beam.rigidBody) {
                // Change body type to dynamic
                beam.rigidBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
            }
        });

        this.scaffoldingBodies = [];
        console.log('Scaffolding released - bridge is now dynamic');
    }

    /**
     * Get a beam for interaction (e.g., removal)
     */
    public getBeam(id: string): Beam | undefined {
        return this.beams.get(id);
    }

    /**
     * Remove a beam from the simulation
     */
    public removeBeam(id: string): boolean {
        const beam = this.beams.get(id);
        if (!beam) return false;

        // Remove from physics
        if (beam.rigidBody && this.physicsWorld.world) {
            this.physicsWorld.world.removeRigidBody(beam.rigidBody);
        }

        // Remove from scene
        this.scene.remove(beam.mesh);
        beam.mesh.geometry.dispose();
        (beam.mesh.material as THREE.Material).dispose();

        this.beams.delete(id);
        console.log(`Beam ${id} removed`);
        return true;
    }

    /**
     * Sync all mesh positions with physics bodies
     */
    public syncMeshes(): void {
        this.beams.forEach((beam) => {
            if (beam.rigidBody) {
                const pos = beam.rigidBody.translation();
                const rot = beam.rigidBody.rotation();
                beam.mesh.position.set(pos.x, pos.y, pos.z);
                beam.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
            }
        });
    }

    /**
     * Reset the bridge to initial state
     */
    public reset(): void {
        // Remove all beams
        this.beams.forEach((beam) => {
            if (beam.rigidBody && this.physicsWorld.world) {
                this.physicsWorld.world.removeRigidBody(beam.rigidBody);
            }
            this.scene.remove(beam.mesh);
            beam.mesh.geometry.dispose();
            (beam.mesh.material as THREE.Material).dispose();
        });
        this.beams.clear();
        this.scaffoldingBodies = [];

        // Rebuild
        this.buildLayer1Bridge();
    }
}
