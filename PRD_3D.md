# Product Requirements Document: Da Vinci Bridge Simulator

**Version:** 1.0  
**Date:** January 22, 2026  
**Author:** Li-yang Chen  
**Status:** Draft  

---

## Executive Summary

This document defines requirements for a web-based Da Vinci bridge simulator that demonstrates Leonardo da Vinci's self-supporting bridge design through accurate physics simulation. The project spans three phases: core physics simulation, interactive assembly features, and optional visual enhancement. The primary goal is educational—showing how interlocking beams create a friction-lock structure that strengthens under load without fasteners.

**Technology Stack:** Three.js (3D rendering) + Rapier (physics engine)  
**Target Platform:** Modern web browsers (Chrome, Firefox, Safari, Edge)  
**Timeline:** 8–12 weeks total

---

## 1. Problem Statement

### 1.1 Background

Leonardo da Vinci designed a self-supporting bridge that can be assembled without nails, rope, or other fasteners. The structure relies on friction between interlocking wooden beams arranged at precise angles. When weight is applied, beams compress against each other, increasing friction and creating a paradoxically stronger structure.

### 1.2 Current Gap

Existing resources about Da Vinci bridges are either:

- Static images/diagrams that don't convey the physics
- Physical models requiring materials and construction time
- Overly simplified animations without true physics simulation

### 1.3 Opportunity

A web-based physics simulator allows users to:

- Understand the friction-lock principle through direct experimentation
- Test different configurations and load scenarios
- Share and embed the simulation for educational purposes

---

## 2. Goals and Objectives

### 2.1 Primary Goals

| Goal | Success Criteria |
|------|------------------|
| Demonstrate friction-lock physics | Structure self-supports when scaffolding removed; collapses when beam removed |
| Educational value | Users understand interlocking principle within 2 minutes of interaction |
| Web accessibility | Runs at 30+ FPS on mid-range hardware; no installation required |

### 2.2 Non-Goals (Out of Scope)

- Engineering-grade stress analysis (use Ansys/RFEM for that)
- Mobile-first design (responsive is acceptable, but desktop is primary)
- Multiplayer/collaborative building
- VR/AR support

---

## 3. User Stories

### 3.1 Primary Personas

**Educator (Taiwan medical/engineering faculty)**
> "I want to demonstrate structural principles to students without building physical models for each class."

**Student (ages 12–18)**
> "I want to understand how the bridge works by experimenting with it myself."

**Maker/Hobbyist**
> "I want to validate my beam dimensions before cutting wood for a real build."

### 3.2 User Stories by Phase

#### Phase 1: Core Simulation

- US-1.1: As a user, I can view a pre-built Da Vinci bridge in 3D so I understand the structure.
- US-1.2: As a user, I can release scaffolding and watch the bridge self-support (or collapse) so I see the physics in action.
- US-1.3: As a user, I can remove individual beams and observe the resulting collapse so I understand each beam's role.
- US-1.4: As a user, I can apply load (weight) to the bridge and observe deformation so I understand load distribution.
- US-1.5: As a user, I can reset the simulation to initial state so I can experiment repeatedly.

#### Phase 2: Interactive Features

- US-2.1: As a user, I can watch step-by-step assembly animation so I learn the construction sequence.
- US-2.2: As a user, I can adjust beam parameters (length, width, crossing points) so I experiment with configurations.
- US-2.3: As a user, I can add/remove bridge layers so I understand scalability.
- US-2.4: As a user, I can see stress visualization (color-coded contact forces) so I understand force distribution.
- US-2.5: As a user, I can export my configuration as JSON so I can save/share designs.

#### Phase 3: Visual Enhancement

- US-3.1: As a user, I can select realistic wood textures so the simulation looks professional.
- US-3.2: As a user, I can adjust lighting and environment so I create presentation-quality renders.
- US-3.3: As a user, I can capture screenshots/recordings so I share results.

---

## 4. Technical Requirements

### 4.1 Phase 1: Core Simulation (4–6 weeks)

