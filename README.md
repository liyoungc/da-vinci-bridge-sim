# Da Vinci Bridge Simulator (達文西橋搭建模擬器)

![Status Live](https://img.shields.io/badge/Status-Live-success) ![License](https://img.shields.io/badge/License-MIT-blue)

**Interactive 3D/2D visualization of Leonardo da Vinci's self-supporting bridge design.**
**達文西自支撐橋樑設計的 3D/2D 互動視覺化模擬。**

🔗 **Live Demo (線上演示)**: [https://liyoungc.github.io/da-vinci-bridge-sim/](https://liyoungc.github.io/da-vinci-bridge-sim/)

---

## 📖 Introduction (簡介)
Without nails, ropes, or glues, this bridge relies solely on friction and gravity. This simulator deconstructs the geometry and logic behind the structure.
這座橋樑的設計精妙之處在於無需任何釘子、繩索或黏著劑，僅靠木材之間的摩擦力和重力就能自我支撐。本模擬器旨在解析其背後的幾何與搭建邏輯。

---

## 📐 Definitions & Parameters (定義與參數)

| Symbol (符號) | Description (說明) |
| :--- | :--- |
| **x** | **Beam Length (棍長)** |
| **y** | **Beam Width (棍寬)** |
| **z** | **Beam Thickness (棍厚)** |
| **a** | **Overlap Distance (末端距離)**: Distance from beam tip to the intersection point with the outer vertical beam.<br>水平棍的每一邊，與最外面的垂直棍交叉的中點，到自己邊緣的距離。 |
| **b** | **Cross Distance (中心距離)**: Distance from beam center to the intersection points.<br>垂直棍交叉中點到自己外緣的距離。 |
| **s** | **Spacing (間隙)**: Gap between adjacent horizontal beams due to physical stacking.<br>相鄰的水平棍間，因搭橋的現實因素，不可避免的間隙。 |
| **Pn** | **Position Index (位置索引)**: Calculated slot for placing beams ($P_n = B + (n-1) \times (y + s)$).<br>用於計算水平棍放置的具體位置。 |
| **P-cis** | **Cis Mode (同側模式)**: If blocked, search outward ($P_{n+1}$) then restart from $P_1$.<br>若目前位置不許可或已達到 Pmax，則從 Pn+1 開始尋找；若到 Pmax 則從 P1 開始。 |
| **P-trans** | **Trans Mode (對側模式)**: If blocked, search inward ($P_{n-1}$).<br>若目前位置不許可或已達到 Pmax，則從 Pn-1 開始尋找。 |

---

## ⚡ The Golden Rules (核心規則)

### 1. Mid-span Crossing (中間交叉)
**The Vertical beam ($V_n$) must rest ON TOP of the Horizontal beam ($H_n$).**
垂直方向的棍子 ($V_x$) 永遠壓在水平方向的棍子 ($H_x$) **上方**。

### 2. Tip Crossing (末端交叉)
**The tip of the Horizontal beam ($H_n$) must rest ON TOP of the Vertical beam ($V_n$).**
水平方向的棍子 ($H_x$) 的末端，永遠壓在垂直方向的棍子 ($V_x$) **上方**。

---

## 🏗️ Construction Guide (搭建法則)

### Phase 1: The Core Module (第一階段：核心模組)
*Goal: Establish the apex and layer 0.*
*目標：建立橋樑的頂點和第一層結構。*

1.  **Base (底座 V1)**: Place 2 beams vertically on the ground.
    **步驟 1**：將 2 根棍子 (V1) 平行放置在地面上，作為第一層支點。
2.  **Cross Beam (橫樑 H0)**: Place H0 across the two V1 beams.
    **步驟 2**：將 H0 橫跨在兩根 V1 上，置於正中央 (P1位置)。
3.  **Apex (頂點 V0)**: Place V0 vertically on top of H0 center.
    **步驟 3**：將 V0 (紅棍) 垂直放在 H0 的正中央上方，壓住綠棍。

### Phase 2: Layer 1 (第二階段：搭建第一層)
*Goal: Leverage physics to lift the structure.*
*目標：利用槓桿原理讓結構站立起來。*

4.  **Insert Legs (插入支撐腿 H1-R, H1-L)**:
    - **H Wedge**: Insert H1-R so its bottom tip rests on V0, and its upper edge supports V1.
    - **Physical Lock**: It wedges between V0 (Top) and V1 (Bottom).
    **步驟 4 & 5**：依「H斜插法」，將 H1-R/L 插入。其下緣壓在 V0 上，上緣頂住 V1。這形成了槓桿：V1 是支點，V0 是抗力點。

### Phase 3: Expansion (第三階段：擴展至第二層)
*Goal: Increase height and span.*
*目標：增加橋的高度與跨度。*

5.  **New Pivot (第二層橫樑 V2)**: Place V2 under H1, parallel to it ("Laminated" style).
    **步驟 6**：將 V2 分別放置在 H1 的「下方」，距離外側邊緣 a 的位置。
6.  **New Legs (第二層支撐腿 H2-R, H2-L)**:
    - Insert H2 to wedge between V1 (Top) and V2 (Bottom).
    - H2 becomes the new "Leg", V2 becomes the new Pivot.
    **步驟 7 & 8**：將 H2 插入，使其外側延伸穿過 V2「下方」，內側頂住 V1。現在 H2 取代 H1 成為新的腳，V1 被架到了半空中。

### Summary (總結)
Values are calculated using a **Reciprocal Frame (互承結構)** logic. Every beam supports another while being supported itself.
每一根棍子都既支撐別人，也被別人支撐。

---
*Created by [liyoungc](https://github.com/liyoungc)*
