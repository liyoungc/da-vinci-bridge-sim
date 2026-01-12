# Da Vinci Bridge Simulator (達文西橋搭建模擬器)

![Da Vinci Bridge Simulator](https://img.shields.io/badge/Status-Live-success) ![License](https://img.shields.io/badge/License-MIT-blue)

**Interactive 3D/2D visualization of Leonardo da Vinci's self-supporting bridge design.**

🔗 **Live Demo**: [https://liyoungc.github.io/da-vinci-bridge-sim/](https://liyoungc.github.io/da-vinci-bridge-sim/)

---

## 🌉 Overview (專案簡介)
Da Vinci's bridge design is a masterpiece of engineering that relies solely on friction and gravity—no nails, ropes, or glues required. This simulator helps users understand the geometry, physics, and construction logic behind this "Reciprocal Frame" structure.

The tool provides:
- **Top View (俯視圖)**: Understanding the "weave" pattern (P-cis/P-trans logic).
- **Side View (側視圖)**: Visualizing the arch rise and stacking order.

## 🛠️ Features (功能特色)
- **Dynamic Geometry**: Adjust beam length, width, thickness, and spacing.
- **Corner-Based Alignment**: rigorous physics simulation of how beams wedge together.
- **Theme Support**: Day ☀️ / Night 🌙 / Auto 🖥️ modes.
- **P-Positioning System**: Dynamic collision avoidance logic for beam placement.

---

## 📐 Core Rules (搭建法則)

The structure follows two "Golden Rules" at every intersection:

1.  **Mid-span Crossing (中間交叉)**: Vertical beams ($V_n$) must rest **ON TOP** of Horizontal beams ($H_n$).
2.  **Tip Crossing (末端交叉)**: The tips of Horizontal beams ($H_n$) must rest **ON TOP** of Vertical beams ($V_n$).

### Side View Topology
- **Layer 0 (Base)**: $V_0$ (Red) sits on $H_0$ (Green) which sits on $V_1$ (Pink).
- **Layer 1**: $H_1$ wedges between $V_0$ (top support) and $V_1$ (bottom support).
- **Layer 2**: $V_2$ attaches parallel to $H_1$. $H_2$ wedges between $V_1$ and $V_2$.

### Parameters (參數說明)

| Symbol | Description |
| :--- | :--- |
| **x** | Beam Length (棍長) |
| **y** | Beam Width (棍寬) |
| **z** | Beam Thickness (棍厚) |
| **a** | Overlap Distance (末端到交叉點的距離) |
| **b** | Cross Distance (中心到交叉點的距離) |
| **s** | Spacing (水平棍間隙) |

---

## 🚀 Deployment (如何部署)
This project is static HTML/JS/CSS and can be hosted anywhere.

### Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/liyoungc/da-vinci-bridge-sim.git
   ```
2. Open `index.html` in your browser.

### GitHub Pages
1. Go to **Settings > Pages**.
2. Source: **Deploy from a branch**.
3. Branch: **main** / **(root)**.
4. Save & Visit the generated URL.

---
*Created by [liyoungc](https://github.com/liyoungc)*
