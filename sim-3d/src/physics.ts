import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
    public world: RAPIER.World | null = null;
    public gravity: { x: number; y: number; z: number } = { x: 0.0, y: -9.81, z: 0.0 };

    async init() {
        await RAPIER.init();
        this.world = new RAPIER.World(this.gravity);
        console.log("Rapier physics initialized");
    }

    createGround() {
        if (!this.world) return;

        // Create a static ground plane
        const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50)
            .setTranslation(0, -0.1, 0); // Slightly below y=0

        this.world.createCollider(groundColliderDesc);
    }

    step() {
        if (this.world) {
            this.world.step();
        }
    }
}
