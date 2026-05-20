export class AgentWrapper {
    constructor(agentController) {
        this.agent = agentController;
        this.listeners = {};
        this.lastState = null;

        // Start diff-polling loop (500ms)
        this.pollInterval = setInterval(() => this._poll(), 500);
        this.log("Initialized High-Level AI API");
    }

    log(msg) {
        if (window.agentLog) window.agentLog(msg);
        else console.log("[AgentWrapper] " + msg);
    }

    warn(msg) {
        if (window.agentLog) window.agentLog("⚠️ " + msg);
        console.warn("[AgentWrapper] " + msg);
    }

    // --- 1. Event Subscriptions ---
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.listeners[event]) return;
        for (let cb of this.listeners[event]) cb(data);
    }

    _poll() {
        let state = this.agent.getGameState();
        if (!state) return;

        if (this.lastState) {
            // Player HP diff
            if (this.lastState.player.hp !== state.player.hp) {
                this.emit('hp_changed', {
                    old: this.lastState.player.hp,
                    new: state.player.hp,
                    diff: state.player.hp - this.lastState.player.hp
                });
            }

            // Movement/Status diff
            if (this.lastState.status !== state.status) {
                this.emit('status_changed', { old: this.lastState.status, new: state.status });
            }

            // Inventory diff
            let obj1 = this.lastState.inventory || {};
            let obj2 = state.inventory || {};
            let invChanged = false;
            let changes = {};

            for (let k in obj2) {
                if (obj2[k] !== obj1[k]) {
                    invChanged = true;
                    changes[k] = (obj2[k] || 0) - (obj1[k] || 0);
                }
            }
            for (let k in obj1) {
                if (typeof obj2[k] === 'undefined') {
                    invChanged = true;
                    changes[k] = -(obj1[k]);
                }
            }

            if (invChanged) {
                this.emit('inventory_changed', { current: Object.assign({}, obj2), diff: changes });
            }
        }

        this.lastState = JSON.parse(JSON.stringify(state)); // Deep copy state to ensure isolated diffing
    }

    // --- 2. Semantic API: Look and Find ---

    // Simplifies game arrays into semantic objects
    lookAt(x, y) {
        if (!window.getWorldMap) {
            this.warn("window.getWorldMap is not exposed by engine.");
            return null;
        }

        let map = window.getWorldMap();
        let size = window.getWorldSize();
        x = Math.floor(x);
        y = Math.floor(y);

        if (x < 0 || x >= size || y < 0 || y >= size) return { type: 'out_of_bounds' };

        let id = map[y * size + x];

        // Entity is a Machine
        if (id >= 50000) {
            let mIndex = id - 50000;
            let machines = window.getActiveMachines ? window.getActiveMachines() : [];
            let m = machines[mIndex];
            if (!m) return { type: 'machine', id: 'unknown', active: false };
            return { type: 'machine', id: m.type, x: m.x, y: m.y, hp: m.hp, refId: mIndex };
        }

        if (id === 0 || id === 1) return { type: 'air_or_ground' };

        // Entity is a resource
        let resType = this.agent._getTileResource ? this.agent._getTileResource(id) : null;
        if (resType) {
            return { type: 'resource', resource: resType, tileId: id };
        }

        // Unknown Tile (Mountains, Belts, etc)
        return { type: 'unknown_tile', tileId: id };
    }

    // Returns a comprehensive dictionary of all valid semantic string IDs in the game
    getDictionary() {
        return {
            resources: ['wood', 'wood_fiber', 'stone', 'iron_ore', 'copper_ore', 'coal', 'gold_ore',
                'silver_ore', 'tin_ore', 'nickel_ore', 'zinc_ore', 'aluminium_ore', 'lead_ore'],
            items: window.ITEM_COLORS ? Object.keys(window.ITEM_COLORS) : [],
            machines: window.MACHINE_DEFS ? Object.keys(window.MACHINE_DEFS) : [],
            networks: window.NETWORKS ? [...window.NETWORKS] : [],
            recipes: this.agent.getAutoWiki ? this.agent.getAutoWiki() : {}
        };
    }

    // High Level Scan
    findNearest(targetType) {
        let state = this.agent.getGameState();
        if (!state) return null;

        let bestTarget = null;
        let minDist = Infinity;
        let px = state.player.x;
        let py = state.player.y;

        // Search Resources
        for (let res of state.nearbyResources) {
            if (res.type === targetType) {
                let dist = Math.abs(res.x - px) + Math.abs(res.y - py);
                if (dist < minDist) {
                    minDist = dist;
                    bestTarget = { x: res.x, y: res.y, type: targetType, isMachine: false };
                }
            }
        }

        // Search Machines (if no resources or searching explicitly for a machine)
        for (let m of state.nearbyMachines) {
            if (m.type === targetType) {
                let dist = Math.abs(m.x - px) + Math.abs(m.y - py);
                if (dist < minDist) {
                    minDist = dist;
                    bestTarget = { x: m.x, y: m.y, type: targetType, id: m.id, isMachine: true };
                }
            }
        }

        return bestTarget;
    }

    // --- 3. Headless Behaviors ---

    // Autonomously locates and acquires `amountTarget` of `resourceType`
    async gather(resourceType, amountTarget = 1) {
        let getCount = () => (window.inventory && window.inventory[resourceType]) ? window.inventory[resourceType] : 0;
        let startCount = getCount();

        this.log(`Task: Gather ${amountTarget}x ${resourceType}`);

        // Set safety timeout limits (10 mins game time max)
        let maxAttempts = amountTarget * 3;
        let attempts = 0;

        while (getCount() < startCount + amountTarget && attempts < maxAttempts) {
            attempts++;
            let nearest = this.findNearest(resourceType);

            if (!nearest || nearest.isMachine) {
                this.warn(`Cannot locate ${resourceType} nearby. Aborting.`);
                return false;
            }

            this.log(`Pathing to ${resourceType} at (${nearest.x}, ${nearest.y})`);
            let moved = await this.agent.moveTo(nearest.x, nearest.y);
            if (!moved) {
                this.warn(`Pathing failed to (${nearest.x}, ${nearest.y}). Attempting different approach...`);
                continue;
            }

            this.log(`Mining at (${nearest.x}, ${nearest.y})`);
            await this.agent.mineAt(nearest.x, nearest.y);

            // Wait 500ms for internal game loops and polling diffs to register the inventory influx
            await new Promise(r => setTimeout(r, 500));
        }

        if (getCount() >= startCount + amountTarget) {
            this.log(`Gather Task Complete! Got ${getCount() - startCount}x ${resourceType}`);
            return true;
        }

        return false;
    }

    // Bypasses the HTML machine UI
    setMachineRecipe(machineId, recipeId) {
        let machines = window.getActiveMachines ? window.getActiveMachines() : [];
        let m = machines[machineId];
        if (!m) return false;

        let mDef = window.MACHINE_DEFS ? window.MACHINE_DEFS[m.type] : null;
        if (!mDef || !mDef.recipes) return false;

        let idx = mDef.recipes.findIndex(r => {
            if (r.out && r.out[recipeId]) return true;
            if (r.output && r.output.id === recipeId) return true;
            if (r.out2 && r.out2[recipeId]) return true;
            return false;
        });

        if (idx !== -1) {
            m.recipeIndex = idx;
            this.log(`Headless Recipe set: [${recipeId}] on Machine #${machineId}`);
            return true;
        }

        this.warn(`Recipe ${recipeId} not valid for machine ${m.type}`);
        return false;
    }

    // Programmatic item injection/extraction to/from a machine
    transferItems(machineId, itemId, amount, toMachine = true) {
        let machines = window.getActiveMachines ? window.getActiveMachines() : [];
        let m = machines[machineId];
        if (!m || !window.inventory) return false;

        if (toMachine) {
            let available = window.inventory[itemId] || 0;
            let actualTransfer = Math.min(available, amount);
            if (actualTransfer <= 0) return false;

            // Deduct from Player
            window.inventory[itemId] -= actualTransfer;
            if (window.inventory[itemId] <= 0) delete window.inventory[itemId];

            // Add to Machine
            m.inv = m.inv || {};
            m.inv[itemId] = (m.inv[itemId] || 0) + actualTransfer;
            this.log(`Injected ${actualTransfer}x ${itemId} into Machine #${machineId}`);
            return true;

        } else {
            // Retrieve from Machine (Check outBuffer first, then inv)
            let actualTransfer = 0;

            if (m.outBuffer && m.outBuffer[itemId]) {
                let available = m.outBuffer[itemId];
                let take = Math.min(available, amount);
                actualTransfer += take;
                m.outBuffer[itemId] -= take;
                if (m.outBuffer[itemId] <= 0) delete m.outBuffer[itemId];
                amount -= take;
            }

            if (amount > 0 && m.inv && m.inv[itemId]) {
                let available = m.inv[itemId];
                let take = Math.min(available, amount);
                actualTransfer += take;
                m.inv[itemId] -= take;
                if (m.inv[itemId] <= 0) delete m.inv[itemId];
            }

            if (actualTransfer <= 0) return false;

            // Add to Player
            window.inventory[itemId] = (window.inventory[itemId] || 0) + actualTransfer;
            this.log(`Extracted ${actualTransfer}x ${itemId} from Machine #${machineId}`);
            return true;
        }
    }
}