#### 4.1.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Three.js   │  │   Rapier    │  │  UI Controls    │ │
│  │  Renderer   │◄─┤   Physics   │◄─┤  (vanilla JS)   │ │
│  │             │  │   (WASM)    │  │                 │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │               │                    │          │
│         └───────────────┼────────────────────┘          │
│                         ▼                               │
│              ┌─────────────────────┐                   │
│              │   Bridge Model      │                   │
│              │   (Geometry +       │                   │
│              │    Physics Bodies)  │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.2 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| three | ^0.160.0 | 3D rendering |
| @dimforge/rapier3d | ^0.12.0 | Physics simulation (WASM) |
| vite | ^5.0.0 | Build tooling |

#### 4.1.3 Physics Requirements

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Gravity | -9.81 m/s² | Earth standard |
| Static friction (μs) | 0.4 | Mid-range for dry wood |
| Dynamic friction (μd) | 0.3 | Slightly lower than static |
| Restitution | 0.1 | Low bounce for wood |
| Solver iterations | 8+ | Stable resting contacts |
| Timestep | 1/60 s (fixed) | Deterministic simulation |

#### 4.1.4 Geometric Model Integration

Leverage existing parametric model from documentation:

```typescript
interface BeamParams {
  length: number;      // mm (default: 300)
  width: number;       // mm (default: 30)
  thickness: number;   // mm (default: 15)
}

interface BridgeConfig {
  beamParams: BeamParams;
  crossingPoints: {
    P1: number;  // Position ratio (0-1)
    P2: number;
    P3: number;
  };
  layers: number;      // Number of expansion layers
}
```

#### 4.1.5 Functional Requirements - Phase 1

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Generate bridge geometry from `BridgeConfig` parameters | Must |
| FR-1.2 | Create Rapier rigid bodies for each beam with correct collision shapes | Must |
| FR-1.3 | Implement scaffolding system (kinematic bodies that can be removed) | Must |
| FR-1.4 | Detect and handle beam-beam collisions with friction | Must |
| FR-1.5 | Camera controls: orbit, pan, zoom | Must |
| FR-1.6 | Reset button to restore initial state | Must |
| FR-1.7 | Remove-beam interaction (click to remove) | Must |
| FR-1.8 | Apply-load interaction (click to add weight) | Should |
| FR-1.9 | Basic UI: play/pause, speed control | Should |
| FR-1.10 | Framerate counter for performance monitoring | Should |

#### 4.1.6 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame rate | ≥30 FPS | At 20 beams, mid-range laptop |
| Initial load | <3 seconds | First meaningful paint |
| Physics stability | No jitter | Beams at rest don't vibrate |
| Memory usage | <200 MB | Chrome DevTools heap |

---

### 4.2 Phase 2: Interactive Features (2–4 weeks)

#### 4.2.1 Step-by-Step Assembly

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Implement construction sequence following "golden rules" | Must |
| FR-2.2 | Animation system: beams fly in and lock into place | Must |
| FR-2.3 | Playback controls: play, pause, step forward/back | Must |
| FR-2.4 | Highlight current beam being placed | Should |
| FR-2.5 | Narration/tooltip explaining each step | Should |

**Construction Sequence (from existing documentation):**

1. V0: First vertical pair at center
2. H0: First horizontal beams across V0
3. V1: Second vertical pair, outer position
4. Continue layer expansion...

#### 4.2.2 Parameter Controls

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.6 | Slider: beam length (200–500 mm) | Must |
| FR-2.7 | Slider: beam width (20–50 mm) | Must |
| FR-2.8 | Slider: layer count (1–5) | Must |
| FR-2.9 | Input: crossing point positions (P1, P2, P3) | Should |
| FR-2.10 | Preset configurations (small, medium, large) | Should |
| FR-2.11 | Real-time geometry update on parameter change | Must |

#### 4.2.3 Stress Visualization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.12 | Calculate contact forces between beams | Should |
| FR-2.13 | Color-code beams by stress level (green→yellow→red) | Should |
| FR-2.14 | Display force magnitude on hover | Could |
| FR-2.15 | Toggle stress visualization on/off | Should |

#### 4.2.4 Export/Share

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.16 | Export configuration as JSON | Should |
| FR-2.17 | Import configuration from JSON | Should |
| FR-2.18 | Generate shareable URL with config parameters | Could |

---

### 4.3 Phase 3: Visual Enhancement (2 weeks)

#### 4.3.1 Materials and Textures

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | PBR wood materials (diffuse, normal, roughness maps) | Should |
| FR-3.2 | Multiple wood species options (oak, pine, bamboo) | Could |
| FR-3.3 | Wood grain direction aligned with beam orientation | Should |

