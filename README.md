geminislop below for intro(please ignore the catgirl)
big note: game is unfinished(it never will be finished), hardlocks may have been fixed.
# ROOT.WORKS

Welcome to **ROOT.WORKS**, a highly optimized, browser-based factory automation, simulation, and logistics game. Build massive supply chains, construct train networks, write custom PLC scripts, harness plasma physics, and automate everything from simple agriculture to quantum teleportation.

---

## Key Features

* **Logistics & Transport**: Construct belts, pipes, drone pathways, and fully schedulable train networks to move materials across your factory.
* **WASM-Powered Engine**: Offloads performance-intensive calculations (like massive pipe fluid dynamics and cell grids) to a high-speed Rust WebAssembly backend.
* **Applied Energistics (AE) Grid**: Organize and autocraft items digitally with Central Data Hubs, import/export networks, and request channels.
* **PLC Scripting**: Write simple scripts in an in-game PLC terminal to monitor inputs, control machine gates, and dynamically automate your base.
* **Quantum Entanglement**: Entangle Quantum Routers to instantly teleport items and power across infinite distances—but beware of quantum decoherence cascades!
* **Advanced Energy & Physics**: Harness the power of Fission and Annihilation Reactors, control plasmatic conduits, and balance ontological stability.
* **Survival Elements**: Manage your sprint-induced exhaust, keep hunger and thirst at bay with agricultural farming, and craft advanced tools.

---

## How to Play Locally

The game runs entirely in the browser but requires a local web server to bypass CORS policy restrictions for loading the WebAssembly module.

### 1. Start a Local Server
Run a local HTTP server in the root of the project directory.

**Using Python:**
```powershell
python -m http.server 8000
```

**Using Node.js (http-server):**
```powershell
npx http-server -p 8000
```

### 2. Launch the Game
Open your web browser and navigate to:
```text
http://localhost:8000/afac.html
```
---
or you can access https://root-works.netlify.app/
which is hopefully, updated.
---

## Basic Controls

* **W / A / S / D**: Move player
* **SHIFT**: Sprint (consumes exhaust!)
* **F**: Mine block / Pick up machine
* **E**: Toggle inventory or open a highlighted machine's terminal
* **C**: Open crafting recipe book
* **B**: Open build menu (structures and logistics)
* **U**: Open survival quickbar (equip tools, consume food/water)
* **L**: Toggle Routing overlay mode
* **M**: Open routing network selector
* **ESC**: Close any active menus

---

## Project Architecture

* `afac.html`: The main visual front-end, styling, game loop orchestration, and UI layout.
* `data/`:
  * `machines.js`: Core static machine behavior configurations and logic templates.
  * `items.js`: Registry for materials, resources, and custom display color schemes.
* `js/`: Modular gameplay components (e.g., `train_system.js`).
* `afac-wasm/`: High-performance Rust backend compiled to WebAssembly for heavy simulation loads.
