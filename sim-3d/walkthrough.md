# Walkthrough - 3D Da Vinci Bridge Simulator Setup

I have initialized the new 3D simulation project as requested. Here is what has been built:

## 1. Project Structure
- **[PRD_3D.md](file:///Users/lyc/Projects/Da%20vinci%20bridge/PRD_3D.md)**: Detailed requirements for the 3D version (in root).
- **`sim-3d/`**: New dedicated directory for the 3D project.
  - **Tech Stack**: Vite + Three.js + Rapier (Physics).
  - **[src/scene.ts](file:///Users/lyc/Projects/Da%20vinci%20bridge/sim-3d/src/scene.ts)**: Basic 3D scene setup (Lights, Grid, Camera).
  - **[src/physics.ts](file:///Users/lyc/Projects/Da%20vinci%20bridge/sim-3d/src/physics.ts)**: Rapier physics engine integration.
  - **[src/main.ts](file:///Users/lyc/Projects/Da%20vinci%20bridge/sim-3d/src/main.ts)**: Entry point demonstrating a physics-enabled falling cube.

## 2. Integration
- Modified **[index.html](file:///Users/lyc/Projects/Da%20vinci%20bridge/index.html)** in the root directory to include a link: "🚀 試試 3D 物理模擬版".
- This link points to the built version ([sim-3d/dist/index.html](file:///Users/lyc/Projects/Da%20vinci%20bridge/sim-3d/dist/index.html)), allowing it to work with the existing Python server.

## 3. How to Run

### Option A: View with Existing Server
1. Run [./start_server.sh](file:///Users/lyc/Projects/Da%20vinci%20bridge/start_server.sh) in the root directory.
2. Open the URL (e.g., `http://localhost:8080`).
3. Click the **"🚀 試試 3D 物理模擬版"** link in the header.

### Option B: Local Development (Recommended)
To work on the 3D code with hot-reloading:
```bash
cd sim-3d
npm run dev
```
Then open `http://localhost:5173`.

## 4. Next Steps
- Implement the Bridge generation logic (creating the beams programmatically).
- Add interaction controls (remove beams, apply load).