#### 4.3.2 Environment

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.4 | Environment map for reflections | Could |
| FR-3.5 | Adjustable lighting (sun position, intensity) | Could |
| FR-3.6 | Ground plane with shadow | Should |
| FR-3.7 | Optional background presets (studio, outdoor, grid) | Could |

#### 4.3.3 Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.8 | Screenshot button (PNG export) | Should |
| FR-3.9 | Recording capability (WebM/GIF) | Could |
| FR-3.10 | Resolution selector for export | Could |

---

## 5. User Interface Design

### 5.1 Layout (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│  Da Vinci Bridge Simulator                    [?] [⚙] [↗]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    3D Viewport                              │
│                    (Three.js Canvas)                        │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [▶ Play] [⏸ Pause] [↺ Reset]  │  Speed: [1x ▼]  │  30 FPS │
├─────────────────────────────────────────────────────────────┤
│  Mode: [○ View] [● Remove Beam] [○ Add Load]                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Layout (Phase 2 additions)

```
┌──────────────┬──────────────────────────────────────────────┐
│   Controls   │                                              │
│              │                                              │
│ ─ Beam ────  │              3D Viewport                     │
│ Length: 300  │                                              │
│ [────●────]  │                                              │
│              │                                              │
│ Width: 30    │                                              │
│ [────●────]  │                                              │
│              │                                              │
│ Layers: 3    │                                              │
│ [────●────]  │                                              │
│              │                                              │
│ ─ Display ─  │                                              │
│ [✓] Stress   │                                              │
│ [✓] Grid     │                                              │
│              ├──────────────────────────────────────────────┤
│ [Export]     │  [◀◀] [◀] [▶ Play Assembly] [▶] [▶▶]  Step 3/12│
│ [Import]     │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 6. Data Model

### 6.1 Bridge Configuration Schema

```typescript
interface BridgeConfiguration {
  version: "1.0";
  metadata: {
    name: string;
    created: string;  // ISO 8601
    author?: string;
  };
  parameters: {
    beam: {
      length: number;    // mm
      width: number;     // mm
      thickness: number; // mm
    };
    crossing: {
      P1: number;  // 0-1 ratio
      P2: number;
      P3: number;
    };
    layers: number;
  };
  physics: {
    friction: number;      // coefficient
    gravity: number;       // m/s²
  };
}
```

### 6.2 Runtime State

```typescript
interface SimulationState {
  status: 'paused' | 'running' | 'stepping';
  mode: 'view' | 'remove' | 'load';
  time: number;           // simulation time in seconds
  beams: BeamState[];
  scaffolding: boolean;   // true if scaffolding present
  loads: LoadState[];
}

interface BeamState {
  id: string;
  type: 'vertical' | 'horizontal';
  layer: number;
  position: [number, number, number];
  rotation: [number, number, number, number];  // quaternion
  isRemoved: boolean;
  stress?: number;  // Phase 2: contact force magnitude
}
```

---

## 7. Technical Implementation Notes

### 7.1 Rapier Integration

```typescript
// Initialize physics world
import RAPIER from '@dimforge/rapier3d';

await RAPIER.init();
const gravity = { x: 0, y: -9.81, z: 0 };
const world = new RAPIER.World(gravity);

// Create beam rigid body
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(x, y, z);
const rigidBody = world.createRigidBody(rigidBodyDesc);

// Create beam collider with friction
const colliderDesc = RAPIER.ColliderDesc.cuboid(
  length/2, width/2, thickness/2
)
  .setFriction(0.4)
  .setRestitution(0.1);
world.createCollider(colliderDesc, rigidBody);

// Simulation loop (fixed timestep)
function simulate() {
  world.step();
  updateThreeJSMeshes();
  requestAnimationFrame(simulate);
}
```

### 7.2 Scaffolding Implementation

Scaffolding uses **kinematic** bodies (position-controlled, not affected by forces) that can be disabled to release the bridge:

```typescript
// Create scaffolding as kinematic
const scaffoldDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
  .setTranslation(x, y, z);
const scaffold = world.createRigidBody(scaffoldDesc);

// Release scaffolding
function releaseScaffolding() {
  scaffoldBodies.forEach(body => {
    world.removeRigidBody(body);
  });
}
```

### 7.3 Beam Removal Interaction

```typescript
// Raycasting for beam selection
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera);

