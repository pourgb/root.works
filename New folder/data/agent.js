export class AgentController {
    constructor(worldMap, worldSize, mapPipes) {
        this.worldMap = worldMap;
        this.worldSize = worldSize;
        this.mapPipes = mapPipes;

        this.path = null;
        this.pathIndex = 0;
        this.currentMovePromise = null;
        this.currentMoveResolve = null;
        this.ghostMode = true; // By default we enable ghost mode for reliable AI pathing
        
        // Video Recorder State
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingName = 'root_works_agent_log';
    }

    startRecording(filename = 'root_works_agent_log') {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;
        
        const canvas = document.getElementById("gameCanvas");
        if (!canvas) {
            console.error("[AGENT] Canvas not found. Cannot start recording.");
            return;
        }

        this.recordingName = filename;
        this.recordedChunks = [];
        this.isRecording = true;

        // Create a hidden composite canvas to merge the WebGL game and the HTML UI
        const composite = document.createElement('canvas');
        composite.width = canvas.width || 1366;
        composite.height = canvas.height || 768;
        const ctx = composite.getContext('2d');

        try {
            // 15 FPS stream from the composite canvas
            const stream = composite.captureStream(15);
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                if (this.recordingInterval) clearInterval(this.recordingInterval);
                let blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = this.recordingName + '.webm';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            };

            this.mediaRecorder.start();

            // Manually draw the WebGL canvas and overlay the UI text 15 times a second
            this.recordingInterval = setInterval(() => {
                if (!this.isRecording) return;
                // Draw base game
                ctx.drawImage(canvas, 0, 0);

                // Draw Agent Terminal
                let term = document.getElementById('agent-terminal');
                if (term && term.style.display !== 'none') {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.fillRect(composite.width/2 - 250, 10, 500, 45);
                    ctx.fillStyle = '#00ff00';
                    ctx.font = 'bold 16px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(term.innerText, composite.width/2, 38);
                    ctx.textAlign = 'left';
                }

                // Draw Top-Left HUD
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(15, 15, 200, 120);
                let y = 35;
                ctx.font = 'bold 13px "Courier New", monospace';
                
                if (window.isAgentMode) {
                    ctx.fillStyle = '#9c27b0';
                    ctx.fillText("[ AGENT MODE ]", 25, y); y += 20;
                }
                ctx.fillStyle = '#ff0000';
                ctx.fillText("[ 🔴 RECORDING ]", 25, y); y += 20;
                
                let fps = document.getElementById('fps-counter');
                let coords = document.getElementById('coords');
                ctx.fillStyle = '#222';
                if (fps) { ctx.fillText(fps.innerText, 25, y); y += 20; }
                if (coords) { ctx.fillText(coords.innerText, 25, y); y += 20; }

            }, 1000 / 15);

            let ui = document.getElementById('recording-status');
            if (ui) ui.style.display = 'block';
            console.log(`[AGENT] Recording started: ${this.recordingName}.webm`);

        } catch (e) {
            console.error("[AGENT] Failed to initialize MediaRecorder.", e);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            let ui = document.getElementById('recording-status');
            if (ui) ui.style.display = 'none';
            console.log("[AGENT] Recording stopped. Downloading log...");
        }
    }

    // Polling API for the LLM agent to understand its surroundings instantly
    getGameState() {
        if (typeof window.player === 'undefined' || !this.worldMap) return null;

        const p = window.player;
        const radius = 50; // Increased to cover slightly beyond 1920x1080 screen (at 32px tiles)
        const startX = Math.max(0, Math.floor(p.x) - radius);
        const endX = Math.min(this.worldSize, Math.floor(p.x) + radius);
        const startY = Math.max(0, Math.floor(p.y) - radius);
        const endY = Math.min(this.worldSize, Math.floor(p.y) + radius);

        let nearbyMachines = [];
        let activeMachines = window.getActiveMachines ? window.getActiveMachines() : [];
        
        // Scan for machines in radius
        for (let i = 0; i < activeMachines.length; i++) {
            let m = activeMachines[i];
            if (!m) continue;
            let dx = Math.abs(m.x - p.x);
            let dy = Math.abs(m.y - p.y);
            if (dx <= radius && dy <= radius) {
                nearbyMachines.push({
                    id: i,
                    type: m.type || (m.def ? m.def.id : 'unknown'),
                    x: m.x,
                    y: m.y,
                    items: m.inv || {},
                    outBuffer: m.outBuffer || {},
                    energy: m.energy || 0,
                    ports: this.getMachinePorts(i)
                });
            }
        }

        // Localized resource scanning (ores, wood, stone)
        let nearbyResources = [];
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                let id = this.worldMap[y * this.worldSize + x];
                let type = this._getTileResource(id);
                if (type) {
                    nearbyResources.push({ x, y, type, tileId: id });
                }
            }
        }

        return {
            player: { x: Math.floor(p.x), y: Math.floor(p.y), hp: p.hp, hunger: p.hunger, thirst: p.thirst },
            inventory: Object.assign({}, window.inventory),
            equippedTool: p.equippedTool,
            status: this.path ? 'moving' : 'idle',
            nearbyMachines: nearbyMachines,
            nearbyResources: nearbyResources
        };
    }

    // Helper to identify resource types from tile IDs
    _getTileResource(id) {
        if (id === 3) return 'wood'; 
        if (id === 2 || id === 4 || id === 5) return 'wood_fiber'; 
        if (id >= 6 && id <= 8) return 'stone';
        if (id >= 10 && id <= 12) return 'iron_ore'; 
        if (id >= 13 && id <= 15) return 'copper_ore'; 
        if (id >= 16 && id <= 18) return 'coal';
        if (id >= 20 && id <= 22) return 'gold_ore'; 
        if (id >= 23 && id <= 25) return 'silver_ore'; 
        if (id >= 26 && id <= 28) return 'tin_ore';
        if (id >= 29 && id <= 31) return 'nickel_ore';
        if (id >= 33 && id <= 35) return 'zinc_ore';
        if (id >= 36 && id <= 38) return 'aluminium_ore';
        if (id >= 39 && id <= 41) return 'lead_ore';
        return null;
    }

    // Auto-Wiki API: Returns all recipes and machine definitions
    getAutoWiki() {
        let wiki = {
            handCrafting: [],
            machines: {}
        };

        if (window.recipes) {
            wiki.handCrafting = window.recipes.map(r => ({
                name: r.name || r.output.id,
                output: r.output,
                input: r.input,
                environment: r.env // "hand" or "table"
            }));
        }

        if (window.MACHINE_DEFS) {
            for (const [id, def] of Object.entries(window.MACHINE_DEFS)) {
                wiki.machines[id] = {
                    name: def.name,
                    energy: def.energy ? def.energy.type : 'none',
                    processTime: def.processTime || 0,
                    recipes: def.recipes || [],
                    size: def.rotations && def.rotations[0] ? { w: def.rotations[0].w, h: def.rotations[0].h } : { w: 1, h: 1 }
                };
            }
        }
        return wiki;
    }

    cancel() {
        if (this.currentMoveResolve) {
            this.currentMoveResolve(false); // resolve with false to indicate it was cancelled
            this.currentMoveResolve = null;
            this.currentMovePromise = null;
        }
        this.path = null;
        this.pathIndex = 0;
    }

    _isWalkable(x, y) {
        if (x < 0 || x >= this.worldSize || y < 0 || y >= this.worldSize) return false;
        
        let tileId = this.worldMap[Math.floor(y) * this.worldSize + Math.floor(x)];
        if (tileId === 0) return true; // Air/Empty Space
        
        // If agent is ghosting, ignore machines, only collide with indestructible things like edge mountains?
        // Basic afac.html collision logic: Most non-0 things are collidable except specific background tiles.
        if (this.ghostMode) return true;

        return false; // Very simplified, in real engine you'd check TILE_DEFS[tileId].collidable
    }

    async moveTo(targetX, targetY) {
        if (this.path) this.cancel();
        
        let startX = Math.floor(window.player.x);
        let startY = Math.floor(window.player.y);
        targetX = Math.floor(targetX);
        targetY = Math.floor(targetY);

        this.path = this._computeAStar(startX, startY, targetX, targetY);
        this.pathIndex = 0;

        if (!this.path) {
            console.log("[AGENT] No path found to target.");
            return Promise.resolve(false);
        }

        this.currentMovePromise = new Promise((resolve) => {
            this.currentMoveResolve = resolve;
        });

        return this.currentMovePromise;
    }

    // Quick inventory check
    getInventory() {
        return Object.assign({}, window.inventory);
    }

    // Check machine dimensions before placing
    getMachineInfo(itemId, rot = 0) {
        let mDef = window.MACHINE_DEFS ? window.MACHINE_DEFS[itemId] : null;
        if (!mDef) return { exists: false, error: `Unknown machine: ${itemId}` };
        let rDef = mDef.rotations[rot % mDef.rotations.length];
        return {
            exists: true,
            id: itemId,
            name: mDef.name,
            width: rDef.w,
            height: rDef.h,
            outX: rDef.outX,
            outY: rDef.outY,
            out2X: rDef.out2X,
            out2Y: rDef.out2Y,
            extraOuts: rDef.extraOuts || [],
            extraOut2s: rDef.extraOut2s || []
        };
    }

    // Get absolute port positions for an existing machine instance
    getMachinePorts(machineId) {
        let activeMachines = window.getActiveMachines();
        let m = activeMachines[machineId];
        if (!m) return null;

        let mDef = window.MACHINE_DEFS[m.type];
        if (!mDef) return null;
        let r = mDef.rotations[m.rotIndex || 0];

        let ports = {
            outputs: [],
            secondaryOutputs: [],
            inputs: [] // Inputs are the entire perimeter for now
        };

        // Primary Outputs (Orange)
        if (r.outX !== null && r.outY !== null) {
            ports.outputs.push({ x: m.x + r.outX, y: m.y + r.outY, type: 'primary' });
        }
        if (r.extraOuts) {
            r.extraOuts.forEach(p => ports.outputs.push({ x: m.x + p.x, y: m.y + p.y, type: 'primary_extra' }));
        }

        // Secondary Outputs / Inputs (Blue)
        if (r.out2X !== undefined && r.out2X !== null && r.out2Y !== null) {
            ports.secondaryOutputs.push({ x: m.x + r.out2X, y: m.y + r.out2Y, type: 'secondary' });
        }
        if (r.extraOut2s) {
            r.extraOut2s.forEach(p => ports.secondaryOutputs.push({ x: m.x + p.x, y: m.y + p.y, type: 'secondary_extra' }));
        }

        // Generate perimeter as "potential inputs"
        for (let x = -1; x <= r.w; x++) {
            ports.inputs.push({ x: m.x + x, y: m.y - 1 });
            ports.inputs.push({ x: m.x + x, y: m.y + r.h });
        }
        for (let y = 0; y < r.h; y++) {
            ports.inputs.push({ x: m.x - 1, y: m.y + y });
            ports.inputs.push({ x: m.x + r.w, y: m.y + y });
        }

        return ports;
    }

    async routeMachineToMachine(fromMId, toMId, network, fromPortType = 'output') {
        let portsFrom = this.getMachinePorts(fromMId);
        let portsTo = this.getMachinePorts(toMId);

        if (!portsFrom || !portsTo) return { ok: false, reason: "One or both machines not found." };

        let startCandidates = [];
        if (fromPortType === 'output') startCandidates = portsFrom.outputs;
        else if (fromPortType === 'output2') startCandidates = portsFrom.secondaryOutputs;
        else if (fromPortType === 'any') startCandidates = [...portsFrom.outputs, ...portsFrom.secondaryOutputs, ...portsFrom.inputs];
        else startCandidates = portsFrom.inputs;

        if (startCandidates.length === 0) return { ok: false, reason: `No ports found for type '${fromPortType}' on source machine.` };

        // Best start/end pair based on distance
        let bestStart = null;
        let bestEnd = null;
        let minDist = Infinity;

        for (let s of startCandidates) {
            for (let e of portsTo.inputs) {
                let d = Math.abs(s.x - e.x) + Math.abs(s.y - e.y);
                if (d < minDist) {
                    minDist = d;
                    bestStart = s;
                    bestEnd = e;
                }
            }
        }

        return await this.routeNetwork(bestStart.x, bestStart.y, bestEnd.x, bestEnd.y, network);
    }

    // Pre-flight check: can we build here?
    canBuildAt(itemId, x, y, rot = 0) {
        x = Math.floor(x); y = Math.floor(y);
        let mDef = window.MACHINE_DEFS ? window.MACHINE_DEFS[itemId] : null;
        if (!mDef) return { ok: false, reason: `Unknown machine ID: '${itemId}'` };

        let rDef = mDef.rotations[rot % mDef.rotations.length];
        let worldMap = this.worldMap;
        let worldSize = this.worldSize;

        // Bounds check
        if (x < 0 || y < 0 || x + rDef.w > worldSize || y + rDef.h > worldSize) {
            return { ok: false, reason: `Out of bounds: machine ${rDef.w}x${rDef.h} at (${x},${y}) exceeds map` };
        }

        // Collision check — scan the full footprint
        for (let dy = 0; dy < rDef.h; dy++) {
            for (let dx = 0; dx < rDef.w; dx++) {
                let tileVal = worldMap[(y + dy) * worldSize + (x + dx)];
                if (tileVal >= 50000) {
                    let blockingMachine = window.getActiveMachines()[tileVal - 50000];
                    let blockingName = blockingMachine ? (blockingMachine.def ? blockingMachine.def.name : blockingMachine.type) : 'unknown';
                    return { ok: false, reason: `Blocked at (${x+dx},${y+dy}) by existing machine: ${blockingName}` };
                }
            }
        }

        // Inventory check (skip in creative mode)
        let hasItem = (window.inventory[itemId] || 0) > 0;
        let isCreative = window.getCreativeMode ? window.getCreativeMode() : false;
        if (!hasItem && !isCreative) {
            return { ok: false, reason: `Missing '${itemId}' in inventory (have: ${window.inventory[itemId] || 0})` };
        }

        return { ok: true, size: { w: rDef.w, h: rDef.h } };
    }

    // Direct interaction overrides
    async buildAt(itemId, network, x, y, rot = 0) {
        x = Math.floor(x); y = Math.floor(y);

        // Logistics (pipes/belts) — place directly, no size/collision issues for single tiles
        if (network) {
            console.log(`[AGENT] Build logistics ${itemId} (${network}) at ${x}, ${y}`);
            window.placementQueue = [{
                type: 'logistics',
                id: itemId,
                network: network,
                px: x,
                py: y,
                sId: 0
            }];
            window.confirmPlacements();
            return { success: true, type: 'logistics' };
        }

        // Machine placement — validate everything
        let mDef = window.MACHINE_DEFS ? window.MACHINE_DEFS[itemId] : null;
        if (!mDef) {
            console.error(`[AGENT] Unknown machine: ${itemId}`);
            return { success: false, error: `Unknown machine ID: '${itemId}'` };
        }

        let rDef = mDef.rotations[rot % mDef.rotations.length];

        // Check for collisions
        let check = this.canBuildAt(itemId, x, y, rot);
        if (!check.ok) {
            console.warn(`[AGENT] Cannot build ${itemId} at (${x},${y}): ${check.reason}`);
            return { success: false, error: check.reason };
        }

        // Capture underlying tiles before overwriting
        let worldMap = window.getWorldMap();
        let worldSize = window.getWorldSize();
        let u = new Uint16Array(rDef.w * rDef.h);
        for (let dy = 0; dy < rDef.h; dy++) {
            for (let dx = 0; dx < rDef.w; dx++) {
                u[dy * rDef.w + dx] = worldMap[(y + dy) * worldSize + (x + dx)];
            }
        }

        // Deduct from inventory (unless creative mode)
        let isCreative = window.getCreativeMode ? window.getCreativeMode() : false;
        if (!isCreative && window.inventory[itemId]) {
            window.inventory[itemId]--;
            if (window.inventory[itemId] <= 0) delete window.inventory[itemId];
        }

        console.log(`[AGENT] Build ${mDef.name} (${rDef.w}x${rDef.h}) at ${x}, ${y}`);
        window.placementQueue = [{
            type: 'machine',
            id: itemId,
            px: x,
            py: y,
            rotIndex: rot % mDef.rotations.length,
            mDef: mDef,
            rDef: rDef,
            u: u
        }];
        window.confirmPlacements();
        return {
            success: true,
            type: 'machine',
            name: mDef.name,
            size: { w: rDef.w, h: rDef.h },
            outPort: rDef.outX != null ? { x: x + rDef.outX, y: y + rDef.outY } : null,
            out2Port: rDef.out2X != null ? { x: x + rDef.out2X, y: y + rDef.out2Y } : null
        };
    }

    async craft(itemId, amount = 1) {
        console.log(`[AGENT] Direct Craft ${amount}x ${itemId}`);
        for(let i=0; i<amount; i++) window.craftItem(itemId, true);
        return Promise.resolve(true);
    }
    
    async mineAt(x, y) {
        console.log(`[AGENT] Direct Mine at ${x}, ${y}`);
        // Temporarily adjust miningTarget internally
        window.miningTarget = { x: Math.floor(x), y: Math.floor(y), progress: 999, requiredProgress: 1 };
        window.mineComplete();
        return Promise.resolve(true);
    }

    // Returns all available network types the game currently supports
    getNetworks() {
        if (window.NETWORKS) return [...window.NETWORKS];
        return [];
    }

    // Returns the LOGISTICS_ITEMS registry so the agent knows which pipe item maps to which network
    getLogisticsItems() {
        if (window.LOGISTICS_ITEMS) return window.LOGISTICS_ITEMS.map(li => ({id: li.id, name: li.name, net: li.net}));
        return [];
    }

    async routeNetwork(startX, startY, endX, endY, networkStr) {
        startX = Math.floor(startX); startY = Math.floor(startY);
        endX = Math.floor(endX); endY = Math.floor(endY);
        console.log(`[AGENT] Auto-Routing ${networkStr} from ${startX},${startY} to ${endX},${endY}`);

        // Special handling for drone and defense_signal networks (these don't use pipes)
        if (networkStr === 'drone_farm' || networkStr === 'drone_carry' || networkStr === 'defense_signal') {
            console.log(`[AGENT] ${networkStr} uses machine-linking, not pipes. Use buildAt + machine linking instead.`);
            return Promise.resolve(false);
        }

        // Compute an A* path between the two points that avoids obstacles
        let routePath = this._computeRoutingAStar(startX, startY, endX, endY);
        
        if (!routePath) {
            console.log(`[AGENT] Failed to auto-route ${networkStr}. Path blocked.`);
            return Promise.resolve(false);
        }
        
        // Push the path directly to afac.html memory (handles ALL pipe network types)
        let result = window.commitAgentRoute(routePath, networkStr);
        if (!result) {
            console.log(`[AGENT] commitAgentRoute failed for ${networkStr}. Network may not exist.`);
            return Promise.resolve(false);
        }
        console.log(`[AGENT] Successfully routed ${networkStr}: ${routePath.length} pipe segments laid.`);
        return Promise.resolve(true);
    }

    // Route multiple network connections in a single call (batch operation)
    async routeNetworkBatch(routes) {
        // routes: Array of { startX, startY, endX, endY, network }
        let results = [];
        for (let r of routes) {
            let ok = await this.routeNetwork(r.startX, r.startY, r.endX, r.endY, r.network);
            results.push({ network: r.network, success: ok });
        }
        console.log(`[AGENT] Batch routing complete: ${results.filter(r=>r.success).length}/${results.length} succeeded.`);
        return results;
    }

    // Build an item belt route between two points (items travel on belts, not pipes)
    async routeBelt(startX, startY, endX, endY, beltNetwork = 'item') {
        startX = Math.floor(startX); startY = Math.floor(startY);
        endX = Math.floor(endX); endY = Math.floor(endY);
        console.log(`[AGENT] Auto-Routing BELT (${beltNetwork}) from ${startX},${startY} to ${endX},${endY}`);

        let routePath = this._computeRoutingAStar(startX, startY, endX, endY);
        if (!routePath) {
            console.log(`[AGENT] Failed to auto-route belt. Path blocked.`);
            return Promise.resolve(false);
        }

        let result = window.commitAgentRoute(routePath, beltNetwork);
        if (!result) {
            console.log(`[AGENT] commitAgentRoute failed for belt network ${beltNetwork}.`);
            return Promise.resolve(false);
        }
        console.log(`[AGENT] Successfully routed belt (${beltNetwork}): ${routePath.length} segments.`);
        return Promise.resolve(true);
    }

    // A* variant specifically for pipe/belt routing:
    // - Ghost mode is always on (ignores tile collision)
    // - BUT avoids tiles occupied by machines (worldMap >= 50000)
    // - Uses higher iteration limit for long-range routes
    _computeRoutingAStar(sx, sy, tx, ty) {
        let worldMap = this.worldMap;
        let worldSize = this.worldSize;
        
        // Use a priority queue via binary heap for performance
        let openList = [{ x: sx, y: sy, g: 0, f: 0, parent: null }];
        let closedSet = new Set();
        let limit = 20000; // Higher limit for long pipe routes

        let h = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

        // Start and end tiles may be on machines (output/input ports), allow them
        let startIdx = sy * worldSize + sx;
        let endIdx = ty * worldSize + tx;

        while(openList.length > 0 && limit-- > 0) {
            // Sort to get lowest F cost (consider switching to min-heap for very long paths)
            openList.sort((a,b) => a.f - b.f);
            let current = openList.shift();

            if (current.x === tx && current.y === ty) {
                let path = [];
                let curr = current;
                while(curr.parent !== null) {
                    path.push({x: curr.x, y: curr.y});
                    curr = curr.parent;
                }
                return path.reverse();
            }

            closedSet.add(`${current.x},${current.y}`);

            let neighbors = [
                {x: current.x, y: current.y - 1}, {x: current.x, y: current.y + 1},
                {x: current.x - 1, y: current.y}, {x: current.x + 1, y: current.y}
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= worldSize || n.y < 0 || n.y >= worldSize) continue;
                if (closedSet.has(`${n.x},${n.y}`)) continue;

                let nIdx = n.y * worldSize + n.x;
                // Allow the destination tile even if it's a machine port
                if (nIdx !== endIdx) {
                    let tileVal = worldMap[nIdx];
                    // Avoid tiles occupied by machines (but allow empty, ores, trees, etc)
                    if (tileVal >= 50000) continue;
                }

                let gCost = current.g + 1;
                let existingNode = openList.find(node => node.x === n.x && node.y === n.y);

                if (!existingNode || gCost < existingNode.g) {
                    if (!existingNode) {
                        openList.push({x: n.x, y: n.y, g: gCost, f: gCost + h(n.x, n.y, tx, ty), parent: current});
                    } else {
                        existingNode.g = gCost;
                        existingNode.f = gCost + h(n.x, n.y, tx, ty);
                        existingNode.parent = current;
                    }
                }
            }
        }
        return null; // Path too long or blocked
    }

    _computeAStar(sx, sy, tx, ty) {
        // Simple A* implementation tailored for 1500x1500 arrays
        let openList = [{ x: sx, y: sy, g: 0, f: 0, parent: null }];
        let closedSet = new Set();
        let limit = 5000; // Cap to prevent lag spikes

        let h = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

        while(openList.length > 0 && limit-- > 0) {
            // Sort to get lowest F cost
            openList.sort((a,b) => a.f - b.f);
            let current = openList.shift();

            if (current.x === tx && current.y === ty) {
                let path = [];
                let curr = current;
                while(curr.parent !== null) {
                    path.push({x: curr.x, y: curr.y});
                    curr = curr.parent;
                }
                return path.reverse();
            }

            closedSet.add(`${current.x},${current.y}`);

            let neighbors = [
                {x: current.x, y: current.y - 1}, {x: current.x, y: current.y + 1},
                {x: current.x - 1, y: current.y}, {x: current.x + 1, y: current.y}
            ];

            for (let n of neighbors) {
                if (!this._isWalkable(n.x, n.y)) continue;
                if (closedSet.has(`${n.x},${n.y}`)) continue;

                let gCost = current.g + 1;
                let existingNode = openList.find(node => node.x === n.x && node.y === n.y);

                if (!existingNode || gCost < existingNode.g) {
                    if (!existingNode) {
                        openList.push({x: n.x, y: n.y, g: gCost, f: gCost + h(n.x, n.y, tx, ty), parent: current});
                    } else {
                        existingNode.g = gCost;
                        existingNode.f = gCost + h(n.x, n.y, tx, ty);
                        existingNode.parent = current;
                    }
                }
            }
        }
        return null; // Path too long or blocked
    }

    update(dt) {
        if (!this.path) return;

        let target = this.path[this.pathIndex];
        let p = window.player;

        // Move player towards target
        let dx = target.x - p.x;
        let dy = target.y - p.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        // Arrived at current node
        if (dist < 0.2) {
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                // Arrived at destination
                p.x = target.x; p.y = target.y;
                if (this.currentMoveResolve) {
                    this.currentMoveResolve(true);
                    this.currentMoveResolve = null;
                    this.currentMovePromise = null;
                }
                this.path = null;
                this.pathIndex = 0;
            }
        } else {
            // Normalize & Move
            // Use standard player speed from the engine (approximate)
            let speed = 10 * dt; 
            if (dist < speed) speed = dist; // Snapping
            if (this.ghostMode && window._isWalkableOverride) {
                window._isWalkableOverride = true; // Temporary hack to bypass collision
            }
            p.x += (dx / dist) * speed;
            p.y += (dy / dist) * speed;
        }
    }
}
