# ROOT.WORKS — Game Wiki & Engineering Manual

Welcome to the official **ROOT.WORKS Systems Engineering Manual**. This documentation provides a comprehensive operational overview of the logistical conduit networks, digital automation grids, automated routing systems, programmable logic controls, and advanced energy generation architectures available in the game.

---

## Table of Contents
1. [Keyboard Controls, Console Commands, & Shortcuts](#1-keyboard-controls-console-commands--shortcuts)
2. [Logistics & Fluid Conduit Infrastructure](#2-logistics--fluid-conduit-infrastructure)
3. [Technology & Progression Stages](#3-technology--progression-stages)
4. [Digital Data Grid (AE-Style Automation)](#4-digital-data-grid-ae-style-automation)
5. [Programmable Logic Controllers (PLC) Scripting](#5-programmable-logic-controllers-plc-scripting)
6. [Rail Transport & Train Logistics](#6-rail-transport--train-logistics)
7. [Advanced Reactor Engineering & High-Yield Power](#7-advanced-reactor-engineering--high-yield-power)
8. [Industrial Hazards & Critical System Failures](#8-industrial-hazards--critical-system-failures)

---

## 1. Keyboard Controls, Console Commands, & Shortcuts

Efficient factory oversight requires mastering the keyboard shortcuts and control configurations built into the interface.

### General Movement & Mining
* **Move**: `W`, `A`, `S`, `D` (or Arrow Keys)
* **Sprint**: Hold `SHIFT` (increases movement speed; unavailable when hunger or thirst is depleted)
* **Speed-Build**: Hold `SPACE` while moving with a selected blueprint to queue placements rapidly
* **Mine / Harvest**: Stand on a tile and hold `F` (mining speed scales dynamically depending on whether you have equipped the appropriate tool)

### Interface Menus
* **Terminal Access**: `E` when standing near or on a machine to open its interface
* **Hand Crafting Menu**: `C` (toggles the basic hand-crafting or advanced table-crafting menu depending on nearby machines)
* **Build Menu**: `B` (contains categories for Machineries, Logistics, Tools, and the Calculator)
* **Equipment & Usables Menu**: `U` (manages consumable food, water, and hand tool equipment)
* **Guide & Controls Menu**: `G` (accesses game controls and the Auto-Wiki search engine)

### Routing & Logistics Configuration
* **Initiate Routing Mode**: `L` (activates manual routing path setup)
* **Cycle Network Type**: `T` (cycles through available conduit pipe types in routing or building modes)
* **Select Network from Menu**: `M` (opens a directory map of available conduit types)
* **Cancel Active Action**: `ESC` (closes menus, clears placement blueprints, or cancels current routing actions)
* **Confirm Queue**: `Enter` (confirms all blueprinted machine or conduit placements currently staged in the queue)
* **Cancel Queue**: `ESC` (restores items in the placement queue back to your inventory)

### Advanced Debugging & Administration
* **Console Prompt**: `/` (opens command line interface)
  * `/give <item_id> <quantity>`: Spawns the specified item in your inventory.
  * `/give all`: Adds every registered item and machine in the database to your inventory.
  * `/tick rate <multiplier>`: Accelerates or decelerates the game's simulation tick speed (e.g., `/tick rate 5.0`). Use `/tick rate default` to reset.
* **Database Dump**: `SHIFT + J` (snapshots the entire item registry, recipes, and machine definitions, copying the data to your system clipboard)
* **Save Game**: `SHIFT + O` (serializes the game state, saves to local storage, and copies a Base64-encoded save string to the clipboard)
* **Load Game**: `SHIFT + L` (prompts for a Base64 save string; imports and deserializes saved states)
* **Toggle Agent Mode**: `CTRL + SHIFT + Y` (activates/deactivates automated agent controls)
* **Toggle Agent Recording**: `CTRL + SHIFT + Z` (starts or stops media recording of agent automation paths)
* **Toggle Creative Mode**: `SHIFT + ;` or `SHIFT + :` (enables no-cost construction and infinite item consumption)

---

## 2. Logistics & Fluid Conduit Infrastructure

 con-duct networks are separated into strict chemical and physical channels. Running materials through incompatible networks is prevented by the game's boundary logic, and matching ports must be correctly aligned during machine construction.

### Conduit Database

| Network Name | Associated Item ID | Material Color | Flow Restrictions & Mechanical Notes |
| :--- | :--- | :--- | :--- |
| **Item** | `item_pipe` | Dark Grey `#424242` | Basic solid item transport (ores, components, plates). |
| **Heavy Item** | `item_pipe_heavy` | Dark Blue-Grey `#37474f`| High-capacity solid item transport. Moves up to 12 items in a single tick. |
| **Iron** | `iron_pipe` | Bright Red `#f44336` | Molten Lava transport. Engineered for extreme thermal loads. |
| **Copper** | `copper_pipe` | Light Blue `#03a9f4` | Water, Brine, and Heavy Water transport. Primary cooling medium. |
| **Brass** | `brass_pipe` | Yellow `#fbc02d` | Steam transport. Handles medium-pressure gas dynamics. |
| **Heavy Brass** | `brass_pipe_heavy` | Gold `#f57c00` | Reinforced steam transport for high-volume pressure drops. |
| **Glass** | `glass_pipe` | Cyan `#00bcd4` | Gas transport (Oxygen, Hydrogen, Sulfur Dioxide, Chlorine, Petroleum Gas, Unrefined Gas, Nitrogen). |
| **Lead Lined** | `lead_lined_pipe` | Lime Green `#8bc34a`| Corrosive chemical acid transport (Sulfuric Acid). |
| **Steel** | `steel_pipe` | Slate Grey `#90a4ae` | Hydrocarbons (Crude Oil, Semi-refined Oil, Heavy Oil, Light Oil, Naphtha, Liquid Plastic). |
| **Insulated** | `insulated_pipe` | Dark Blue `#1565c0` | Sub-zero cryogenics transport (Liquid Nitrogen, Superheated/Hot Nitrogen). |
| **Gold-Lead** | `gold_lead_pipe` | Dark Yellow `#c51162`| Radiation-shielded conduit for Nuclear Waste routing. |
| **Plasmatic** | `plasma_conduit_pipe`| Bright Orange `#ff6d00`| Ultra-high temperature containment for Raw and Stabilized Plasma. |
| **Magnetic** | `magnetic_containment_pipe`| Deep Purple `#aa00ff`| Vacuum-sealed containment for Positron Streams and Antiprotons. |
| **Cables / Wires**| `wire_map` / `quartz_map` etc.| Various | Electricity grid transmission, defense signals, and CDH data grids. |

### Junction & Corner Geometry
All transport conduits utilize an indexed shape library (`LOGISTICS_SHAPES`) to handle path connections:
* **Straight lines** (`│`, `─`) handle linear flow.
* **Corners** (`└`, `┌`, `┐`, `┘`) redirect flow at 90-degree angles.
* **T-Junctions** (`┬`, `┤`, `┴`, `├`) split or merge flow.
* **Intersections** (`┼`) allow cross-connections.
* **Visual Modifiers**: Heavy pipe variants (e.g. Rails) display with thick lines (`┃`, `━`), while high-tech or hazardous pipelines (e.g., Acid, Hyper Wires, and Silicon-Copper) render with double-line structural art (`║`, `═`).

### Interface Filtering
Certain routing machines permit custom output logic:
* **Orange Output (Channel 1)**: Set via the first filter field.
* **Blue Output (Channel 2)**: Splitters only; controls the secondary output path.
* **Blacklist / Whitelist Toggle**: Selects whether filtered items are explicitly barred from passing (Blacklist) or are the only items permitted to pass (Whitelist).

---

## 3. Technology & Progression Stages

The factory progression is designed across several distinct scientific and industrial eras, each requiring the output of the former to unlock.

```text
[Hand Tools] ➔ [Steam Power & Gears] ➔ [Electric Grid] ➔ [Petrochemical] ➔ [Semiconductors] ➔ [Nuclear Fission] ➔ [Fusion & Plasma] ➔ [Quantum & Antimatter]
```

### Stage 1: Primitive Tools & Hand Logistics
* **Primary Activity**: Manual harvesting of logs, fiber, and stone. Farmland preparation with hand hoes and seed planting.
* **Logistics**: Hand transport.
* **Key Machines**: 
  * `machine_crafter` (Crafting Table): Unlocks basic structural recipes.
  * `machine_manual_grinder`: Hand-powered milling of wheat to flour.
  * `machine_manual_mixer`: Hand-mixing water and flour into dough.

### Stage 2: Steam & Kinetic Transmission
* **Primary Activity**: Coal mining, water pumping, and burning coal to generate high-pressure steam. Steam is harnessed to run kinetic machinery via gear systems and axles.
* **Logistics**: Basic Item Pipes and Copper Pipes.
* **Key Machines**:
  * `machine_coal_pump`: Hand-fed coal pump to extract raw water.
  * `machine_brass_boiler`: Consumes water and coal to generate Steam.
  * `machine_steam_engine`: Converts Steam into `kinetic_token` currencies.
  * `machine_steam_hammer`: Uses kinetic power to forge `puddled_iron_bloom` into pure `iron_ingot`s.
  * `machine_bronze_gear_miller`: Cuts plates into vital gear components.

### Stage 3: Electrification & Solid Chemistry
* **Primary Activity**: Transitioning from kinetic tokens to electrical current grids. Building coal-fired generation stations.
* **Logistics**: Copper Wires, Iron Pipes (Lava transport), and early chemical conduits.
* **Key Machines**:
  * `machine_generator` (Coal Generator): Converts coal into electrical energy.
  * `machine_magmaeous_crucible`: Melts stone and coal into molten Lava.
  * `machine_alloying_smelter`: Uses Lava heat to smelt Brass and Bronze alloys.
  * `machine_furnace_electric`: Highly efficient smelting utilizing electric elements.
  * `machine_assembler`: Automated multiple-input crafting.

### Stage 4: Petrochemical & Hydrocarbons
* **Primary Activity**: Deep-well oil extraction, multi-stage distillation, cracking, and polymer synthesis.
* **Logistics**: Steel Pipes (oil transit), Lead Lined Pipes (acids), and Glass Pipes (gases).
* **Key Machines**:
  * `machine_pumpjack`: Extracts `crude_oil` from underground deposits.
  * `machine_heavy_tower`: Distills crude into `semi_refined_oil`, `heavy_oil`, and toxic `sour_water`.
  * `machine_light_tower` & `machine_gas_tower`: Isolates light oils, unrefined gases, and petroleum gas.
  * `machine_chemical_mixer`: Produces early industrial solvents like `sulfuric_acid`.
  * `machine_polymerizer`: Combines naphtha and chlorine into `liquid_plastic`.

### Stage 5: Semiconductors & Photolithography
* **Primary Activity**: Purification of sand to high-grade silica, crystal pulling, wafer slicing, polishing, and cleanroom semiconductor fabrication.
* **Logistics**: Quartz Data Cables and Glass Gas Pipes.
* **Key Machines**:
  * `machine_sand_washer` ➔ `machine_thermal_desorber` ➔ `machine_magnetic_separator` ➔ `machine_acid_leaching_vat` ➔ `machine_flotation_cell` ➔ `machine_calcination_kiln` ➔ `machine_arc_purifier`: The **7-stage sand purification pipeline** resulting in `pure_silica`.
  * `machine_czochralski_puller`: Pulls raw silica into a single-crystal `silicon_ingot` (requires HEPA cleanroom containment).
  * `machine_wafer_saw` & `machine_wafer_polisher`: Slices and polishes raw wafers.
  * `machine_hepa_purifier`: Scrubs the air of dust particles, enabling operation of sensitive optic pullers and lithographers in a 13x13 zone.
  * `machine_stencil_press`: Punches metallic masks for logic circuitry.
  * `machine_lithographer`: Exposes silicon wafers using ultraviolet light through pressed masks to manufacture advanced Integrated Circuits (`cpu_ic`, `ram_ic`, etc.).

### Stage 6: Nuclear Fission Core Infrastructure
* **Primary Activity**: Processing radioactive ores, chemical enrichment, assembling fuel rods, running a water-cooled reactor core, and managing nuclear waste.
* **Logistics**: Gold-Lead Pipes (Waste), Insulated Pipes, and Wires.
* **Key Machines**:
  * `machine_rock_breaker`: Crushes stone and ores to pulverized form.
  * `machine_slurry_filter_press` & `machine_yellowcake_precipitator`: Refines uranium slurry into yellowcake.
  * `machine_fluorination_gasifier`: Acid-washes yellowcake into gasified `enriched_uranium`.
  * `machine_fuel_rod_assembler`: Caps enriched uranium inside steel pipe structures to yield `uranium_fuel_rod`s.
  * `machine_fission_reactor`: High-yield water-cooled reactor core.
  * `machine_steam_turbine`: Consumes high-pressure steam from reactor cooling loops to generate major electrical reserves.

### Stage 7: Advanced Fusion & Plasma Containment
* **Primary Activity**: High-energy particle collisions, magnetic plasma pinching, cryocooled helium buffers, and high-temperature power loops.
* **Logistics**: Plasmatic Superconductors, Plasmatic Conduits, and Silicon-Copper (SiCu) Cables.
* **Key Machines**:
  * `machine_particle_collider`: Collides isotopes under high voltage to synthesize Radium and Deuterium/Tritium.
  * `machine_cryocooler`: Refrigerates nitrogen gas to sub-zero Liquid Nitrogen.
  * `machine_primitive_plasma_tap`: Siphons raw plasma from thermal containment.
  * `machine_plasma_manifold`: Stably binds raw plasma with water into `stabilized_plasma`.
  * `machine_mhd_generator` (Magnetohydrodynamic Generator): Generates massive electrical current by passing stabilized plasma through magnetic channels.
  * `machine_fusion_reactor`: Combines Deuterium and Tritium to generate extreme heat, requiring a robust SiCu Cable manifold and Mega Transformers to dissipate the current.

### Stage 8: Quantum & Antimatter Synthesis (The End-Game)
* **Primary Activity**: Synthesizing antimatter, maintaining ontological field alignment, and manufacturing pseudo-matter alloys.
* **Logistics**: Magnetic Containment Pipes and Quantum Fiber Cables.
* **Key Machines**:
  * `machine_qe_forge` (Quantum Entanglement Forge): Forges quantum circuits and entangled pairs.
  * `machine_pair_production_chamber` & `machine_penning_trap_array`: Sifts positrons and antiprotons from high-energy radiation.
  * `machine_magnetic_confinement_ring`: Compresses antiprotons into `antimatter_pellet`s.
  * `machine_antimatter_containment_vessel`: Suspends pellets in a secure magnetic field, outputting transportable `antimatter_cell`s.
  * `machine_annihilation_reactor`: Reacts matter and antimatter to output vast power. Requires constant synchronization with a `machine_quantum_stabilizer`.

---

## 4. Digital Data Grid (AE-Style Automation)

The **Digital Data Grid** is a centralized storage and processing network that digitizes physical items and fluid volumes into a unified data structure, bypassing traditional mechanical sorting.

```
[Import Uplink] ➔ (Adds items) ➔ [Central Digital Hub] ➔ [Disk / Tank Storage]
                                        ||
                                        ╠═➔ [Digital Crafter] (Executes pattern)
                                        ╚═➔ [Export Downlink] (Pulls items out)
```

### Digital Grid Infrastructure
* **Central Digital Hub (CDH)**: The master routing brain. It runs network checks every second, index-linking storage drives, processing import/export priorities, and coordinating digital crafters. Requires **20 kW** baseline electrical power.
* **Digital Disk Drive**: Stores up to **5,000** solid items, plates, wafers, or integrated circuits.
* **Digital Tanks**: Dedicated digital fluid storage nodes:
  * `machine_digital_fluid_tank`: Stores 50,000 units of Water, Lava, Brine, Heavy Water, or Sour Water.
  * `machine_digital_gas_tank`: Stores 50,000 units of Steam, Oxygen, Hydrogen, Nitrogen, Liquid Nitrogen, or Chlorine.
  * `machine_digital_acid_tank`: Stores 50,000 units of Sulfuric Acid.
* **Import Uplink**: Automatically drains adjacent physical buffer inventories, pushing the contents directly into the digital storage grid.
* **Export Downlink**: Continuously extracts specified items from the digital storage grid and deposits them into physical pipes or chests.
* **Digital Exporter**: Scans the machine placed directly in front of its orange port and automatically extracts all internal products, routing them back to the CDH.
* **Grid Crafting Terminal**: Provides an interface for players to manually view all digitized items in the network, extract them into player inventory, or manually craft items using the digital stockpile.

### Automated Digital Crafters & Pattern Matching
A **Digital Crafter** utilizes an internal pattern script to execute automated crafting.
1. **Defining Patterns**: Access the Digital Crafter's terminal interface. Specify the input ingredients and the output result (e.g., `2 copper_plate, 1 iron_plate ➔ 1 copper_wire`).
2. **On-Demand Requests**: In the Grid Crafting Terminal, items with registered patterns will display a "Request craft..." option.
3. **Sub-Job Generation**: If you request an item whose ingredients are missing but have registered sub-patterns, the CDH will automatically queue dependent sub-jobs.
4. **Predictive Space Capping**: Before a Digital Crafter begins a job, the CDH checks if there is sufficient space in the digital storage cells to hold the completed products. If storage is full, the job is put on standby to prevent items from being lost.
5. **Vacuum Extraction**: Unused ingredients or byproduct leftovers from canceled or completed recipes are automatically vacuum-extracted from the Digital Crafter's internal buffers and returned to storage.

---

## 5. Programmable Logic Controllers (PLC) Scripting

Automate your factory floor by deploying a **PLC Logic Processor** connected via Quartz Data Cables. The PLC interpreter compiles your script into an Abstract Syntax Tree (AST) and executes the logic every cycle.

### Input & Output Nodes
PLC scripts do not interact with the world directly; they communicate through specialized I/O nodes placed on the data network:
* **GP Input Node (`machine_gp_input`)**: Broadcasts a monitored digital storage metric or power grid value to a specified PLC input channel.
* **GP Output Node (`machine_gp_output`)**: Receives a value from a PLC output channel and uses it to broadcast a signal.
* **Physical GP Input Node (`machine_pgp_input`)**: Reads physical metrics from an adjacent machine (aligned with its port) and broadcasts it to a PLC channel.
* **Physical GP Output Node (`machine_pgp_output`)**: Pushes a control signal to an adjacent machine. Setting its target to `enabled` and outputting `0` will disable the target machine, while outputting `1` will enable it.

### Monitorable PGP Variables
When configuring a Physical GP Input node, you can set its `Target Item` to monitor the following parameters of the adjacent machine:
* `energy`: Current electrical energy buffer.
* `heat` or `temperature`: Internal temperature of thermal machines (e.g., Fission Reactor, Plasma Manifold).
* `timer` or `progress`: Current process timer status.
* `enabled`: Operations status (returns `1` if running, `0` if disabled by PLC).
* `fuelTime`: Remaining burn time of the current fuel cell.
* `waste`: The combined amount of radioactive nuclear waste sitting in the machine's internal buffers.
* `<item_id>` or `item:<item_id>`: Monitors the exact stock of a specific item inside the target machine.

### PLC Language Syntax Guide
The PLC runtime supports variables, conditional execution blocks, comparison expressions, and arithmetic operations.

#### Grammar Specifications
* **Assignments**: `variable = value`
* **Conditionals**: 
  ```pascal
  IF <condition> THEN
      // code
  ELSE
      // code
  ENDIF
  ```
* **Channel Readings**: `IN(channel_index)` (where `channel_index` is the integer ID of your GP/PGP input node).
* **Channel Writes**: `OUT(channel_index) = value`
* **Operators**: `>`, `<`, `>=`, `<=`, `==`, `!=`, `+`, `-`, `*`, `/`

#### PLC Script Examples

##### Example 1: Basic Battery-Saving Coal Burner
Monitors the power of an electrical storage bank on Channel 0. If current storage falls below 5,000 kJ, it outputs `1` to Channel 1, enabling a backup generator. Once charged above 75,000 kJ, it outputs `0` to shut down the generator.
```pascal
// Monitor battery storage via IN(0)
power = IN(0)

IF power < 5000 THEN
    OUT(1) = 1 // Enable Generator
ENDIF

IF power > 75000 THEN
    OUT(1) = 0 // Disable Generator
ENDIF
```

##### Example 2: Fission Reactor Core Thermal Cutoff
Reads core temperature from a Fission Reactor using a PGP Input Node on Channel 2, and monitors internal water reserves on Channel 3. If temperature exceeds 8,500K, or if water falls below 5 units, it immediately disables the reactor core via a PGP Output Node assigned to Channel 4.
```pascal
temp = IN(2)
water_reserves = IN(3)

IF temp > 8500 THEN
    OUT(4) = 0 // Emergency Cutoff
ELSE
    IF water_reserves < 5 THEN
        OUT(4) = 0 // Low coolant shutdown
    ELSE
        OUT(4) = 1 // Safe operation
    ENDIF
ENDIF
```

---

## 6. Rail Transport & Train Logistics

As resource deposits exhaust, long-distance logistics are handled using the automated rail system.

```
[Train Depot] ➔ (Deploys Locomotive + Wagons)
     ||
     ╠═➔ [Train Stop A] (Load Cargo) ➔ [Condition: Wagon Full]
     ||
     ╚═➔ [Train Stop B] (Unload Cargo) ➔ [Condition: Wagon Empty]
```

### Rolling Stock
* **Locomotive**: The lead engine of the train. Requires constant fuel (Coal or high-density combustibles) to run.
* **Cargo Wagon**: Transports up to 500 solid items (ores, components, plates).
* **Fluid Wagon**: Transports up to 2,000 units of liquids (water, oil, acids, gases).

### Logistics Infrastructure
* **Train Stop**: An addressable station where trains dock. You can customize the station name via its terminal (e.g., `IRON_OUTPOST_1`).
* **Train Depot**: A construction and staging yard. Deploys trains onto the rail network by consuming a locomotive and selected wagons. It automatically transfers Coal from its internal inventory to any docked locomotive's fuel box.

### Schedule Rules & Conditions
Automated routing is controlled by assigning a schedule to a train at a Depot. A schedule consists of a list of Train Stops, each paired with a Departure Condition:
* `wait_full` (Wagons Full): The train remains at the station until all attached cargo or fluid wagons are at 100% capacity.
* `wait_empty` (Wagons Empty): The train remains at the station until its cargo/fluid cargo is completely discharged.
* `wait_timer` (Time Elapsed): The train remains at the station for a set duration in seconds (e.g., `wait_timer: 15`).
* `wait_inactivity` (Inactivity): The train departs if no cargo is loaded or unloaded for a specified number of seconds.

---

## 7. Advanced Reactor Engineering & High-Yield Power

Scaling high-tier factories requires transition from basic combustion to advanced atomic power generation.

### Water-Cooled Fission Reactor CORE
The Fission Reactor is a multi-tile structure utilizing a nuclear chain reaction to convert water into pressurized steam.

```
Inputs: [Uranium Fuel Rod] + [Water Coolant] 
               || (Fission Reaction)
Outputs: [Pressurized Steam] + [Nuclear Waste] + [Heat Energy]
```

* **Reaction Rates**: Placing a `uranium_fuel_rod` inside the core begins the reaction, generating **300K** of heat energy per second.
* **Control Rods**: Inserting a `graphite_control_rod` into the core dampens the fission reaction, reducing heat generation to a manageable **25K** per second. Control rods slowly degrade and break over time.
* **Cooling Loop**: Liquid Water must be pumped directly into the core. Every 40 units of water consumed reduces core heat by **200K** and outputs **320 units of Steam**.
* **Waste Management**: The reaction outputs `nuclear_waste` on a regular cycle. This waste must be extracted from the output buffer using Gold-Lead Pipes and routed to a `machine_waste_storage` facility. If the waste output buffer fills up completely, the core will generate an extra **500K** of uncoolable heat per second.

### Plasma-Pinched Fusion Reactor Core
A late-game power source generating high electrical output from controlled nuclear fusion.

```
Inputs: [Deuterium] + [Tritium] + [Liquid Nitrogen]
               || (Magnetically Pinched Fusion)
Outputs: [Superheated Nitrogen] + [Extreme Power Output]
```

* **Ignition Energy**: The fusion reaction cannot start cold. You must feed high-voltage charges into adjacent `machine_fusion_charger`s. Once the reactor's electrostatic charge exceeds **1,000,000 kJ**, ignition can be triggered.
* **Cryocooling**: The extreme temperatures of fusion require **Liquid Nitrogen** to preserve structural integrity. If Liquid Nitrogen falls below 10 units per cycle, the reactor core generates **50,000K** of structural heat per second.
* **The Silicon-Copper Manifold**: Generating electricity at this scale requires a surrounding manifold of high-capacity **SiCu Cables**. If the manifold is broken or absent during operation, the electrical current builds up as thermal stress, increasing reactor temperature by **100,000K** per second.
* **Grid Coupling**: High-voltage currents must be bridged directly to high-capacity **Mega Transformers** connected via Plasmatic Superconductors to prevent grid vaporization.

---

## 8. Industrial Hazards & Critical System Failures

Operating advanced machinery involves risks. Neglecting cooling buffers or control systems can result in catastrophic events that modify the surrounding terrain.

### 1. Plasma Breach
* **Cause**: Allowing the internal temperature of a Plasma Manifold or early Plasma Tap to reach critical thresholds, or failing to maintain stabilized magnetic confinement grids.
* **Consequences**: Triggers a high-temperature breach in a **10-tile radius**. This destroys all machines and logistics networks, vaporizes items on belts, and instantly reduces nearby player health by 80 points.

```text
[Plasma Leak] ➔ 10-Tile Destructive Radius ➔ Vaporizes Machinery & Logistics
```

### 2. Nuclear Meltdown
* **Cause**: Allowing a Fission Reactor CORE's temperature to reach **10,000K** (due to water starvation, missing control rods, or a blocked waste buffer), or feeding Superheated Nitrogen into a basic Cryocooler.
* **Consequences**: Triggers a nuclear detonation in a **25-tile radius**. This destroys all structures, wipes out pipe networks, and permanently converts the ground into radioactive barren soil. Players caught within the blast radius are instantly killed.

```text
[Reactor Core: 10,000K] ➔ 25-Tile Blast Radius ➔ Erases Structures ➔ Converts Ground to Barren Soil
```

### 3. Supernova Collapse
* **Cause**: Allowing a Fusion Reactor's core temperature to exceed **500,000K** (from nitrogen cooling starvation or a severed SiCu manifold), or running an Annihilation Reactor without adjacent Mega Transformers or connected SiCu cables.
* **Consequences**: Wipes out a massive **150-tile radius** (300 tiles total diameter). This destroys all machinery, scorches the terrain, converts soil into fused glass tiles, and kills players instantly.

```text
[Fusion Core: 500,000K] ➔ 150-Tile Wiping Radius ➔ Scorches Terrain ➔ Converts Ground to Fused Glass
```

### 4. Paradoxical Reality Collapse (The Game-Over Event)
* **Cause**: Allowing the Ontological Stability index of an active Annihilation Reactor to fall to **0%**. 

```
Ontological Index: [|||||..........] ➔ 0% ➔ REALITY ERASURE
```

* **Index Maintenance**: The Annihilation Reactor generates power by colliding matter and antimatter, disrupting local spacetime. To maintain ontological stability, an active reactor must be built within **7 tiles** of a powered, operational `machine_quantum_stabilizer` running on **1,000,000 kW** of constant electrical current. If the stabilizer goes offline, the reactor's Ontological Index drops by **15% per second**.
* **Consequences**: Once the index hits 0%, reality collapses. The world map is wiped clean, all machines, pipes, belts, and items are deleted, the player's health is set to -9999, and the screen is locked behind an unclosable "PARADOXICAL COLLAPSE" screen, requiring a fresh game restart.
