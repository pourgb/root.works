---
trigger: always_on
---

# ROOT.WORKS Game - Agent Rules & Architecture Guide

Welcome, AI Agent! If you are reading this, you are working on the ROOT.WORKS Game codebase. This project is a browser-based factory automation and logistics game.

Please adhere to the following architectural guidelines and rules to maintain a clean codebase:

## 1. Core Game Loop & State
- **`afac.html` is the heart of the game.** It contains the main game loop (`update(dt)`), canvas rendering, UI event listeners, and global state variables (`inventory`, `activeMachines`, `mapData`, etc.).
- The `update(dt)` function orchestrates all machine ticking, logistics processing, and WASM synchronization.
- **Do NOT add hardcoded machine definitions or items to `afac.html`.** The file must remain clean and focused on engine mechanics and UI.

## 2. Data Files (The Registry)
All static game data is decoupled from the main engine. When adding or modifying content, use the following files:
- **`data/machines.js`**: Contains the `MACHINE_DEFS` object and the global `recipes` array.
  - **Adding a Machine:** Define it in the `MACHINE_DEFS` object. Make sure to define its `id`, `name`, `color`, `rotations`, `energy`, `processTime`, and any `updateOverride` logic here.
  - **Adding a Recipe:** Add it to the `recipes` array at the bottom of the file (or inject it directly into the machine's `.recipes` array if it is machine-specific).
- **`data/items.js`**: Contains global item definitions, primarily the `ITEM_COLORS` registry.
  - **Adding an Item:** Any new item string used in recipes *must* have a corresponding color/entry registered in `ITEM_COLORS` here. If it is missing, the game will render it as a missing/broken asset.
- **Other Data Files**: Look for files like `agent_wrapper.js` for modular integrations.

## 3. WebAssembly (WASM) Backend
- Performance-intensive tasks (like massive pipe fluid networks or large-scale ticking) are offloaded to Rust.
- **`afac-wasm/src/lib.rs`**: The Rust source code for the backend logic.
- Ensure that JS-side state in `afac.html` and WASM state remain synchronized, especially progress bars, machine timers (`m.timer`), and energy/fuel consumption.

## 4. Coding Practices & Vibe
- **No Linux Commands:** This is a Windows 11 environment. Do not attempt to use `cat`, `sed`, `grep`, or `ls` in terminal commands. Use PowerShell or Python scripts instead.
- **Aesthetics First:** When designing UI or canvas elements, use modern web design principles (vibrant colors, clean layouts). Do not use generic placeholders.

## 5. UI and Mechanics
- Machines often have an `updateOverride(m, r, dt)` function inside `machines.js` which dictates their specific logic (e.g. `plasmaTick`).
- Logistics like Drones, Trains, and Belts have complex routing states. Always check existing helper functions in `afac.html` before writing new pathfinding logic.
