/**
 * Orbital Age: Heavy Rover Agent
 * A 3x3 autonomous mining and construction platform.
 */

export const RoverController = {
    rovers: [],

    spawn: function(x, y, worldId) {
        let r = {
            id: Math.random().toString(36).substr(2, 9),
            x: x, y: y, worldId: worldId,
            w: 3, h: 3,
            energy: 1000, maxEnergy: 5000,
            inv: {},
            orientation: 0, // 0: N, 1: E, 2: S, 3: W
            moving: false,
            timer: 0,
            targetX: x, targetY: y,
            dataTape: null, // Current task name
            taskState: 'idle', // internal state: 'moving', 'mining', 'depositing'
            isPOV: false,
            color: '#ff7043'
        };
        this.rovers.push(r);
        if (!window.rovers) window.rovers = [];
        window.rovers.push(r);
        return r;
    },

    launchRover: function() {
        console.log("ROVER MISSION INITIALIZED. DEPLOYING TO MARS COORDINATES...");
        // Start near Mars' center
        return this.spawn(750, 750, 'mars');
    },

    launchSatellite: function() {
        console.log("SATELLITE DEPLOYED. ESTABLISHING ORBITAL LINK...");
        // Satellites could be a different object type, but for now we'll just track the state
        if (!window.satellites) window.satellites = 0;
        window.satellites++;
        if(typeof floatText === 'function') floatText(window.player.x, window.player.y, "SATELLITE IN ORBIT", "#00e5ff");
    },

    tick: function(dt) {
        for (let r of this.rovers) {
            // 1. Solar Charge (Mars Day/Night cycle simulation)
            // Mars day is roughly the same as Earth, using game time
            let time = (Date.now() / 1000) % 60; // 60s day cycle for gameplay
            if (time < 30) { 
                r.energy = Math.min(r.maxEnergy, r.energy + 50 * dt); 
            }

            // 2. Movement Logic (Slow 3x3)
            if (r.moving) {
                r.timer += dt;
                if (r.timer >= 1.5) { // 1.5s per tile - deliberately slow
                    r.x = r.targetX;
                    r.y = r.targetY;
                    r.moving = false;
                    r.timer = 0;
                }
            }

            // 3. Autonomous Logic (Data Tape)
            if (!r.moving && r.dataTape) {
                this.handleTask(r, dt);
            }

            // 4. Automated Harvesting (Manual/Override if no task)
            if (!r.moving && !r.dataTape) {
                r.harvestTimer = (r.harvestTimer || 0) + dt;
                if (r.harvestTimer >= 2.0) { // Harvest every 2 seconds
                    r.harvestTimer = 0;
                    this.harvestNearby(r);
                }
            }
        }
    },

    handleTask: function(r, dt) {
        if (r.energy < 20) return; // Wait for solar charge

        if (r.dataTape === 'EXPLORE') {
            if (Math.random() < 0.01) { // 1% chance per tick to move
                let dx = Math.floor(Math.random() * 3) - 1;
                let dy = Math.floor(Math.random() * 3) - 1;
                this.move(r, dx * 3, dy * 3);
            }
        } else if (r.dataTape === 'MINE_AND_REFINE') {
            // Check inventory
            let totalItems = Object.values(r.inv).reduce((a, b) => a + b, 0);
            if (totalItems >= 50) {
                // Return to refinery
                if (!this.depositItems(r)) {
                    // Search for refinery (random walk for now, but heading towards center or known coords is better)
                    if (Math.random() < 0.05) {
                        let dx = Math.sign(750 - r.x); // Head towards center of map where silo/refinery usually is
                        let dy = Math.sign(750 - r.y);
                        this.move(r, dx * 3, dy * 3);
                    }
                }
            } else {
                // Mine
                r.harvestTimer = (r.harvestTimer || 0) + dt;
                if (r.harvestTimer >= 2.0) {
                    r.harvestTimer = 0;
                    if (!this.harvestNearby(r)) {
                        // Move to find more
                        let dx = Math.floor(Math.random() * 3) - 1;
                        let dy = Math.floor(Math.random() * 3) - 1;
                        this.move(r, dx * 3, dy * 3);
                    }
                }
            }
        }
    },

    harvestNearby: function(r) {
        if (r.energy < 5) return;
        // Check 5x5 area around rover (it's 3x3 itself)
        for (let y = r.y - 1; y <= r.y + 3; y++) {
            for (let x = r.x - 1; x <= r.x + 3; x++) {
                if (x < 0 || x >= 1500 || y < 0 || y >= 1500) continue;
                let tileId = window.worldMap[y * 1500 + x];
                let item = null;
                if (tileId === 61) item = 'mars_iron_ore';
                if (tileId === 62) item = 'mars_copper_ore';
                if (tileId === 63) item = 'regolith';
                
                if (item) {
                    r.inv[item] = (r.inv[item] || 0) + 1;
                    r.energy -= 5;
                    window.worldMap[y * 1500 + x] = 60; // Replace with Mars Surface
                    if(typeof floatText === 'function') floatText(r.x + 1, r.y + 1, `+1 ${item.replace(/_/g, ' ')}`, '#ff9800');
                    return; // Harvest one at a time
                }
            }
        }
    },

    depositItems: function(r) {
        // Look for Mars Refinery nearby
        for (let y = r.y - 2; y <= r.y + 4; y++) {
            for (let x = r.x - 2; x <= r.x + 4; x++) {
                if (x < 0 || x >= 1500 || y < 0 || y >= 1500) continue;
                let tId = window.worldMap[y * 1500 + x];
                if (tId >= 50000) {
                    let m = activeMachines[tId - 50000];
                    if (m && m.type === 'machine_mars_refinery') {
                        // Transfer all Mars ores
                        for (let k in r.inv) {
                            if (k.includes('mars') || k === 'regolith') {
                                m.inv = m.inv || {};
                                m.inv[k] = (m.inv[k] || 0) + r.inv[k];
                                delete r.inv[k];
                            }
                        }
                        if(typeof floatText === 'function') floatText(r.x + 1, r.y + 1, "CARGO UNLOADED", "#4caf50");
                        return true;
                    }
                }
            }
        }
        return false;
    },

    shipCargo: function(r) {
        let totalItems = Object.values(r.inv).reduce((a, b) => a + b, 0);
        if (totalItems === 0) return false;
        
        // In a real scenario, you'd need to be at a landing pad.
        // For now, we'll allow shipping from anywhere if energy >= 500
        if (r.energy < 500) {
            if(typeof floatText === 'function') floatText(r.x + 1, r.y + 1, "LOW ENERGY FOR LAUNCH", "#f44336");
            return false;
        }

        r.energy -= 500;
        let cargo = { ...r.inv };
        r.inv = {};

        if(typeof floatText === 'function') floatText(r.x + 1, r.y + 1, "CARGO LAUNCHED!", "#03a9f4");
        
        // Transit delay: 20 seconds
        setTimeout(() => {
            for (let k in cargo) {
                window.hubInventory[k] = (window.hubInventory[k] || 0) + cargo[k];
            }
            if(typeof floatText === 'function') floatText(window.player.x, window.player.y, "MARS SHIPMENT ARRIVED AT HUB", "#4caf50");
        }, 20000);

        return true;
    },

    move: function(rover, dx, dy) {
        if (rover.moving || rover.energy < 10) return false;
        
        // Boundaries
        let nx = rover.x + dx;
        let ny = rover.y + dy;
        if (nx < 0 || ny < 0 || nx > 1497 || ny > 1497) return false;

        rover.targetX = nx;
        rover.targetY = ny;
        rover.moving = true;
        rover.energy -= 50; // Increased traversal cost
        return true;
    },

    renderPOV: function(rover) {
        // Returns an ASCII string for the planet terminal UI
        let w = 80, h = 40;
        let lines = [];
        
        // Header
        lines.push(`[ ROVER_ID: ${rover.id.toUpperCase()} ]   [ PWR: ${Math.floor(rover.energy)}/${rover.maxEnergy} EU ]`);
        lines.push(`[ LOC: ${Math.floor(rover.x)}, ${Math.floor(rover.y)} ] [ MARS SURFACE ]`);
        lines.push("-".repeat(w));

        // Simple Top-Down Radar View (10x10 area around rover)
        let viewDist = 15;
        for (let y = -viewDist; y <= viewDist; y++) {
            let row = "  ";
            for (let x = -viewDist; x <= viewDist; x++) {
                let worldX = Math.floor(rover.x) + x;
                let worldY = Math.floor(rover.y) + y;
                
                if (x === 0 && y === 0) row += "@"; // Rover center
                else if (worldX < 0 || worldX >= 1500 || worldY < 0 || worldY >= 1500) row += " ";
                else {
                    let tid = window.worldMap[worldY * 1500 + worldX];
                    if (tid === 60) row += "."; // Mars dirt
                    else if (tid >= 61 && tid <= 63) row += "*"; // Ore
                    else if (tid >= 50000) row += "M"; // Machine
                    else row += " ";
                }
            }
            lines.push(row);
        }

        lines.push("-".repeat(w));
        lines.push(`STATUS: ${rover.moving ? "DRIVING..." : (rover.dataTape ? "AUTONOMOUS " + rover.dataTape : "STANDBY")}`);
        
        return lines.join("\n");
    },

    renderPOVCanvas: function(ctx, rover) {
        // Keep the original Canvas rendering if needed for other UIs
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < ctx.canvas.height; i += 4) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(ctx.canvas.width, i); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0, 255, 64, 0.05)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#00ff41';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`ROVER_ID: ${rover.id.toUpperCase()}`, 20, 40);
        ctx.fillText(`PWR: ${Math.floor(rover.energy)} / ${rover.maxEnergy} EU`, 20, 60);
        ctx.fillText(`LOC: ${Math.floor(rover.x)}, ${Math.floor(rover.y)} [MARS]`, 20, 80);
        if (rover.moving) ctx.fillText("STATUS: TREAD_DRIVE_ACTIVE...", 20, 100);
        else ctx.fillText("STATUS: STANDBY", 20, 100);
        ctx.restore();
    }
};