const intersects = raycaster.intersectObjects(beamMeshes);
if (intersects.length > 0 && mode === 'remove') {
  const beamMesh = intersects[0].object;
  const beamId = beamMesh.userData.beamId;
  
  // Remove from physics world
  const rigidBody = beamBodies.get(beamId);
  world.removeRigidBody(rigidBody);
  
  // Remove from scene
  scene.remove(beamMesh);
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Area | Test Cases |
|------|------------|
| Geometry generation | Correct beam count for each layer count |
| Parameter validation | Reject invalid beam dimensions |
| Config serialization | Round-trip JSON export/import |

### 8.2 Integration Tests

| Scenario | Expected Result |
|----------|-----------------|
| Build 3-layer bridge, release scaffolding | Bridge stands for 10+ seconds |
| Remove center vertical beam | Bridge collapses within 2 seconds |
| Apply 10N load to center | Bridge deforms but doesn't collapse |
| Friction = 0 | Bridge collapses immediately |

### 8.3 Performance Tests

| Test | Target |
|------|--------|
| 20 beams, desktop Chrome | ≥60 FPS |
| 20 beams, mobile Safari | ≥30 FPS |
| 50 beams, desktop Chrome | ≥30 FPS |

---

## 9. Timeline

| Phase | Duration | Milestones |
|-------|----------|------------|
| **Phase 1** | Weeks 1–6 | |
| Week 1–2 | | Project setup, Three.js + Rapier integration, basic beam rendering |
| Week 3–4 | | Geometry generation from parameters, scaffolding system |
| Week 5 | | Beam removal, load application, camera controls |
| Week 6 | | UI polish, reset functionality, performance optimization |
| **Phase 2** | Weeks 7–10 | |
| Week 7–8 | | Step-by-step assembly animation system |
| Week 9 | | Parameter controls, real-time updates |
| Week 10 | | Stress visualization, export/import |
| **Phase 3** | Weeks 11–12 | |
| Week 11 | | PBR materials, wood textures |
| Week 12 | | Environment, lighting, screenshot/recording |

---

## 10. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Physics instability (jitter) | Medium | High | Increase solver iterations; tune friction; use fixed timestep |
| Performance on mobile | Medium | Medium | Reduce beam count option; simplified physics mode |
| Rapier WASM loading issues | Low | High | Fallback to Cannon.js; async loading with progress indicator |
| Geometric model inaccuracy | Low | High | Validate against physical model; unit tests for beam positions |
| Scope creep | High | Medium | Strict phase gates; defer "Could" requirements |

---

## 11. Success Metrics

### 11.1 Phase 1 Success Criteria

- [ ] Bridge self-supports when scaffolding released (friction = 0.4)
- [ ] Bridge collapses when center beam removed
- [ ] Runs at ≥30 FPS on target hardware
- [ ] Page load <3 seconds
- [ ] Reset restores initial state correctly

### 11.2 Phase 2 Success Criteria

- [ ] Assembly animation completes without physics errors
- [ ] Parameter changes reflect in <500ms
- [ ] Stress visualization correlates with contact forces
- [ ] Export/import produces identical simulations

### 11.3 Phase 3 Success Criteria

- [ ] Visual quality suitable for presentations
- [ ] Screenshot export works in all major browsers
- [ ] No performance regression from Phase 2

---

## 12. Future Considerations (Post-MVP)

These items are explicitly out of scope for v1.0 but may be considered later:

1. **Multi-bridge comparison** — Side-by-side parameter comparison
2. **VR/AR mode** — Immersive assembly experience
3. **Structural analysis export** — Generate data for FEA tools
4. **Collaborative building** — Real-time multiplayer assembly
5. **Physical build guide** — Generate cut lists and instructions

---

## Appendix A: Reference Materials

- Leonardo da Vinci's original sketches (Codex Atlanticus)
- Existing geometric model documentation (GitHub repo)
- Rapier physics documentation: <https://rapier.rs/docs/>
- Three.js documentation: <https://threejs.org/docs/>

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Friction lock | Self-supporting mechanism where load increases friction, preventing slip |
| Scaffolding | Temporary support structure removed after assembly |
| Kinematic body | Physics body whose position is controlled directly, not by forces |
| PBR | Physically-Based Rendering — realistic material system |
| WASM | WebAssembly — binary format for web applications |

---

*Document end*
