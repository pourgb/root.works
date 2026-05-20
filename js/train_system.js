/**
 * Advanced Logistics: Rail Network Train System
 * Manages train entities, pathfinding along rail networks, schedules, and loading/unloading.
 */

export const TrainSystem = {
    trains: [],
    _nextId: 1,

    /**
     * Create a new train entity at a depot location.
     * @param {number} x - World X of the depot
     * @param {number} y - World Y of the depot
     * @param {number} cargoCount - Number of cargo wagons
     * @param {number} fluidCount - Number of fluid wagons
     * @returns {object} The newly created train
     */
    createTrain: function(x, y, cargoCountOrWagons, fluidCount) {
        let wagons = [];
        if (Array.isArray(cargoCountOrWagons)) {
            wagons = cargoCountOrWagons;
        } else {
            let cargoCount = cargoCountOrWagons || 0;
            for (let i = 0; i < cargoCount; i++) {
                wagons.push({ type: 'cargo', inv: {}, maxStack: 500 });
            }
            for (let i = 0; i < fluidCount; i++) {
                wagons.push({ type: 'fluid', inv: {}, maxStack: 2000 });
            }
        }

        let train = {
            id: this._nextId++,
            name: 'Train ' + this._nextId,
            wagons: wagons,
            schedule: [],       // Array of { stationName, condition, value }
            scheduleIdx: 0,
            state: 'idle',      // 'idle', 'traveling', 'loading', 'unloading', 'waiting'
            currentPath: null,  // Array of {x,y} along rail tiles
            pathIdx: 0,
            pathProgress: 0,    // fractional progress between path nodes
            speed: 10,          // tiles per second
            x: x, y: y,        // current world position
            fuel: 0,            // coal units
            maxFuel: 500,
            dockedAtId: null,   // machine id of train_stop we're docked at
            waitTimer: 0,
            inactivityTimer: 0,
            lastTransferTick: 0,
            posHistory: []      // History of tiles for wagons to follow
        };
        for (let i = 0; i < wagons.length; i++) train.posHistory.push({ x: x, y: y });

        this.trains.push(train);
        return train;
    },

    /**
     * Remove a train by ID.
     */
    removeTrain: function(trainId) {
        let idx = this.trains.findIndex(t => t.id === trainId);
        if (idx !== -1) {
            // Undock from station if docked
            let train = this.trains[idx];
            if (train.dockedAtId != null) {
                let machines = window.getActiveMachines ? window.getActiveMachines() : [];
                let station = machines[train.dockedAtId];
                if (station) station.dockedTrainId = null;
            }
            this.trains.splice(idx, 1);
        }
    },

    /**
     * Get total items across all wagons of a train.
     */
    getTrainCargo: function(train) {
        let cargo = {};
        for (let w of train.wagons) {
            for (let k in w.inv) {
                cargo[k] = (cargo[k] || 0) + w.inv[k];
            }
        }
        return cargo;
    },

    /**
     * Get total item count across all wagons.
     */
    getTrainItemCount: function(train) {
        let total = 0;
        for (let w of train.wagons) {
            for (let k in w.inv) total += w.inv[k];
        }
        return total;
    },

    /**
     * Get total capacity across all wagons.
     */
    getTrainCapacity: function(train) {
        let total = 0;
        for (let w of train.wagons) total += w.maxStack;
        return total;
    },

    // Pre-allocated arrays for BFS to avoid garbage collection
    _bfsVisited: null,
    _bfsCameFrom: null,
    _bfsQueue: null,
    _bfsTicket: 1,

    _initBFS: function() {
        if (!this._bfsVisited) {
            let mapLen = 1500 * 1500;
            this._bfsVisited = new Uint32Array(mapLen);
            this._bfsCameFrom = new Uint32Array(mapLen);
            this._bfsQueue = new Uint32Array(mapLen);
        }
    },

    /**
     * BFS pathfind along rail network tiles from (startX, startY) to the train stop with the given name.
     * Returns an array of {x,y} waypoints along rail tiles, or null if no path found.
     */
    pathfindRail: function(startX, startY, targetStationName) {
        startX = Math.round(startX);
        startY = Math.round(startY);
        if (!window.mapPipes) {
            console.warn("  [pathfindRail] window.mapPipes is missing!");
            return null;
        }
        if (!window.mapPipes['rail']) {
            console.warn("  [pathfindRail] window.mapPipes['rail'] is missing!");
            return null;
        }
        let railMap = window.mapPipes['rail'];
        let worldMap = window.getWorldMap ? window.getWorldMap() : null;
        let machines = window.getActiveMachines ? window.getActiveMachines() : [];
        let WORLD_SIZE = window.getWorldSize ? window.getWorldSize() : 1500;
        let SHAPES = window.LOGISTICS_SHAPES_REF;
        
        if (!railMap) { console.warn("  [pathfindRail] railMap is missing!"); return null; }
        if (!worldMap) { console.warn("  [pathfindRail] worldMap is missing!"); return null; }
        if (!SHAPES) { console.warn("  [pathfindRail] SHAPES (LOGISTICS_SHAPES_REF) is missing!"); return null; }

        // Find target station machine
        let targetStation = null;
        for (let m of machines) {
            if (m && m.type === 'machine_train_stop' && (m.stationName || `Station_${m.id}`) === targetStationName) {
                targetStation = m;
                break;
            }
        }
        if (!targetStation) {
            console.warn(`  [pathfindRail] Target station "${targetStationName}" not found! Active stations:`, 
                machines.filter(m => m && m.type === 'machine_train_stop').map(m => m.stationName || `Station_${m.id}`)
            );
            return null;
        }

        // Find the rail tile adjacent to the target station
        let targetRailTile = this._findAdjacentRailTile(targetStation, railMap, worldMap, WORLD_SIZE);
        if (!targetRailTile) {
            console.warn(`  [pathfindRail] Target station "${targetStationName}" at (${targetStation.x},${targetStation.y}) has no adjacent rail tile!`);
            return null;
        }

        let startRailTile = { x: startX, y: startY };
        if (railMap[startY * WORLD_SIZE + startX] === 0) {
            console.log(`  [pathfindRail] Start coordinate (${startX},${startY}) is not a rail tile. Checking overlapping machines...`);
            let startMachine = null;
            for (let m of machines) {
                if (m) {
                    let w = 1, h = 1;
                    let rIdx = m.rotIndex || 0;
                    if (m.def && m.def.rotations && m.def.rotations[rIdx]) {
                        w = m.def.rotations[rIdx].w || 1;
                        h = m.def.rotations[rIdx].h || 1;
                    }
                    if (startX >= m.x && startX < m.x + w && startY >= m.y && startY < m.y + h) {
                        startMachine = m;
                        break;
                    }
                }
            }
            if (startMachine) {
                console.log(`  [pathfindRail] Start coordinate overlaps machine of type "${startMachine.type}" (ID ${startMachine.id}) at (${startMachine.x},${startMachine.y}). Searching adjacent rails...`);
                let adj = this._findAdjacentRailTile(startMachine, railMap, worldMap, WORLD_SIZE);
                if (adj) {
                    console.log(`  [pathfindRail] Found adjacent rail at (${adj.x},${adj.y})!`);
                    startRailTile = adj;
                } else {
                    console.warn(`  [pathfindRail] Overlapping machine "${startMachine.type}" has no adjacent rail tile!`);
                    return null;
                }
            } else {
                console.warn(`  [pathfindRail] Start coordinate does not overlap any machine footprint!`);
                return null;
            }
        }

        let startIdx = startRailTile.y * WORLD_SIZE + startRailTile.x;
        let endIdx = targetRailTile.y * WORLD_SIZE + targetRailTile.x;

        if (startIdx === endIdx) {
            if (startX !== startRailTile.x || startY !== startRailTile.y) {
                return [{ x: startX, y: startY }, { x: startRailTile.x, y: startRailTile.y }];
            }
            return [{ x: startX, y: startY }];
        }

        this._initBFS();
        
        this._bfsTicket++;
        if (this._bfsTicket > 4000000000) { 
            this._bfsVisited.fill(0); 
            this._bfsTicket = 1; 
        }

        let head = 0, tail = 0;
        this._bfsQueue[tail++] = startIdx;
        this._bfsVisited[startIdx] = this._bfsTicket;

        while (head < tail) {
            let currIdx = this._bfsQueue[head++];
            let cx = currIdx % WORLD_SIZE;
            let cy = Math.floor(currIdx / WORLD_SIZE);

            if (currIdx === endIdx) {
                // Reconstruct path
                let path = [];
                let cur = endIdx;
                while (cur !== startIdx) {
                    path.unshift({ x: cur % WORLD_SIZE, y: Math.floor(cur / WORLD_SIZE) });
                    cur = this._bfsCameFrom[cur];
                }
                path.unshift({ x: startRailTile.x, y: startRailTile.y });
                if (startX !== startRailTile.x || startY !== startRailTile.y) {
                    path.unshift({ x: startX, y: startY });
                }
                return path;
            }

            let sId = railMap[currIdx] - 1;
            if (sId < 0) continue;

            let dirs = SHAPES[sId].dirs;
            for (let d of dirs) {
                let nx = cx + d.x, ny = cy + d.y;
                if (nx < 0 || nx >= WORLD_SIZE || ny < 0 || ny >= WORLD_SIZE) continue;

                let nIdx = ny * WORLD_SIZE + nx;
                if (this._bfsVisited[nIdx] === this._bfsTicket) continue;

                let nSId = railMap[nIdx] - 1;
                if (nSId >= 0) {
                    // Check pipe connectivity
                    let nDirs = SHAPES[nSId].dirs;
                    let connected = nDirs.some(nd => nd.x === -d.x && nd.y === -d.y);
                    if (connected) {
                        this._bfsVisited[nIdx] = this._bfsTicket;
                        this._bfsCameFrom[nIdx] = currIdx;
                        this._bfsQueue[tail++] = nIdx;
                    }
                }
            }
        }

        return null; // No path found
    },

    _findAdjacentRailTile: function(station, railMap, worldMap, WORLD_SIZE) {
        let r = station.def.rotations[station.rotIndex || 0];
        console.log(`  [_findAdjacentRailTile] Scanning around station/depot "${station.type}" (ID ${station.id}) at (${station.x},${station.y}) with size ${r.w}x${r.h}.`);
        let checkedCount = 0;
        let railsFound = [];
        // Check all tiles adjacent to the machine's footprint
        for (let y = -1; y <= r.h; y++) {
            for (let x = -1; x <= r.w; x++) {
                // Skip interior tiles
                if (x >= 0 && x < r.w && y >= 0 && y < r.h) continue;

                let wx = station.x + x;
                let wy = station.y + y;
                if (wx < 0 || wx >= WORLD_SIZE || wy < 0 || wy >= WORLD_SIZE) continue;

                checkedCount++;
                let idx = wy * WORLD_SIZE + wx;
                if (railMap[idx] > 0) {
                    railsFound.push({ x: wx, y: wy, val: railMap[idx] });
                }
            }
        }
        console.log(`  [_findAdjacentRailTile] Checked ${checkedCount} border tiles. Found rails:`, railsFound);
        if (railsFound.length > 0) return { x: railsFound[0].x, y: railsFound[0].y };
        return null;
    },

    /**
     * Find a rail tile adjacent to a train depot machine.
     */
    _findAdjacentRailTileForDepot: function(depot, railMap, worldMap, WORLD_SIZE) {
        let r = depot.def.rotations[depot.rotIndex || 0];
        for (let y = -1; y <= r.h; y++) {
            for (let x = -1; x <= r.w; x++) {
                if (x >= 0 && x < r.w && y >= 0 && y < r.h) continue;
                let wx = depot.x + x;
                let wy = depot.y + y;
                if (wx < 0 || wx >= WORLD_SIZE || wy < 0 || wy >= WORLD_SIZE) continue;
                let idx = wy * WORLD_SIZE + wx;
                if (railMap[idx] > 0) return { x: wx, y: wy };
            }
        }
        return null;
    },

    /**
     * Get all station names in the world.
     */
    getAllStationNames: function() {
        let machines = window.getActiveMachines ? window.getActiveMachines() : [];
        let names = [];
        for (let m of machines) {
            if (m && m.type === 'machine_train_stop' && m.stationName) {
                if (!names.includes(m.stationName)) names.push(m.stationName);
            }
        }
        return names;
    },

    /**
     * Find the station machine by name.
     */
    findStationByName: function(name) {
        let machines = window.getActiveMachines ? window.getActiveMachines() : [];
        for (let m of machines) {
            if (m && m.type === 'machine_train_stop' && (m.stationName || `Station_${m.id}`) === name) return m;
        }
        return null;
    },

    /**
     * Main tick - called every frame from the game loop.
     */
    tick: function(dt) {
        if (!this._lastLogTime) this._lastLogTime = 0;
        let shouldLog = Date.now() - this._lastLogTime > 3000; // print log every 3 seconds
        if (shouldLog) {
            this._lastLogTime = Date.now();
            console.log(`[TrainSystem] Ticking ${this.trains.length} trains.`);
        }
        for (let train of this.trains) {
            try {
                if (shouldLog) {
                    console.log(`  - Train ID ${train.id} ("${train.name}"): state=${train.state}, fuel=${train.fuel.toFixed(2)}, pos=(${Math.round(train.x)},${Math.round(train.y)}), schedule length=${train.schedule.length}`);
                    if (train.schedule.length > 0) {
                        let currentEntry = train.schedule[train.scheduleIdx];
                        console.log(`    Current schedule target: ${currentEntry ? currentEntry.stationName : 'None'} (idx ${train.scheduleIdx})`);
                    }
                }
                // --- TRAVELING ---
                if (train.state === 'traveling' && train.currentPath && train.currentPath.length > 0) {
                    if (train.fuel <= 0) {
                        console.log(`[TrainSystem] Train ${train.id} ran out of fuel!`);
                        train.state = 'waiting_fuel'; // Stranded - hold position until refueled
                        continue;
                    }

                    train.pathProgress += train.speed * dt;

                    while (train.pathProgress >= 1.0 && train.pathIdx < train.currentPath.length - 1) {
                        let oldX = train.x, oldY = train.y;
                        train.pathProgress -= 1.0;
                        train.pathIdx++;
                        train.x = train.currentPath[train.pathIdx].x;
                        train.y = train.currentPath[train.pathIdx].y;

                        // Update history for wagons to trail
                        train.posHistory.unshift({ x: oldX, y: oldY });
                        if (train.posHistory.length > train.wagons.length) train.posHistory.pop();

                        // Consume fuel: 1 coal per 100 tiles
                        train.fuel = Math.max(0, train.fuel - 0.01);
                    }

                    if (train.pathProgress >= 1.0 && train.pathIdx === train.currentPath.length - 1) {
                        // Arrived at destination station!
                        let schedEntry = train.schedule[train.scheduleIdx];
                        if (schedEntry) {
                            let station = this.findStationByName(schedEntry.stationName);
                            if (station) {
                                train.dockedAtId = station.id;
                                station.dockedTrainId = train.id;
                                train.waitTimer = 0;
                                train.inactivityTimer = 0;
                                train.lastTransferTick = 0;
                                // Determine correct state from the departure condition:
                                // wait_empty = this is a DROP-OFF stop (unload cargo here)
                                // wait_full / wait_timer / wait_inactivity = this is a PICK-UP stop (load cargo here)
                                if (schedEntry.condition === 'wait_empty') {
                                    train.state = 'unloading';
                                } else if (schedEntry.condition === 'wait_timer') {
                                    train.state = 'waiting'; // Just wait, no transfer
                                } else {
                                    train.state = 'loading';
                                }
                                if (typeof window.floatText === 'function') {
                                    window.floatText(station.x + 2, station.y, `Train arrived: ${train.name}`, '#ff9800');
                                }
                            } else {
                                train.state = 'idle'; // Station disappeared
                            }
                        } else {
                            train.state = 'idle';
                        }
                    }
                }

                // --- LOADING / UNLOADING / WAITING ---
                else if (train.state === 'loading' || train.state === 'unloading' || train.state === 'waiting') {
                    let schedEntry = train.schedule[train.scheduleIdx];
                    if (!schedEntry) { train.state = 'idle'; continue; }

                    let station = null;
                    if (train.dockedAtId != null) {
                        let machines = window.getActiveMachines ? window.getActiveMachines() : [];
                        station = machines[train.dockedAtId];
                    }
                    if (!station) { train.state = 'idle'; continue; }

                    // Refuel train from station inventory if coal is present
                    if (station.inv && station.inv['coal'] > 0) {
                        let need = train.maxFuel - train.fuel;
                        if (need > 0) {
                            let transfer = Math.min(station.inv['coal'], Math.ceil(need), 10);
                            train.fuel = Math.min(train.maxFuel, train.fuel + transfer);
                            station.inv['coal'] -= transfer;
                            if (station.inv['coal'] <= 0) delete station.inv['coal'];
                        }
                    }

                    // Perform transfers every tick
                    let transferred = 0;
                    if (train.state === 'loading') {
                        transferred = this._loadFromStation(train, station);
                    } else if (train.state === 'unloading') {
                        transferred = this._unloadToStation(train, station);
                    }

                    if (transferred > 0) {
                        train.lastTransferTick = 0;
                        train.inactivityTimer = 0;
                    } else {
                        train.inactivityTimer += dt;
                    }

                    train.waitTimer += dt;

                    // Check departure condition
                    if (this._checkDepartureCondition(train, schedEntry)) {
                        // Undock and advance schedule
                        station.dockedTrainId = null;
                        train.dockedAtId = null;
                        this._advanceSchedule(train);
                    }
                }

                // --- IDLE ---
                else if (train.state === 'idle' && train.schedule.length > 0) {
                    // Start traveling to next scheduled station
                    this._beginTravelToNextStation(train);
                }

                // --- WAITING FOR FUEL ---
                else if (train.state === 'waiting_fuel') {
                    // Resume once refueled
                    if (train.fuel > 0 && train.schedule.length > 0) train.state = 'idle';
                }
            } catch (e) {
                console.error("Error ticking train " + train.id + ":", e);
            }
        }
    },

    /**
     * Load items from station buffer into train wagons.
     * Returns number of items transferred.
     */
    _loadFromStation: function(train, station) {
        let transferred = 0;
        for (let w of train.wagons) {
            let currentCount = Object.values(w.inv).reduce((a, b) => a + b, 0);
            let space = w.maxStack - currentCount;
            if (space <= 0) continue;

            // Determine which items to load based on station filters
            let items = Object.keys(station.inv).filter(k => station.inv[k] > 0);

            for (let item of items) {
                if (space <= 0) break;

                // Respect wagon type
                if (w.type === 'fluid') {
                    let net = window.getNetworkForItem ? window.getNetworkForItem(item) : 'item';
                    if (net === 'item' || net === 'item_heavy') continue; // Fluid wagons don't carry solid items
                } else if (w.type === 'cargo') {
                    let net = window.getNetworkForItem ? window.getNetworkForItem(item) : 'item';
                    if (net !== 'item' && net !== 'item_heavy') continue; // Cargo wagons only carry solid items
                }

                let toLoad = Math.min(station.inv[item], space, 10); // Load up to 10 per tick
                if (toLoad > 0) {
                    station.inv[item] -= toLoad;
                    if (station.inv[item] <= 0) delete station.inv[item];
                    w.inv[item] = (w.inv[item] || 0) + toLoad;
                    space -= toLoad;
                    transferred += toLoad;
                }
            }
        }
        return transferred;
    },

    /**
     * Unload items from train wagons into station buffer.
     * Returns number of items transferred.
     */
    _unloadToStation: function(train, station) {
        let transferred = 0;
        let stationTotal = Object.values(station.inv).reduce((a, b) => a + b, 0);
        let stationSpace = (station.def.maxStack || 2000) - stationTotal;

        for (let w of train.wagons) {
            let items = Object.keys(w.inv).filter(k => w.inv[k] > 0);
            for (let item of items) {
                if (stationSpace <= 0) break;

                let toUnload = Math.min(w.inv[item], stationSpace, 10); // Unload up to 10 per tick
                if (toUnload > 0) {
                    w.inv[item] -= toUnload;
                    if (w.inv[item] <= 0) delete w.inv[item];
                    station.inv[item] = (station.inv[item] || 0) + toUnload;
                    stationSpace -= toUnload;
                    transferred += toUnload;
                }
            }
        }
        return transferred;
    },

    /**
     * Check if the train should depart based on current schedule entry condition.
     */
    _checkDepartureCondition: function(train, schedEntry) {
        let cond = schedEntry.condition || 'wait_full';
        let value = schedEntry.value || 10;

        switch (cond) {
            case 'wait_full': {
                // Depart when all wagons are full
                for (let w of train.wagons) {
                    let count = Object.values(w.inv).reduce((a, b) => a + b, 0);
                    if (count < w.maxStack) return false;
                }
                return true;
            }
            case 'wait_empty': {
                // Depart when all wagons are empty
                for (let w of train.wagons) {
                    let count = Object.values(w.inv).reduce((a, b) => a + b, 0);
                    if (count > 0) return false;
                }
                return true;
            }
            case 'wait_timer': {
                return train.waitTimer >= value;
            }
            case 'wait_inactivity': {
                return train.inactivityTimer >= value;
            }
            default:
                return train.waitTimer >= 10; // Fallback: 10 seconds
        }
    },

    /**
     * Advance schedule to next entry and begin traveling.
     */
    _advanceSchedule: function(train) {
        train.scheduleIdx = (train.scheduleIdx + 1) % train.schedule.length;

        let nextEntry = train.schedule[train.scheduleIdx];
        if (!nextEntry) { train.state = 'idle'; return; }

        // Determine load/unload state for next station
        train.state = 'idle'; // Will be picked up by next tick
    },

    /**
     * Begin traveling to the next scheduled station.
     */
    _beginTravelToNextStation: function(train) {
        console.log(`[TrainSystem] _beginTravelToNextStation for train ${train.id} ("${train.name}"). Fuel: ${train.fuel.toFixed(2)}. ScheduleIdx: ${train.scheduleIdx}`);
        if (train.schedule.length === 0) {
            console.log(`  - Travel aborted: schedule is empty!`);
            return;
        }
        if (train.fuel <= 0) {
            console.log(`  - Travel aborted: train has 0 fuel!`);
            return;
        }

        let schedEntry = train.schedule[train.scheduleIdx];
        if (!schedEntry) {
            console.log(`  - Travel aborted: no schedule entry at index ${train.scheduleIdx}!`);
            return;
        }

        console.log(`  - Attempting pathfinding to station: "${schedEntry.stationName}" from current pos: (${train.x.toFixed(1)}, ${train.y.toFixed(1)})`);
        let path = this.pathfindRail(train.x, train.y, schedEntry.stationName);
        if (!path) {
            console.log(`  - Pathfinding failed! No path found to "${schedEntry.stationName}".`);
        } else {
            console.log(`  - Path found! Path length: ${path.length}.`);
        }

        if (path && path.length > 1) {
            // Pre-check: refuse to depart if insufficient fuel for the full trip
            let fuelCost = path.length * 0.01;
            if (train.fuel < fuelCost) {
                train.state = 'waiting_fuel';
                return;
            }
            train.currentPath = path;
            train.pathIdx = 0;
            train.pathProgress = 0;
            train.state = 'traveling';
        } else if (path && path.length === 1) {
            // Already at the destination rail tile! Dock immediately.
            let station = this.findStationByName(schedEntry.stationName);
            if (station) {
                train.dockedAtId = station.id;
                station.dockedTrainId = train.id;
                train.waitTimer = 0;
                train.inactivityTimer = 0;
                train.lastTransferTick = 0;
                
                if (schedEntry.condition === 'wait_empty') {
                    train.state = 'unloading';
                } else if (schedEntry.condition === 'wait_timer') {
                    train.state = 'waiting';
                } else {
                    train.state = 'loading';
                }
                
                // Only show text if we weren't just here (prevents spam)
                if (typeof window.floatText === 'function' && train.lastDockedStationId !== station.id) {
                    window.floatText(station.x + 2, station.y, `Train docked: ${train.name}`, '#4caf50');
                }
                train.lastDockedStationId = station.id;
            } else {
                train.state = 'idle';
            }
        } else {
            // Can't find path - stay idle, retry next tick
            train.state = 'idle';
        }
    },

    /**
     * Serialize trains for save data.
     */
    serialize: function() {
        return this.trains.map(t => ({
            id: t.id, name: t.name,
            wagons: t.wagons,
            schedule: t.schedule,
            scheduleIdx: t.scheduleIdx,
            state: t.state,
            x: t.x, y: t.y,
            fuel: t.fuel, maxFuel: t.maxFuel,
            speed: t.speed,
            dockedAtId: t.dockedAtId,
            waitTimer: t.waitTimer,
            posHistory: t.posHistory
        }));
    },

    /**
     * Deserialize trains from save data.
     */
    deserialize: function(data) {
        this.trains = [];
        if (!data || !Array.isArray(data)) return;

        let maxId = 0;
        for (let td of data) {
            let train = {
                id: td.id || this._nextId++,
                name: td.name || 'Train',
                wagons: td.wagons || [],
                schedule: td.schedule || [],
                scheduleIdx: td.scheduleIdx || 0,
                state: td.state || 'idle',
                currentPath: null,
                pathIdx: 0,
                pathProgress: 0,
                speed: td.speed || 10,
                x: td.x || 0, y: td.y || 0,
                fuel: td.fuel || 0,
                maxFuel: td.maxFuel || 500,
                dockedAtId: td.dockedAtId,
                waitTimer: td.waitTimer || 0,
                inactivityTimer: 0,
                lastTransferTick: 0,
                posHistory: td.posHistory || []
            };

            // Rebuild docking references
            if (train.dockedAtId != null) {
                let machines = window.getActiveMachines ? window.getActiveMachines() : [];
                let station = machines[train.dockedAtId];
                if (station && station.type === 'machine_train_stop') {
                    station.dockedTrainId = train.id;
                    // Set loading/unloading state based on schedule
                    let schedEntry = train.schedule[train.scheduleIdx];
                    if (schedEntry) {
                        if (schedEntry.condition === 'wait_empty') train.state = 'unloading';
                        else if (schedEntry.condition === 'wait_timer') train.state = 'waiting';
                        else train.state = 'loading';
                    }
                } else {
                    train.dockedAtId = null;
                    train.state = 'idle';
                }
            }

            this.trains.push(train);
            if (train.id >= maxId) maxId = train.id + 1;
        }
        this._nextId = Math.max(1, maxId);
    }
};
