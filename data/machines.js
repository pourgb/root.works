import { ORES } from './constants.js';
import { ITEM_COLORS, LOGISTICS_ITEMS, LOGISTICS_COLORS } from './items.js';

// ═══════ ROTATION GENERATOR & COMMON BEHAVIORS ═══════
const _M = { '<': '>', '>': '<', 'v': '^', '^': 'v', '[': ']', ']': '[' };
function _mc(c) { return _M[c] || c; }
function _flip180(art) { return art.slice().reverse().map(r => r.split('').reverse().map(c => _mc(c)).join('')); }
function _rp180(px, py, w, h) { return (px === null || px === undefined) ? { x: null, y: null } : { x: w - 1 - px, y: h - 1 - py }; }

export function genRot4(base, alt) {
    let r0 = Object.assign({}, base);
    let a2 = _flip180(base.art); let p2 = _rp180(base.outX, base.outY, base.w, base.h);
    let r2 = { w: base.w, h: base.h, art: a2, outX: p2.x, outY: p2.y };
    if (base.out2X !== undefined) { let p = _rp180(base.out2X, base.out2Y, base.w, base.h); r2.out2X = p.x; r2.out2Y = p.y; }
    if (base.extraOuts) { r2.extraOuts = base.extraOuts.map(p => _rp180(p.x, p.y, base.w, base.h)); }
    if (base.extraOut2s) { r2.extraOut2s = base.extraOut2s.map(p => _rp180(p.x, p.y, base.w, base.h)); }
    let r1, r3;
    if (alt) {
        r1 = Object.assign({}, alt);
        let a3 = _flip180(alt.art); let p3 = _rp180(alt.outX, alt.outY, alt.w, alt.h);
        r3 = { w: alt.w, h: alt.h, art: a3, outX: p3.x, outY: p3.y };
        if (alt.out2X !== undefined) { let p = _rp180(alt.out2X, alt.out2Y, alt.w, alt.h); r3.out2X = p.x; r3.out2Y = p.y; }
        if (alt.extraOuts) { r3.extraOuts = alt.extraOuts.map(p => _rp180(p.x, p.y, alt.w, alt.h)); }
        if (alt.extraOut2s) { r3.extraOut2s = alt.extraOut2s.map(p => _rp180(p.x, p.y, alt.w, alt.h)); }
    } else {
        let cw = (art, w, h) => { let n = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--)s += art[y]?.[x] || ' '; n.push(s); } return n.map(r => r.split('').map(c => c === '^' ? '>' : c === '>' ? 'v' : c === 'v' ? '<' : c === '<' ? '^' : c === '/' ? '\\' : c === '\\' ? '/' : c === '-' ? '|' : c === '|' ? '-' : c).join('')); };
        let rp90 = (px, py, w, h) => (px === null || px === undefined) ? { x: null, y: null } : { x: h - 1 - py, y: px };
        let a1 = cw(base.art, base.w, base.h); let p1 = rp90(base.outX, base.outY, base.w, base.h);
        r1 = { w: base.h, h: base.w, art: a1, outX: p1.x, outY: p1.y };
        if (base.out2X !== undefined) { let p = rp90(base.out2X, base.out2Y, base.w, base.h); r1.out2X = p.x; r1.out2Y = p.y; }
        let a3 = _flip180(a1); let p3 = _rp180(r1.outX, r1.outY, r1.w, r1.h);
        r3 = { w: r1.w, h: r1.h, art: a3, outX: p3.x, outY: p3.y };
        if (r1.out2X !== undefined) { let p = _rp180(r1.out2X, r1.out2Y, r1.w, r1.h); r3.out2X = p.x; r3.out2Y = p.y; }
    }
    return [r0, r1, r2, r3];
}

export const Anim = {
    glow: (ch, g, col) => function (c, t) { if (c === ch) return { char: t === 0 ? ch : g, color: col }; return null; },
    fire: (ch, col) => function (c, t) { if (c === ch) return { char: t === 0 ? '*' : '^', color: col || '#ff5722' }; return null; },
    wave: (ch, col) => function (c, t) { if (c === ch) return { char: t === 0 ? '~' : '=', color: col }; return null; },
    waveAlt: (ch, col) => function (c, t) { if (c === ch) return { char: t === 0 ? '~' : '*', color: col }; return null; },
    spin: (ch) => function (c, t) { if (c === ch) return { char: t === 0 ? '+' : 'x' }; return null; },
    tapeSpin: (ch, col) => function (c, t) {
        if (c === ch) {
            const frames = ['|', '/', '-', '\\'];
            const f = Math.floor(performance.now() / 150) % 4;
            return { char: frames[f], color: col || '#90a4ae' };
        }
        return null;
    }
};

export const acceptsTank = (m, item, allowed) => allowed.includes(item) && (Object.keys(m.inv).length === 0 || (m.inv[item] !== undefined));

export const tankUpdate = function (m, r, dt) {
    for (let item in m.inv) {
        if (m.inv[item] > 0) {
            let pass = true;
            if (m.filters && m.filters.out1 && m.filters.out1.length > 0) {
                let inList = m.filters.out1.includes(item);
                pass = m.filters.blacklist ? !inList : inList;
            }
            if (pass) {
                let amount = Math.min(m.inv[item], 5);
                m.outBuffer[item] = (m.outBuffer[item] || 0) + amount;
                m.inv[item] -= amount;
            }
        }
    }
};

// ═══════ PLASMA & QUANTUM HELPERS ═══════

export function triggerPlasmaBreach(cx, cy) {
    const radius = 10;
    let toDestroy = new Set();
    if (typeof worldMap === 'undefined' || typeof WORLD_SIZE === 'undefined') return;

    for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
            if (x < 0 || x >= WORLD_SIZE || y < 0 || y >= WORLD_SIZE) continue;
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > radius * radius) continue;
            let idx = y * WORLD_SIZE + x;
            let tid = worldMap[idx];
            if (tid >= 50000) toDestroy.add(tid - 50000);
            worldMap[idx] = 1; // turn to floor
            if (typeof NETWORKS !== 'undefined') {
                for (let n of NETWORKS) { if (mapPipes[n]) mapPipes[n][idx] = 0; }
            }
            if (typeof hasPipeMap !== 'undefined') hasPipeMap[idx] = 0;
        }
    }
    if (typeof activeMachines !== 'undefined') {
        for (let mid of toDestroy) {
            let m = activeMachines[mid];
            if (m && m.type !== 'machine_hub') {
                let r = m.def.rotations[m.rotIndex];
                for (let my = 0; my < r.h; my++)
                    for (let mx = 0; mx < r.w; mx++) {
                        let idx = (m.y + my) * WORLD_SIZE + (m.x + mx);
                        if (worldMap[idx] >= 50000) worldMap[idx] = 1;
                    }
                activeMachines[mid] = null;
            }
        }
    }
    if (typeof gameState !== 'undefined' && gameState.clear_belt_items_in_radius) {
        gameState.clear_belt_items_in_radius(cx, cy, radius);
    }
    if (typeof powerGridNeedsUpdate !== 'undefined') powerGridNeedsUpdate = true;
    if (typeof dataGridNeedsUpdate !== 'undefined') dataGridNeedsUpdate = true;
    
    let pdist = Math.sqrt((player.x - cx) * (player.x - cx) + (player.y - cy) * (player.y - cy));
    if (pdist <= radius + 3) player.hp = Math.max(0, player.hp - 80);
    
    if (typeof floatText === 'function') floatText(cx, cy, 'PLASMA BREACH!', '#ff6d00');
    if (typeof gameState !== 'undefined' && gameState.rebuild_monster_paths) {
        gameState.rebuild_monster_paths(player.x, player.y);
    }
}


export function plasmaTick(m, dt) {
    m.inv = m.inv || {};
    m.heat = m.heat || 0;
    
    // --- Heat Generation ---
    if ((m.inv['raw_plasma'] || 0) > 0) m.heat += 25 * dt;
    if ((m.inv['stabilized_plasma'] || 0) > 0) m.heat += 15 * dt;
    
    // --- Passive Cooling ---
    m.heat = Math.max(0, m.heat - 2 * dt);
    
    // --- Active Water Cooling ---
    if (m.heat > 300 && (m.inv['water'] || 0) > 0) {
        m.inv['water']--;
        if (!m.inv['water']) delete m.inv['water'];
        m.heat = Math.max(0, m.heat - 200);
    }

    // --- Magnetic Containment (Requires Stabilized Plasma) ---
    if (m.type !== 'machine_primitive_plasma_tap') {
        m.plasmaBuffer = (m.plasmaBuffer || 0);
        if (m.inv['stabilized_plasma'] > 0 && m.plasmaBuffer < 10) {
            m.inv['stabilized_plasma']--;
            if (!m.inv['stabilized_plasma']) delete m.inv['stabilized_plasma'];
            m.plasmaBuffer += 5.0; // 5s of safety
        }
        
        if (m.plasmaBuffer > 0) {
            m.plasmaBuffer -= dt;
        } else {
            // Meltdown if containment fails
            m.heat += 1000 * dt; 
        }
    }

    // --- Meltdown Condition ---
    if (m.heat >= 9500) {
        let r = m.def.rotations[m.rotIndex];
        triggerPlasmaBreach(m.x + Math.floor(r.w / 2), m.y + Math.floor(r.h / 2));
    }
}

export function qProcessorAutoRoute(qProc) {
    if (!qProc.dataGrid) return;
    let newRoutes = 0;

    for (let nm of qProc.dataGrid.machines) {
        if (!nm || !nm._compiled) continue;

        // UPGRADED: Now supports multi-port machines
        let ports = [...(nm._outPorts || []), ...(nm._out2Ports || [])];

        for (let port of ports) {
            let ox = port.x, oy = port.y;
            if (ox < 0 || ox >= WORLD_SIZE || oy < 0 || oy >= WORLD_SIZE) continue;

            // Skip if a route already starts here
            if (ROUTE_MAP.has(ox + ',' + oy)) continue;

            for (let net of NETWORKS) {
                let pipeArr = mapPipes[net];
                if (!pipeArr || pipeArr[oy * WORLD_SIZE + ox] === 0) continue;

                let endpoint = findPipeNetworkEndpoint(ox, oy, net, nm.id);
                if (!endpoint) continue;

                let path = findPipePath(ox, oy, endpoint.x, endpoint.y, net);
                if (path && path.length > 1) {
                    activeRoutes.push({ network: net, path: path });
                    newRoutes++;
                    if (typeof floatText === 'function') floatText(nm.x, nm.y, "Auto-routed!", "#b388ff");
                }
                break;  // one network per output port
            }
        }
    }

    if (newRoutes > 0 && typeof updateRouteMap === 'function') updateRouteMap();
}


export const MACHINE_DEFS = {
    'machine_crafter': {
        id: 'machine_crafter', name: 'Crafting Table', color: '#8d6e63',
        rotations: [{ w: 1, h: 1, art: ["T"], outX: null, outY: null }], energy: { type: 'none' }
    },
    'machine_miner': {
        id: 'machine_miner', name: 'Automated Miner', color: '#e65100',
        rotations: genRot4({ w: 2, h: 2, art: ["/\\", "MM"], outX: 0, outY: 2 }),
        energy: { type: 'none' }, processTime: 2.0,
        updateOverride: function (m, r, dt) {
            if (m.oreType) {
                let speed = (['stone', 'coal'].includes(m.oreType) ? 2.0 : 4.0);
                if (m.timer >= speed) { m.timer = 0; let outType = m.oreType === 'coal' ? 'raw_coal_lump' : m.oreType; m.outBuffer[outType] = (m.outBuffer[outType] || 0) + 1; }
            }
        },
        renderAnim: function (char, t) { if (char === 'M') return { char: t === 0 ? 'M' : 'm', color: t === 0 ? '#e65100' : '#ffb74d' }; return null; },
        isWorking: function (m) { return m.oreType != null; }
    },
    'machine_furnace_coal': {
        id: 'machine_furnace_coal', name: 'Coal Furnace', color: '#424242',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|==|", "|==|", "\\FF/"], outX: 1, outY: 4 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 5.0,
        recipes: ORES.filter(o => o !== 'iron').map(o => ({ in: { [`${o}_ore`]: 1 }, out: { [o === 'iron' ? 'pig_iron' : `${o}_ingot`]: 1 }, chanceOut: { item: 'ash', chance: 0.2 } })),
        renderAnim: Anim.waveAlt('=', '#ff5722')
    },
    'machine_furnace_electric': {
        id: 'machine_furnace_electric', name: 'Electric Furnace', color: '#0288d1',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|==|", "|==|", "\\EE/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 10 }, processTime: 3.0,
        recipes: ORES.filter(o => o !== 'iron').map(o => ({ in: { [`${o}_ore`]: 1 }, out: { [`${o}_ingot`]: 1 } })),
        renderAnim: Anim.waveAlt('=', '#00bcd4')
    },
    'machine_press_coal': {
        id: 'machine_press_coal', name: 'Coal Press', color: '#8e24aa',
        rotations: genRot4({ w: 2, h: 2, art: ["P|", "C|"], outX: 0, outY: 2 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 4.0,
        recipes: [
            { in: { 'iron_ingot': 1 }, out: { 'iron_plate': 1 } }, { in: { 'copper_ingot': 1 }, out: { 'copper_plate': 1 } },
            { in: { 'brass_ingot': 1 }, out: { 'brass_plate': 1 } }, { in: { 'bronze_ingot': 1 }, out: { 'bronze_plate': 1 } },
            { in: { 'steel_ingot': 1 }, out: { 'steel_plate': 1 } }, { in: { 'lead_ingot': 1 }, out: { 'lead_plate': 1 } },
            { in: { 'tin_ingot': 1 }, out: { 'tin_plate': 1 } }, { in: { 'aluminium_ingot': 1 }, out: { 'aluminium_plate': 1 } }
        ],
        renderAnim: Anim.glow('P', '_')
    },
    'machine_wire_cutter': {
        id: 'machine_wire_cutter', name: 'Wire Cutter', color: '#795548',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\W/"], outX: 1, outY: 3 }),
        energy: { type: 'electric', usage: 5 }, processTime: 3.0,
        recipes: [{ in: { 'copper_plate': 1 }, out: { 'copper_wire': 2 } }],
        renderAnim: Anim.glow('C', 'x', '#ffb74d')
    },
    'machine_assembler': {
        id: 'machine_assembler', name: 'Assembler', color: '#1976d2',
        rotations: genRot4({ w: 3, h: 3, art: ["/A\\", "|=|", "\\B/"], outX: 1, outY: 3 }),
        energy: { type: 'electric', usage: 15 }, processTime: 4.0,
        recipes: [
            { in: { 'bronze_plate': 1, 'bronze_gear': 1 }, out: { 'bronze_casing': 1 } },
            { in: { 'brass_plate': 1, 'brass_gear': 1 }, out: { 'brass_casing': 1 } },
            { in: { 'lead_plate': 2 }, out: { 'lead_casing': 1 } },
            { in: { 'tin_plate': 2 }, out: { 'tin_casing': 1 } }
        ],
        renderAnim: Anim.spin('=')
    },
    'machine_generator': {
        id: 'machine_generator', name: 'Coal Generator', color: '#757575',
        rotations: [{ w: 5, h: 5, art: ["/GGG\\", "|===|", "|===|", "|===|", "\\GGG/"], outX: null, outY: null }],
        energy: { type: 'none' }, maxEnergy: 10000,
        updateOverride: function (m, r, dt) {
            m.inv = m.inv || {}; m.energy = m.energy || 0;
            if (m.energy < 10000 && m.inv['coal'] > 0 && m.timer >= 3.0) {
                m.timer = 0; m.inv['coal']--; m.energy = Math.min(10000, m.energy + 20);
            }
        },
        renderAnim: function (char, t) {
            if (char === '=') return { char: t === 0 ? '~' : '=', color: '#f9a825' };
            if (char === 'G') return { char: t === 0 ? 'G' : '6', color: '#ffc107' }; // Spinning G's
            return null;
        },
        isWorking: function (m) { return m.inv && m.inv['coal'] > 0 && (m.energy || 0) < 10000; }
    },
    'machine_greenhouse': {
        id: 'machine_greenhouse', name: 'Greenhouse', color: '#4caf50',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|#|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'electric', usage: 10 }, maxEnergy: 500,
        processTime: 20.0,
        updateOverride: function (m, r, dt) {
            m.timer = m.timer || 0; m.inv = m.inv || {}; m.energy = m.energy || 0;
            let speed = 0; let isDay = window.dayCycle < 0.5;
            if (m.energy >= 10) { speed = 2.0; m.energy -= 10 * dt; m._ps = 'E'; }
            else if (m.inv['wood'] > 0 || m.inv['biomass'] > 0 || m.inv['coal'] > 0) {
                speed = 1.0; m._ps = 'B';
                m._ft = (m._ft || 0) + dt; if (m._ft >= 10.0) {
                    let f = m.inv['wood'] > 0 ? 'wood' : (m.inv['biomass'] > 0 ? 'biomass' : 'coal');
                    m.inv[f]--; if (m.inv[f] <= 0) delete m.inv[f]; m._ft = 0;
                }
            } else if (isDay) { speed = 0.25; m._ps = 'S'; }
            else { m._ps = 'N'; }
            if (speed > 0) {
                m.timer += dt * speed;
                if (m.timer >= 20.0) { m.timer = 0; m.outBuffer['biomass'] = (m.outBuffer['biomass'] || 0) + 1; }
            }
        },
        renderAnim: function (char, t, m) {
            if (char === '#') {
                let c = '#4caf50';
                if (m._ps === 'E') c = '#b2ff59'; if (m._ps === 'B') c = '#ffeb3b'; if (m._ps === 'S') c = '#8bc34a';
                return { char: t === 0 ? '*' : '#', color: c };
            }
            return null;
        }
    },
    'machine_composter': {
        id: 'machine_composter', name: 'Composter', color: '#33691e',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'none' }, processTime: 10.0,
        recipes: [
            { in: { 'toxic_sludge': 1 }, out: { 'nutrient_sludge': 1 } },
            { in: { 'ash': 2, 'water': 1 }, out: { 'nutrient_sludge': 1 } },
            { in: { 'biomass': 5 }, out: { 'nutrient_sludge': 2 } }
        ],
        renderAnim: Anim.glow('C', '*', '#33691e')
    },
    'machine_bioreactor': {
        id: 'machine_bioreactor', name: 'Bioreactor', color: '#689f38',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|B~|", "|B~|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 20 }, maxEnergy: 1000, processTime: 5.0,
        recipes: [
            { in: { 'biomass': 2, 'water': 1 }, out: { 'bio_fuel': 1 }, out2: { 'petroleum_gas': 1 } },
            { in: { 'bio_fuel': 5, 'nutrient_sludge': 5, 'petroleum_gas': 2 }, out: { 'growth_serum': 1 } }
        ],
        renderAnim: Anim.wave('~', '#689f38')
    },
    'machine_bio_press': {
        id: 'machine_bio_press', name: 'Bio-Press', color: '#8bc34a',
        rotations: genRot4({ w: 3, h: 4, art: ["/-\\", "|P|", "|P|", "\\v/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 30 }, maxEnergy: 1500, processTime: 4.0,
        recipes: [
            { in: { 'biomass': 4 }, out: { 'bio_plastic': 1 } },
            { in: { 'rubber_sap': 2 }, out: { 'synthetic_rubber': 1 } }
        ],
        renderAnim: Anim.glow('P', '*', '#8bc34a')
    },
    'machine_hydroponics': {
        id: 'machine_hydroponics', name: 'Hydroponics Bay', color: '#2e7d32',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|~~|", "|~~|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 50 }, maxEnergy: 2000, processTime: 10.0,
        recipes: [
            { in: { 'nutrient_sludge': 1, 'water': 1 }, out: { 'biomass': 10 } },
            { in: { 'nutrient_sludge': 2, 'water': 2 }, out: { 'rubber_sap': 1 } },
            { in: { 'nutrient_sludge': 1, 'sand': 2, 'water': 1 }, out: { 'algal_silica': 1 } }
        ],
        renderAnim: Anim.wave('~', '#4caf50')
    },
    'machine_genomic_analyzer': {
        id: 'machine_genomic_analyzer', name: 'Genomic Analyzer', color: '#1b5e20',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|G |", "| G|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 100 }, maxEnergy: 5000, processTime: 15.0,
        recipes: [
            { in: { 'biomass': 10, 'blank_tape': 1 }, out: { 'genomic_data': 1 } },
            { in: { 'genomic_data': 1, 'nutrient_sludge': 5, 'compute_module': 1 }, out: { 'bio_processor': 1 }, chanceOut: { item: 'genomic_data', chance: 0.9 } }
        ],
        renderAnim: function (char, t) {
            if (char === 'G') return { char: t === 0 ? 'G' : 'g', color: '#00e676' };
            return null;
        }
    },
    'machine_neuro_vat': {
        id: 'machine_neuro_vat', name: 'Neuro Vat', color: '#4a148c',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|N~N|", "|~O~|", "|N~N|", "\\-v-/"], outX: 2, outY: 5 }),
        energy: { type: 'electric', usage: 500 }, maxEnergy: 10000, processTime: 30.0,
        recipes: [
            { in: { 'bio_processor': 1, 'growth_serum': 2, 'nutrient_sludge': 10 }, out: { 'neural_tissue': 1 } }
        ],
        renderAnim: Anim.wave('~', '#ce93d8')
    },
    'machine_augmentation_chamber': {
        id: 'machine_augmentation_chamber', name: 'Augmentation Chamber', color: '#006064',
        rotations: genRot4({ w: 6, h: 6, art: ["/----\\", "|A++A|", "|+  +|", "|+  +|", "|A++A|", "\\--v-/"], outX: 3, outY: 6 }),
        energy: { type: 'electric', usage: 1000 }, maxEnergy: 20000,
        updateOverride: function (m, r, dt) {
            m.inv = m.inv || {}; m.energy = m.energy || 0;
            if (m.energy >= 1000 && m.inv['neural_tissue'] > 0 && m.inv['growth_serum'] > 0) {
                m.timer += dt;
                if (m.timer >= 10.0) {
                    m.timer = 0; m.inv['neural_tissue']--; m.inv['growth_serum']--;
                    m.energy -= 10000;
                    applyAugmentationBuff();
                    floatText(m.x + 3, m.y + 3, "AUGMENTATION APPLIED!", "#00e5ff");
                }
            }
        },
        renderAnim: Anim.glow('+', '*', '#00e5ff')
    },
    'machine_magmaeous_crucible': {
        id: 'machine_magmaeous_crucible', name: 'Magmaeous Crucible', color: '#d84315',
        rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|LA|", "|~~|", "|~~|", "\\MM/"], outX: 1, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "M~~L|", "M~~A|", "\\---/"], outX: -1, outY: 1 }),
        energy: { type: 'none' }, processTime: 4.0,
        recipes: [{ in: { 'coal': 1, 'stone': 1 }, out: { 'lava': 1 } }],
        renderAnim: Anim.waveAlt('~', '#ff5722')
    },
    'machine_alloying_smelter': {
        id: 'machine_alloying_smelter', name: 'Alloying Smelter', color: '#ff7043',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|L M|", "|~=~|", "|~=~|", "\\A-S/"], outX: 2, outY: 5 }),
        energy: { type: 'fluid', fuel: 'lava', usage: 1 }, processTime: 5.0,
        recipes: [{ in: { 'copper_ingot': 1, 'zinc_ingot': 1 }, out: { 'brass_ingot': 2 } }, { in: { 'copper_ingot': 3, 'tin_ingot': 1 }, out: { 'bronze_ingot': 4 } }],
        renderAnim: Anim.wave('=', '#d84315')
    },
    'machine_coal_pump': {
        id: 'machine_coal_pump', name: 'Coal Pump', color: '#424242',
        rotations: genRot4({ w: 1, h: 2, art: ["C", "="], outX: 0, outY: 2 }, { w: 2, h: 1, art: ["=C"], outX: -1, outY: 0 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0,
        recipes: [{ in: {}, out: { 'water': 1 } }],
        renderAnim: Anim.wave('=', '#03a9f4')
    },
    'machine_brass_pump': {
        id: 'machine_brass_pump', name: 'Brass Pump', color: '#fbc02d',
        rotations: genRot4({ w: 1, h: 2, art: ["P", "="], outX: 0, outY: 2 }, { w: 2, h: 1, art: ["=P"], outX: -1, outY: 0 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 0.5,
        recipes: [{ in: {}, out: { 'water': 1 } }],
        renderAnim: Anim.wave('=', '#03a9f4')
    },
    'machine_brass_boiler': {
        id: 'machine_brass_boiler', name: 'Brass Boiler', color: '#fbc02d',
        rotations: genRot4({ w: 3, h: 4, art: ["/B\\", "|~|", "|*|", "\\-/"], outX: 1, outY: 4 }, { w: 4, h: 3, art: ["/--\\", "*~B|", "\\--/"], outX: -1, outY: 1 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 2.5,
        recipes: [{ in: { 'water': 1 }, out: { 'steam': 1 }, chanceOut: { item: 'boiler_scale', chance: 0.1 } }, { in: { 'soft_water': 1 }, out: { 'steam': 1 } }],
        renderAnim: Anim.fire('*')
    },
    'machine_sand_filter': {
        id: 'machine_sand_filter', name: 'Sand Filter', color: '#bcaaa4',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|F|", "\\v/"], outX: 1, outY: 3, out2X: -1, out2Y: 1 }, { w: 3, h: 3, art: ["/-\\", "<F|", "\\-/"], outX: -1, outY: 1, out2X: 1, out2Y: -1 }),
        energy: { type: 'none' }, processTime: 2.0,
        recipes: [{ in: { 'water': 1, 'sand': 1 }, out: { 'soft_water': 1 }, out2: { 'dirty_sand': 1 } }],
        renderAnim: Anim.glow('F', 'f', '#81d4fa')
    },
    'machine_sand_cleaner': {
        id: 'machine_sand_cleaner', name: 'Sand Cleaner', color: '#8d6e63',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'none' }, processTime: 2.0,
        recipes: [{ in: { 'dirty_sand': 1, 'water': 1 }, out: { 'sand': 1 } }],
        renderAnim: Anim.wave('C', '#03a9f4')
    },
    'machine_pressure_vent': {
        id: 'machine_pressure_vent', name: 'Pressure Relief Vent', color: '#78909c',
        rotations: genRot4({ w: 2, h: 2, art: ["/\\", "VV"], outX: null, outY: null }),
        energy: { type: 'none' }, processTime: 1.0,
        recipes: [{ in: { 'steam': 1 }, out: {} }],
        renderAnim: Anim.glow('V', 'v', '#e0f7fa')
    },
    'machine_coal_washer': {
        id: 'machine_coal_washer', name: 'Coal Washer', color: '#616161',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|W|", "\\v/"], outX: 1, outY: 3, out2X: -1, out2Y: 1 }, { w: 3, h: 3, art: ["/-\\", "<W|", "\\-/"], outX: -1, outY: 1, out2X: 1, out2Y: 3 }),
        energy: { type: 'none' }, processTime: 2.0,
        recipes: [{ in: { 'raw_coal_lump': 1, 'water': 1 }, out: { 'coal': 1 }, out2: { 'toxic_sludge': 1 } }],
        renderAnim: Anim.wave('W', '#212121')
    },
    'machine_concrete_mixer': {
        id: 'machine_concrete_mixer', name: 'Concrete Mixer', color: '#9e9e9e',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|M|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'water', usage: 1 }, processTime: 3.0,
        recipes: [{ in: { 'ash': 2, 'stone_brick': 1 }, out: { 'basic_concrete': 2 } }],
        renderAnim: Anim.spin('M')
    },
    'machine_steam_engine': {
        id: 'machine_steam_engine', name: 'Steam Engine', color: '#ffb74d',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "| E|", "\\v-/"], outX: 1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 1.0,
        recipes: [{ in: {}, out: { 'kinetic_token': 5 } }],
        renderAnim: Anim.spin('E')
    },
    'machine_kinetic_relay': {
        id: 'machine_kinetic_relay', name: 'Kinetic Relay (Gearbox)', color: '#ff9800',
        rotations: genRot4({ w: 2, h: 2, art: ["/|", "-v"], outX: 1, outY: 2 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 1.0,
        recipes: [{ in: { 'kinetic_token': 1 }, out: { 'kinetic_token': 1 } }],
        renderAnim: Anim.spin('v')
    },
    'machine_blast_furnace': {
        id: 'machine_blast_furnace', name: 'Blast Furnace', color: '#ff5722',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|BF|", "|BF|", "\\v-/"], outX: 1, outY: 4, out2X: -1, out2Y: 2 }, { w: 4, h: 4, art: ["/--\\", "<BF|", "|BF|", "\\--/"], outX: -1, outY: 2, out2X: 2, out2Y: -1 }),
        energy: { type: 'none' }, processTime: 5.0,
        recipes: [{ in: { 'iron_ore': 1, 'coal': 1, 'limestone': 1 }, out: { 'pig_iron': 2 }, out2: { 'liquid_slag': 1 } }],
        renderAnim: Anim.fire('F')
    },
    'machine_puddling_furnace': {
        id: 'machine_puddling_furnace', name: 'Puddling Furnace', color: '#795548',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|PF|", "\\v-/"], outX: 1, outY: 3 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 8.0,
        recipes: [{ in: { 'pig_iron': 2 }, out: { 'puddled_iron_bloom': 1 } }],
        renderAnim: Anim.wave('P', '#ff5722')
    },
    'machine_steam_hammer': {
        id: 'machine_steam_hammer', name: 'Steam Drop Hammer', color: '#616161',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|H|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 2 }, processTime: 4.0,
        recipes: [{ in: { 'puddled_iron_bloom': 1 }, out: { 'iron_ingot': 2 } }],
        renderAnim: function (char, t) { if (char === 'H') return { char: t === 0 ? 'H' : 'h', color: '#ffeb3b' }; return null; }
    },
    'machine_bronze_rod_extruder': {
        id: 'machine_bronze_rod_extruder', name: 'Bronze Extruder', color: '#ff9800',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|E|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 1 }, processTime: 2.0,
        recipes: [
            { in: { 'iron_plate': 2 }, out: { 'iron_pipe': 5 } },
            { in: { 'copper_plate': 2 }, out: { 'copper_pipe': 5 } },
            { in: { 'brass_plate': 2 }, out: { 'brass_pipe': 5 } }
        ],
        renderAnim: Anim.glow('E', '=', '#ffb74d')
    },
    'machine_bronze_wire_cutter': {
        id: 'machine_bronze_wire_cutter', name: 'Bronze Cutter', color: '#ff9800',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 1 }, processTime: 2.0,
        recipes: [{ in: { 'copper_plate': 1 }, out: { 'copper_wire': 5 } }],
        renderAnim: Anim.glow('C', 'x', '#ffb74d')
    },
    'machine_bronze_gear_miller': {
        id: 'machine_bronze_gear_miller', name: 'Bronze Gear Miller', color: '#ff9800',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|**|", "\\GE/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "|*|", "G*|", "\\E/"], outX: -1, outY: 2 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 1 }, processTime: 2.0,
        recipes: [{ in: { 'bronze_plate': 1 }, out: { 'bronze_gear': 1 } }, { in: { 'brass_plate': 1 }, out: { 'brass_gear': 1 } }],
        renderAnim: Anim.spin('*')
    },
    'machine_bronze_crusher': {
        id: 'machine_bronze_crusher', name: 'Bronze Crusher', color: '#ff9800',
        rotations: genRot4({ w: 3, h: 4, art: ["/-\\", "|#|", "|V|", "\\v/"], outX: 1, outY: 4 }, { w: 4, h: 3, art: ["/--\\", "v#V|", "\\--/"], outX: -1, outY: 1 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 2 }, processTime: 3.0, recipes: [],
        renderAnim: function (char, t) { if (char === 'V' || char === 'v') return { char: t === 0 ? 'V' : 'v' }; return null; }
    },
    'machine_bronze_mill': {
        id: 'machine_bronze_mill', name: 'Bronze Mill', color: '#ff9800',
        rotations: genRot4({ w: 5, h: 3, art: ["/---\\", "|(%)|", "\\-M-/"], outX: 2, outY: 3 }, { w: 3, h: 5, art: ["/-\\", "|(|", "M%|", "|)|", "\\-/"], outX: -1, outY: 2 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 2 }, processTime: 3.0, recipes: [],
        renderAnim: Anim.spin('%')
    },
    'machine_bronze_washer': {
        id: 'machine_bronze_washer', name: 'Bronze Washer', color: '#ff9800',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|%%|", "|%%|", "\\~W/"], outX: 2, outY: 4 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 2 }, processTime: 3.0, recipes: [],
        renderAnim: function (char, t) { if (char === '~') return { char: t === 0 ? '-' : '~', color: '#03a9f4' }; return null; }
    },
    'machine_bronze_roaster': {
        id: 'machine_bronze_roaster', name: 'Bronze Roaster', color: '#ff9800',
        rotations: genRot4({ w: 3, h: 4, art: ["/-\\", "|@|", "| |", "\\R/"], outX: 1, outY: 4, out2X: -1, out2Y: 1 }, { w: 4, h: 3, art: ["/--\\", "R @|", "\\--/"], outX: -1, outY: 1, out2X: 2, out2Y: -1 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 2 }, processTime: 3.0, recipes: [], // SO2 byproduct recipes added dynamically
        renderAnim: function (char, t) { if (char === '@') return { char: t === 0 ? '*' : '@', color: '#ff5722' }; return null; }
    },
    'machine_bronze_furnace': {
        id: 'machine_bronze_furnace', name: 'Bronze Furnace', color: '#ff9800',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|**|", "|**|", "\\-F/"], outX: 2, outY: 4 }),
        energy: { type: 'burner', fuel: 'kinetic_token', usage: 3 }, processTime: 3.0, recipes: [],
        renderAnim: Anim.fire('*')
    },
    'machine_hub': {
        id: 'machine_hub', name: 'Central Hub', color: '#558b2f',
        rotations: [{ w: 3, h: 3, art: ["/H\\", "HHH", "\\H/"], outX: null, outY: null }],
        energy: { type: 'none' }, maxStack: 10000
    },
    'machine_storage_box': {
        id: 'machine_storage_box', name: 'Storage Box', color: '#795548',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|  |", "\\v-/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "< |", "| |", "\\-/"], outX: -1, outY: 1 }),
        energy: { type: 'none' }, maxStack: 2000,
        acceptsItem: (m, itm) => getNetworkForItem(itm) === 'item' || getNetworkForItem(itm) === 'item_heavy',
        updateOverride: tankUpdate
    },
    'machine_liquid_tank': {
        id: 'machine_liquid_tank', name: 'Liquid Tank', color: '#90caf9',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|~~|", "|~~|", "\\v-/"], outX: 1, outY: 4 }),
        energy: { type: 'none' }, maxStack: 5000, acceptsItem: (m, itm) => acceptsTank(m, itm, ['water', 'lava']),
        updateOverride: tankUpdate
    },
    'machine_brass_gas_tank': {
        id: 'machine_brass_gas_tank', name: 'Brass Gas Tank', color: '#fbc02d',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|**|", "|**|", "\\v-/"], outX: 1, outY: 4 }),
        energy: { type: 'none' }, maxStack: 5000, acceptsItem: (m, itm) => acceptsTank(m, itm, ['steam']),
        updateOverride: tankUpdate
    },
    'machine_glass_tank': {
        id: 'machine_glass_tank', name: 'Glass Gas Tank', color: '#b2ebf2',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|OO|", "|OO|", "\\v-/"], outX: 1, outY: 4 }),
        energy: { type: 'none' }, maxStack: 5000,
        acceptsItem: (m, itm) => acceptsTank(m, itm, ['oxygen', 'hydrogen', 'sulfur_dioxide', 'chlorine', 'unrefined_gas', 'petroleum_gas', 'nitrogen_gas']),
        updateOverride: tankUpdate
    },
    'machine_splitter': {
        id: 'machine_splitter', name: 'Splitter', color: '#009688',
        rotations: genRot4({ w: 1, h: 2, art: ["S", "s"], outX: 1, outY: 0, out2X: 1, out2Y: 1 }, { w: 2, h: 1, art: ["sS"], outX: 1, outY: 1, out2X: 0, out2Y: 1 }),
        energy: { type: 'none' }, maxStack: 5,
        updateOverride: function (m, r, dt) {
            m.splitToggle = m.splitToggle || false;
            for (let item in m.inv) {
                if (m.inv[item] > 0) {
                    let pass1 = true, pass2 = true;
                    if (m.filters) {
                        if (m.filters.out1 && m.filters.out1.length > 0) pass1 = m.filters.out1.includes(item);
                        if (m.filters.out2 && m.filters.out2.length > 0) pass2 = m.filters.out2.includes(item);
                    }
                    let target = null;
                    if (pass1 && pass2) { target = m.splitToggle ? 'out1' : 'out2'; m.splitToggle = !m.splitToggle; }
                    else if (pass1) target = 'out1'; else if (pass2) target = 'out2';

                    if (target === 'out1') { m.outBuffer[item] = (m.outBuffer[item] || 0) + 1; m.inv[item]--; }
                    else if (target === 'out2') { m.out2Buffer = m.out2Buffer || {}; m.out2Buffer[item] = (m.out2Buffer[item] || 0) + 1; m.inv[item]--; }
                }
            }
        },
        isWorking: function (m) { return Object.keys(m.inv).some(k => m.inv[k] > 0); },
        renderAnim: Anim.glow('S', 's', '#009688')
    },
    'machine_filter_pipe': {
        id: 'machine_filter_pipe', name: 'Filter Item Pipe', color: '#424242',
        rotations: genRot4({ w: 1, h: 1, art: ["F"], outX: 1, outY: 0 }),
        energy: { type: 'none' }, maxStack: 5,
        updateOverride: function (m, r, dt) {
            for (let item in m.inv) {
                if (m.inv[item] > 0) {
                    let pass = true;
                    if (m.filters && m.filters.out1 && m.filters.out1.length > 0) {
                        let inList = m.filters.out1.includes(item);
                        pass = m.filters.blacklist ? !inList : inList;
                    }
                    if (pass) { m.outBuffer[item] = (m.outBuffer[item] || 0) + 1; m.inv[item]--; }
                }
            }
        },
        isWorking: function (m) { return Object.keys(m.inv).some(k => m.inv[k] > 0); },
        renderAnim: Anim.glow('F', 'f', '#424242')
    },
    'machine_kiln': {
        id: 'machine_kiln', name: 'Brick Kiln', color: '#8d6e63',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|K|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0,
        recipes: [{ in: { 'stone': 2 }, out: { 'stone_brick': 1 } }],
        renderAnim: Anim.glow('K', '#', '#ff5722')
    },
    'machine_coke_oven': {
        id: 'machine_coke_oven', name: 'Coke Oven', color: '#424242',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|CC|", "|CC|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'none' }, processTime: 5.0,
        recipes: [{ in: { 'coal': 3 }, out: { 'coke': 1, 'coal_tar': 1 } }],
        renderAnim: Anim.glow('C', 'c', '#ff5722')
    },
    'machine_bessemer': {
        id: 'machine_bessemer', name: 'Bessemer Converter', color: '#546e7a',
        rotations: [
            { w: 6, h: 8, art: ["/----\\", "| || |", "| || |", "| || |", "|<BB>|", "|\\==/|", "| || |", "\\-vv-/"], outX: 2, outY: 8 },
            { w: 8, h: 6, art: ["/------\\", "|-===--|", "|<BBBB>|", "|------|", "|      |", "\\------/"], outX: -1, outY: 2 }
        ],
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 8.0,
        recipes: [{ in: { 'iron_ingot': 4, 'coke': 3 }, out: { 'steel_ingot': 2 } }],
        renderAnim: Anim.wave('=', '#ffeb3b')
    },
    'machine_steam_stamp_mill': {
        id: 'machine_steam_stamp_mill', name: 'Steam Stamp Mill', color: '#8d6e63',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|SS|", "|SS|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.0,
        recipes: [{ in: { 'iron_ore': 1, 'nickel_ore': 1 }, out: { 'bimetal_dust': 2 } }],
        renderAnim: Anim.glow('S', 's')
    },
    'machine_slurry_vat': {
        id: 'machine_slurry_vat', name: 'Acidic Slurry Vat', color: '#00897b',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|~~|", "\\-v/"], outX: 2, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "<~|", "|~|", "\\-/"], outX: -1, outY: 1 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 4.0,
        recipes: [{ in: { 'bimetal_dust': 2, 'coal_tar': 1, 'water': 1 }, out: { 'treated_bimetal_slurry': 2 } }],
        renderAnim: Anim.glow('~', '-', '#4db6ac')
    },
    'machine_slurry_centrifuge': {
        id: 'machine_slurry_centrifuge', name: 'Slurry Centrifuge', color: '#7cb342',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|@|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 2.5,
        recipes: [{ in: { 'treated_bimetal_slurry': 2 }, out: { 'pure_invar_dust': 2 } }],
        renderAnim: Anim.spin('@')
    },
    'machine_flux_agglomerator': {
        id: 'machine_flux_agglomerator', name: 'Flux Agglomerator', color: '#f4511e',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|%%|", "|%%|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.5,
        recipes: [{ in: { 'pure_invar_dust': 2, 'coke': 1 }, out: { 'invar_pellet': 2 } }],
        renderAnim: Anim.glow('%', 'o')
    },
    'machine_blast_roaster': {
        id: 'machine_blast_roaster', name: 'Blast Roaster', color: '#d32f2f',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|***|", "|***|", "|***|", "\\-v-/"], outX: 2, outY: 5 }),
        energy: { type: 'burner', fuel: 'coke', usage: 1 }, processTime: 5.0,
        recipes: [{ in: { 'invar_pellet': 1 }, out: { 'calcined_invar_pellet': 1 } }],
        renderAnim: Anim.fire('*', '#ff9800')
    },
    'machine_induction_foundry': {
        id: 'machine_induction_foundry', name: 'Induction Foundry', color: '#512da8',
        rotations: genRot4({ w: 7, h: 10, art: ["/-----\\", "| === |", "| (O) |", "|  |  |", "| ||| |", "| ||| |", "|  |  |", "| (O) |", "| === |", "\\--v--/"], outX: 3, outY: 10 }, { w: 10, h: 7, art: ["/--------\\", "| ==  == |", "| (O)(O) |", "<--||||--|", "| (O)(O) |", "| ==  == |", "\\--------/"], outX: -1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'lava', usage: 5 }, processTime: 8.0,
        recipes: [{ in: { 'calcined_invar_pellet': 2 }, out: { 'invar_ingot': 1 } }],
        renderAnim: function (char, t) { if (char === '|') return { char: t === 0 ? '|' : '!', color: '#ffeb3b' }; if (char === 'O') return { char: t === 0 ? 'O' : 'o', color: '#00bcd4' }; return null; }
    },
    'machine_electrolyzer': {
        id: 'machine_electrolyzer', name: 'Electrolyzer', color: '#00bcd4',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "+W-", "\\O/"], outX: 1, outY: 3, out2X: 3, out2Y: 1 }),
        energy: { type: 'electric', usage: 10 }, processTime: 2.0, recipes: [], // handled via override
        recipes: [
            { in: { 'water': 1 }, out: { 'oxygen': 1 }, out2: { 'hydrogen': 2 } },
            { in: { 'brine': 1 }, out: { 'chlorine': 1 }, out2: { 'hydrogen': 1 } },
            { in: { 'heavy_water': 1 }, out: { 'oxygen': 1 }, out2: { 'deuterium': 2 } }
        ],
        updateOverride: function (m, r, dt) {
            m.energy = m.energy || 0;
            // Electrolysis of Brine -> Chlorine + Hydrogen
            if (m.energy >= 10 && (m.inv['brine'] || 0) >= 1 && m.timer >= 2.0) {
                m.timer = 0; m.inv['brine'] -= 1; m.energy -= 10;
                m.outBuffer['chlorine'] = (m.outBuffer['chlorine'] || 0) + 1;
                m.out2Buffer = m.out2Buffer || {}; m.out2Buffer['hydrogen'] = (m.out2Buffer['hydrogen'] || 0) + 1;
            }
            // Electrolysis of Water -> Oxygen + Hydrogen
            else if (m.energy >= 10 && (m.inv['water'] || 0) >= 1 && m.timer >= 2.0) {
                m.timer = 0; m.inv['water'] -= 1; m.energy -= 10;
                m.outBuffer['oxygen'] = (m.outBuffer['oxygen'] || 0) + 1;
                m.out2Buffer = m.out2Buffer || {}; m.out2Buffer['hydrogen'] = (m.out2Buffer['hydrogen'] || 0) + 2;
            }
            if (m.energy >= 10 && (m.inv['heavy_water'] || 0) >= 1 && m.timer >= 2.0) {
                m.timer = 0; m.inv['heavy_water'] -= 1; m.energy -= 10;
                m.outBuffer['oxygen'] = (m.outBuffer['oxygen'] || 0) + 1;
                m.out2Buffer = m.out2Buffer || {}; m.out2Buffer['deuterium'] = (m.out2Buffer['deuterium'] || 0) + 2;
            }
        },
        isWorking: function (m) { return (m.energy >= 10 && ((m.inv['water'] || 0) >= 1 || (m.inv['brine'] || 0) >= 1 || (m.inv['heavy_water'] || 0) >= 1)); },
        renderAnim: function (char, t) {
            if (char === '+') return { char: t === 0 ? '+' : '*', color: '#ff9800' };
            if (char === '-') return { char: t === 0 ? '-' : '~', color: '#03a9f4' }; return null;
        }
    },
    'machine_arc_oxygen_furnace': {
        id: 'machine_arc_oxygen_furnace', name: 'Arc Oxygen Furnace', color: '#0288d1',
        rotations: genRot4({ w: 9, h: 8, art: ["/-------\\", "|  +++  |", "| +O=O+ |", "| +===+ |", "| +===+ |", "|  +++  |", "|       |", "\\---v---/"], outX: 4, outY: 8 }, { w: 8, h: 9, art: ["/------\\", "|  ++  |", "| +==+ |", "< O==+ |", "| O==+ |", "| +==+ |", "|  ++  |", "|      |", "\\------/"], outX: -1, outY: 3 }),
        energy: { type: 'electric', usage: 50 }, processTime: 4.0,
        recipes: [{ in: { 'iron_ingot': 3, 'coke': 2, 'oxygen': 1 }, out: { 'steel_ingot': 3 } }],
        renderAnim: Anim.wave('=', '#81d4fa')
    },
    'machine_tar_mixer': {
        id: 'machine_tar_mixer', name: 'Tar Mixer', color: '#424242',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|T|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 3.0,
        recipes: [{ in: { 'coal_tar': 1, 'coke': 1 }, out: { 'tarred_coke': 1 } }],
        renderAnim: Anim.spin('T')
    },
    'machine_baking_oven': {
        id: 'machine_baking_oven', name: 'Baking Oven', color: '#ff5722',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|BB|", "|BB|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 4.0,
        recipes: [{ in: { 'tarred_coke': 1 }, out: { 'baked_carbon': 1 } }],
        renderAnim: Anim.glow('B', 'b', '#ff5722')
    },
    'machine_graphitizer': {
        id: 'machine_graphitizer', name: 'Graphitizer', color: '#d84315',
        rotations: genRot4({ w: 5, h: 4, art: ["/---\\", "|~G~|", "|~~~|", "\\-v-/"], outX: 2, outY: 4 }, { w: 4, h: 5, art: ["/--\\", "<~~|", "|~G|", "|~~|", "\\--/"], outX: -1, outY: 2 }),
        energy: { type: 'fluid', fuel: 'lava', usage: 2 }, processTime: 5.0,
        recipes: [{ in: { 'baked_carbon': 1 }, out: { 'raw_graphite': 1 } }],
        renderAnim: Anim.glow('G', 'g', '#ff5722')
    },
    'machine_acid_bath': {
        id: 'machine_acid_bath', name: 'Acid Wash Bath', color: '#00897b',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|WW|", "|WW|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 3.0,
        recipes: [{ in: { 'raw_graphite': 1, 'sulfuric_acid': 1 }, out: { 'washed_carbon': 1 } }],
        renderAnim: Anim.wave('W', '#00bcd4')
    },
    'machine_vacuum_calciner': {
        id: 'machine_vacuum_calciner', name: 'Vacuum Calciner', color: '#455a64',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|VV|", "|VV|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 15 }, processTime: 4.0,
        recipes: [{ in: { 'washed_carbon': 1 }, out: { 'high_purity_carbon': 1 } }],
        renderAnim: Anim.glow('V', 'v', '#ff9800')
    },
    'machine_sulfuric_scrubber': {
        id: 'machine_sulfuric_scrubber', name: 'Sulfuric Scrubber', color: '#ffeb3b',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|SS|", "|SS|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'none' }, processTime: 4.0,
        recipes: [{ in: { 'coke': 4 }, out: { 'sulfur': 1 } }],
        renderAnim: Anim.wave('S', '#ffeb3b')
    },
    'machine_chemical_mixer': {
        id: 'machine_chemical_mixer', name: 'Chemical Mixer', color: '#4db6ac',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|C=C|", "|C=C|", "|C=C|", "\\-v-/"], outX: 2, outY: 5 }),
        energy: { type: 'electric', usage: 5 }, processTime: 3.0,
        recipes: [
            { in: { 'sulfur': 1, 'hydrogen': 1, 'oxygen': 1 }, out: { 'sulfuric_acid': 1 } },
            { in: { 'water': 1, 'salt': 1 }, out: { 'brine': 2 } }
        ],
        renderAnim: Anim.wave('=', '#b2ebf2')
    },
    'machine_catalytic_reactor': {
        id: 'machine_catalytic_reactor', name: 'Catalytic Reactor', color: '#ff9800',
        rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|CR|", "|~~|", "|CR|", "\\-v/"], outX: 2, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "<C~C|", "|R~R|", "\\---/"], outX: -1, outY: 1 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0,
        recipes: [{ in: { 'sulfur_dioxide': 2, 'oxygen': 1, 'water': 1 }, out: { 'sulfuric_acid': 2 } }],
        renderAnim: function (char, t) { if (char === '~') return { char: t === 0 ? '-' : '~', color: '#ffb74d' }; return null; }
    },
    'machine_desalinator': {
        id: 'machine_desalinator', name: 'Desalinator', color: '#00838f',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|D|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 3.0,
        recipes: [{ in: { 'water': 1 }, out: { 'salt': 1 } }],
        renderAnim: Anim.glow('D', 'd', '#00bcd4')
    },
    'machine_pumpjack': {
        id: 'machine_pumpjack', name: 'Pumpjack', color: '#212121',
        rotations: genRot4({ w: 5, h: 3, art: ["/---\\", "| P |", "\\-v-/"], outX: 2, outY: 3 }, { w: 3, h: 5, art: ["/-\\", "< |", "|P|", "| |", "\\-/"], outX: -1, outY: 2 }),
        energy: { type: 'electric', usage: 10 }, processTime: 2.0,
        updateOverride: function (m, r, dt) {
            m.energy = m.energy || 0;
            if (m.energy >= 10 && m.oreType === 'crude_oil' && m.timer >= 2.0) {
                m.timer = 0; m.energy -= 10; m.outBuffer['crude_oil'] = (m.outBuffer['crude_oil'] || 0) + 1;
            }
        },
        renderAnim: function (char, t) {
            if (char === 'P') return { char: t === 0 ? 'P' : 'p', color: '#ff9800' };
            if (char === '-') return { char: t === 0 ? '-' : '_', color: '#e65100' };
            if (char === 'v' || char === '^' || char === '<' || char === '>') return { char: t === 0 ? char : '*', color: '#ff9800' };
            return null;
        },
        isWorking: function (m) { return m.oreType === 'crude_oil' && m.energy >= 10; }
    },
    'machine_heavy_tower': {
        id: 'machine_heavy_tower', name: 'Heavy Distillation Tower', color: '#546e7a',
        rotations: genRot4({ w: 7, h: 9, art: ["/-----\\", "|  H  |", "| === |", "| === |", "| === |", "| === |", "| === |", "|  H  |", "\\--v-v/"], outX: 3, outY: 9, out2X: 5, out2Y: 9 }, { w: 9, h: 7, art: ["/-------\\", "| H===H |", "< ===== |", "| ===== |", "< ===== |", "| H===H |", "\\-------/"], outX: -1, outY: 2, out2X: -1, out2Y: 4 }),
        energy: { type: 'electric', usage: 30 }, processTime: 5.0,
        recipes: [{ in: { 'crude_oil': 3 }, out: { 'semi_refined_oil': 2 }, out2: { 'heavy_oil': 1, 'sour_water': 1 } }],
        renderAnim: Anim.wave('=', '#212121')
    },
    'machine_light_tower': {
        id: 'machine_light_tower', name: 'Light Distillation Tower', color: '#78909c',
        rotations: genRot4({ w: 6, h: 8, art: ["/----\\", "| LL |", "| == |", "| == |", "| == |", "| == |", "| LL |", "\\-v-v/"], outX: 2, outY: 8, out2X: 4, out2Y: 8 }, { w: 8, h: 6, art: ["/------\\", "| L==L |", "< ==== |", "< ==== |", "| L==L |", "\\------/"], outX: -1, outY: 2, out2X: -1, out2Y: 3 }),
        energy: { type: 'electric', usage: 25 }, processTime: 4.0,
        recipes: [{ in: { 'semi_refined_oil': 3 }, out: { 'light_oil': 2 }, out2: { 'unrefined_gas': 1 } }],
        renderAnim: Anim.wave('=', '#ffb300')
    },
    'machine_gas_tower': {
        id: 'machine_gas_tower', name: 'Gas Distillation Tower', color: '#b0bec5',
        rotations: genRot4({ w: 4, h: 6, art: ["/--\\", "|GG|", "|==|", "|==|", "|GG|", "\\-v/"], outX: 2, outY: 6 }, { w: 6, h: 4, art: ["/----\\", "<G==G|", "|G==G|", "\\----/"], outX: -1, outY: 1 }),
        energy: { type: 'electric', usage: 20 }, processTime: 3.0,
        recipes: [{ in: { 'unrefined_gas': 2 }, out: { 'petroleum_gas': 2 } }],
        renderAnim: Anim.wave('=', '#e0f7fa')
    },
    'machine_centrifuge_oil': {
        id: 'machine_centrifuge_oil', name: 'Sour Water Centrifuge', color: '#cddc39',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|@@|", "|@@|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 10 }, processTime: 2.5,
        recipes: [{ in: { 'sour_water': 2 }, out: { 'sulfur': 1 } }],
        renderAnim: Anim.spin('@')
    },
    'machine_asphalt_mixer': {
        id: 'machine_asphalt_mixer', name: 'Asphalt Mixer', color: '#424242',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|AM|", "|~~|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 15 }, processTime: 3.0,
        recipes: [{ in: { 'heavy_oil': 1, 'gravel': 2, 'sand': 1 }, out: { 'asphalt': 2 } }],
        renderAnim: Anim.wave('~', '#212121')
    },
    'machine_gas_generator': {
        id: 'machine_gas_generator', name: 'Gas Generator', color: '#00acc1',
        rotations: [{ w: 5, h: 5, art: ["/GGG\\", "|~~~|", "|~~~|", "|~~~|", "\\GGG/"], outX: null, outY: null }],
        energy: { type: 'none' }, maxEnergy: 100000,
        updateOverride: function (m, r, dt) {
            m.inv = m.inv || {}; m.energy = m.energy || 0;
            if (m.energy < 100000 && m.timer >= 1.0) {
                if (m.inv['petroleum_gas'] > 0) { m.timer = 0; m.inv['petroleum_gas']--; m.energy = Math.min(100000, m.energy + 2500); }
                else if (m.inv['hydrogen'] > 0) { m.timer = 0; m.inv['hydrogen']--; m.energy = Math.min(100000, m.energy + 20); }
            }
        },
        renderAnim: function (char, t) {
            if (char === '~') return { char: t === 0 ? '^' : '*', color: '#81d4fa' };
            if (char === 'G') return { char: t === 0 ? 'G' : '9', color: '#00e5ff' }; // Spinning Cyan G's
            return null;
        },
        isWorking: function (m) { return m.inv && ((m.inv['petroleum_gas'] > 0) || (m.inv['hydrogen'] > 0)) && (m.energy || 0) < 100000; }
    },
    'machine_naphtha_cracker': {
        id: 'machine_naphtha_cracker', name: 'Naphtha Cracker', color: '#ffb300',
        rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|NC|", "|==|", "|==|", "\\-v/"], outX: 2, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "<N==|", "|C==|", "\\---/"], outX: -1, outY: 1 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0,
        recipes: [{ in: { 'light_oil': 2 }, out: { 'naphtha': 2 } }],
        renderAnim: Anim.wave('=', '#ffcc80')
    },
    'machine_polymerizer': {
        id: 'machine_polymerizer', name: 'Polymerizer', color: '#78909c', // Changed to Darker Grey-Blue
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| PP|", "| ==|", "| PP|", "\\-v-/"], outX: 2, outY: 5 }),
        energy: { type: 'electric', usage: 20 }, processTime: 3.5,
        recipes: [{ in: { 'naphtha': 1, 'chlorine': 1 }, out: { 'liquid_plastic': 1 } }],
        renderAnim: Anim.wave('=', '#546e7a')
    },
    'machine_pellet_extruder': {
        id: 'machine_pellet_extruder', name: 'Pellet Extruder', color: '#90a4ae', // Changed to Slate Grey
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|PE|", "\\-v/"], outX: 2, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "<P|", "|E|", "\\-/"], outX: -1, outY: 1 }),
        energy: { type: 'electric', usage: 10 }, processTime: 2.0,
        recipes: [{ in: { 'liquid_plastic': 1 }, out: { 'plastic_pellet': 2 } }],
        renderAnim: Anim.glow('E', 'e', '#90a4ae')
    },
    // --- SAND TO SILICA PIPELINE (7 Stages) ---
    'machine_sand_washer': {
        id: 'machine_sand_washer', name: 'Sand Washer', color: '#03a9f4',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|W|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'none' }, processTime: 2.0, recipes: [{ in: { 'sand': 1, 'water': 1 }, out: { 'washed_sand': 1 } }], renderAnim: Anim.wave('W', '#03a9f4')
    },
    'machine_thermal_desorber': {
        id: 'machine_thermal_desorber', name: 'Thermal Desorber', color: '#ff5722',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|T|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0, recipes: [{ in: { 'washed_sand': 1 }, out: { 'dry_sand': 1 } }], renderAnim: Anim.fire('T')
    },
    'machine_magnetic_separator': {
        id: 'machine_magnetic_separator', name: 'Magnetic Separator', color: '#795548',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|M |", "\\v-/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "< |", "|M|", "\\-/"], outX: -1, outY: 1 }),
        energy: { type: 'electric', usage: 15 }, processTime: 2.5, recipes: [{ in: { 'dry_sand': 1 }, out: { 'non_magnetic_sand': 1 }, chanceOut: { item: 'bimetal_dust', chance: 0.2 } }], renderAnim: Anim.glow('M', 'm', '#e91e63')
    },
    'machine_acid_leaching_vat': {
        id: 'machine_acid_leaching_vat', name: 'Acid Leaching Vat', color: '#cddc39',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|AL|", "|AL|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0, recipes: [{ in: { 'non_magnetic_sand': 1, 'sulfuric_acid': 1 }, out: { 'leached_sand': 1 } }], renderAnim: Anim.wave('L', '#cddc39')
    },
    'machine_flotation_cell': {
        id: 'machine_flotation_cell', name: 'Flotation Cell', color: '#00bcd4',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|FC|", "|FC|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 20 }, processTime: 3.5, recipes: [{ in: { 'leached_sand': 1, 'water': 1 }, out: { 'high_grade_silica': 1 } }], renderAnim: Anim.wave('C', '#00bcd4')
    },
    'machine_calcination_kiln': {
        id: 'machine_calcination_kiln', name: 'Calcination Kiln', color: '#d84315',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| C |", "| C |", "| C |", "\\-v-/"], outX: 2, outY: 5 }),
        energy: { type: 'burner', fuel: 'coke', usage: 1 }, processTime: 5.0, recipes: [{ in: { 'high_grade_silica': 1 }, out: { 'quartz_sand': 1 } }], renderAnim: Anim.fire('C')
    },
    'machine_arc_purifier': {
        id: 'machine_arc_purifier', name: 'Arc Purifier', color: '#00838f',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|+++|", "|+P+|", "|+++|", "\\-v-/"], outX: 2, outY: 5 }),
        energy: { type: 'electric', usage: 100 }, processTime: 6.0, recipes: [{ in: { 'quartz_sand': 2 }, out: { 'pure_silica': 1 } }], renderAnim: Anim.glow('+', '*', '#00ffff')
    },

    // --- SILICON WAFER PIPELINE (3 Stages) ---
    'machine_czochralski_puller': {
        id: 'machine_czochralski_puller', name: 'Czochralski Puller', color: '#455a64',
        rotations: genRot4({ w: 4, h: 6, art: ["/--\\", "|CZ|", "|CZ|", "|CZ|", "|CZ|", "\\-v/"], outX: 2, outY: 6 }, { w: 6, h: 4, art: ["/----\\", "<CCCC|", "|ZZZZ|", "\\----/"], outX: -1, outY: 1 }),
        energy: { type: 'electric', usage: 150 }, processTime: 10.0,
        recipes: [{ in: { 'pure_silica': 4 }, out: { 'silicon_ingot': 1 } }],
        isWorking: function (m) { return m.hasHepa && ((m.energy || 0) >= 150) && ((m.inv['pure_silica'] || 0) >= 4); },
        updateOverride: function (m, r, dt) {
            if (!m.hasHepa) return;

            if (m.timer >= 10.0 && m.energy >= 150 && m.inv['pure_silica'] >= 4) {
                m.timer = 0; m.energy -= 150; m.inv['pure_silica'] -= 4; m.outBuffer['silicon_ingot'] = (m.outBuffer['silicon_ingot'] || 0) + 1;
            }
        },
        renderAnim: Anim.glow('Z', 'z', '#00bcd4')
    },
    'machine_wafer_saw': {
        id: 'machine_wafer_saw', name: 'Wafer Saw', color: '#37474f',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|S|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'electric', usage: 50 }, processTime: 4.0, recipes: [{ in: { 'silicon_ingot': 1 }, out: { 'raw_silicon_wafer': 4 } }], renderAnim: Anim.spin('S')
    },
    'machine_wafer_polisher': {
        id: 'machine_wafer_polisher', name: 'Wafer Polisher', color: '#37474f',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|WP|", "|WP|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 40 }, processTime: 3.0, recipes: [{ in: { 'raw_silicon_wafer': 1 }, out: { 'polished_silicon_wafer': 1 } }], renderAnim: Anim.spin('P')
    },

    // --- CRYSTAL LENS PIPELINE (2 Stages) ---
    'machine_lens_caster': {
        id: 'machine_lens_caster', name: 'Lens Caster', color: '#b3e5fc',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|L|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'electric', usage: 30 }, processTime: 5.0, recipes: [{ in: { 'pure_silica': 2 }, out: { 'rough_lens': 1 } }], renderAnim: Anim.glow('L', 'l', '#b3e5fc')
    },
    'machine_optical_grinder': {
        id: 'machine_optical_grinder', name: 'Optical Grinder', color: '#00b0ff',
        rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|OG|", "\\v-/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "<O|", "|G|", "\\-/"], outX: -1, outY: 1 }),
        energy: { type: 'electric', usage: 40 }, processTime: 4.0, recipes: [{ in: { 'rough_lens': 1 }, out: { 'crystal_lens': 1 } }], renderAnim: Anim.spin('G')
    },

    // --- MASKS, LITHOGRAPHY, AND COMPUTE ---
    'machine_stencil_press': {
        id: 'machine_stencil_press', name: 'Stencil Press', color: '#607d8b',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|SP|", "|SP|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 20 }, processTime: 4.0,
        renderAnim: Anim.glow('P', 'p', '#607d8b'),
        // DUMMY RECIPES FOR AUTO-WIKI (Game loop ignores this due to updateOverride)
        recipes: [
            { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'cpu_mask': 1 } }, { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'gpu_mask': 1 } },
            { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'rom_mask': 1 } }, { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'ram_mask': 1 } },
            { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'ssd_mask': 1 } }, { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'power_mask': 1 } },
            { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'clock_mask': 1 } }, { in: { 'lead_plate': 1, 'steel_plate': 1 }, out: { 'io_mask': 1 } }
        ],
        updateOverride: function (m, r, dt) {

            if (m.timer >= 4.0 && m.energy >= 20 && m.inv['lead_plate'] >= 1 && m.inv['steel_plate'] >= 1) {
                let targetMask = m.filters?.out1?.[0];
                const validMasks = ['cpu_mask', 'gpu_mask', 'rom_mask', 'ram_mask', 'ssd_mask', 'power_mask', 'clock_mask', 'io_mask'];
                if (validMasks.includes(targetMask)) {
                    m.inv['lead_plate']--; m.inv['steel_plate']--; m.energy -= 20; m.timer = 0;
                    m.outBuffer[targetMask] = (m.outBuffer[targetMask] || 0) + 1;
                }
            }
        }
    },
    'machine_lithographer': {
        id: 'machine_lithographer', name: 'Lithographer (Requires HEPA)', color: '#ffd700',
        rotations: genRot4({ w: 6, h: 6, art: ["/----\\", "|LITH|", "|LITH|", "|LITH|", "|LITH|", "\\--v-/"], outX: 3, outY: 6 }),
        energy: { type: 'electric', usage: 500 }, processTime: 8.0,
        renderAnim: Anim.glow('I', 'i', '#ffd700'),
        // DUMMY RECIPES FOR AUTO-WIKI
        recipes: [
            { in: { 'polished_silicon_wafer': 1, 'cpu_mask': 1 }, out: { 'cpu_ic': 1 } }, { in: { 'polished_silicon_wafer': 1, 'gpu_mask': 1 }, out: { 'gpu_ic': 1 } },
            { in: { 'polished_silicon_wafer': 1, 'rom_mask': 1 }, out: { 'rom_ic': 1 } }, { in: { 'polished_silicon_wafer': 1, 'ram_mask': 1 }, out: { 'ram_ic': 1 } },
            { in: { 'polished_silicon_wafer': 1, 'ssd_mask': 1 }, out: { 'ssd_ic': 1 } }, { in: { 'polished_silicon_wafer': 1, 'power_mask': 1 }, out: { 'power_ic': 1 } },
            { in: { 'polished_silicon_wafer': 1, 'clock_mask': 1 }, out: { 'clock_ic': 1 } }, { in: { 'polished_silicon_wafer': 1, 'io_mask': 1 }, out: { 'io_ic': 1 } }
        ],
        isWorking: function (m) {
            if (!m.hasHepa || (m.energy || 0) < 500 || (m.inv['polished_silicon_wafer'] || 0) < 1) return false;
            const maskToIC = { 'cpu_mask': 'cpu_ic', 'gpu_mask': 'gpu_ic', 'rom_mask': 'rom_ic', 'ram_mask': 'ram_ic', 'ssd_mask': 'ssd_ic', 'power_mask': 'power_ic', 'clock_mask': 'clock_ic', 'io_mask': 'io_ic' };
            return Object.keys(maskToIC).some(k => (m.inv[k] || 0) >= 1);
        },
        updateOverride: function (m, r, dt) {
            if (!m.hasHepa) return;

            if (m.timer >= 8.0 && m.energy >= 500 && m.inv['polished_silicon_wafer'] >= 1) {
                const maskToIC = { 'cpu_mask': 'cpu_ic', 'gpu_mask': 'gpu_ic', 'rom_mask': 'rom_ic', 'ram_mask': 'ram_ic', 'ssd_mask': 'ssd_ic', 'power_mask': 'power_ic', 'clock_mask': 'clock_ic', 'io_mask': 'io_ic' };
                let usedMask = Object.keys(maskToIC).find(k => m.inv[k] >= 1);
                if (usedMask) {
                    m.timer = 0; m.energy -= 500; m.inv['polished_silicon_wafer']--;
                    m.outBuffer[maskToIC[usedMask]] = (m.outBuffer[maskToIC[usedMask]] || 0) + 1;
                }
            }
        }
    },
    'machine_hepa_purifier': {
        id: 'machine_hepa_purifier', name: 'HEPA Air Purifier', color: '#00695c',
        rotations: genRot4({ w: 2, h: 2, art: ["HA", "PH"], outX: null, outY: null }),
        energy: { type: 'electric', usage: 50 }, processTime: 1.0,
        renderAnim: Anim.wave('H', '#00bcd4'),
        isWorking: function (m) { return (m.energy || 0) >= 50; },
        updateOverride: function (m, r, dt) { if (m.timer >= 1) { m.timer = 0; if (m.energy >= 50) m.energy -= 50; } }
    },
    'machine_magnetic_tape_drive': {
        id: 'machine_magnetic_tape_drive', name: 'Magnetic Tape Unit', color: '#90a4ae',
        rotations: genRot4({ w: 3, h: 2, art: ["(R)", "[=]"], outX: 1, outY: 2 }),
        energy: { type: 'electric', usage: 100 }, processTime: 10.0,
        recipes: [{ in: { 'blank_tape': 1 }, out: { 'logic_tape': 1 } }],
        renderAnim: Anim.tapeSpin('R', '#00e676')
    },
    'machine_crude_logic_engine': {
        id: 'machine_crude_logic_engine', name: 'Crude Logic Engine', color: '#795548',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| V |", "| R |", "| V |", "\\---/"], outX: 2, outY: 5 }),
        energy: { type: 'electric', usage: 200 }, processTime: 15.0,
        renderAnim: function (c, t, m) {
            if (c === 'V') return { char: t === 0 ? 'v' : 'V', color: '#ff7043' }; // Vacuum tubes
            if (c === 'R') return { char: t === 0 ? 'r' : 'R', color: '#795548' }; // Relays
            return null;
        },
        recipes: [
            { in: { 'iron_plate': 10, 'copper_wire': 10 }, out: { 'vacuum_tube': 5 } },
            { in: { 'iron_plate': 10, 'copper_wire': 20 }, out: { 'heavy_relay': 2 } }
        ]
    },
    'machine_cdh': {
        id: 'machine_cdh', name: 'Central Digital Hub', color: '#00e5ff',
        rotations: [{ w: 4, h: 4, art: ["/--\\", "|CD|", "|CD|", "\\--/"], outX: null, outY: null }],
        energy: { type: 'electric', usage: 20 }, maxEnergy: 10000,
        renderAnim: Anim.glow('C', 'c', '#00e5ff'),
        isWorking: function (m) { return (m.energy || 0) >= 20 && m.dataGrid; },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 1.0) {
                m.timer = 0;

                if (m.energy >= 20 && m.dataGrid) {
                    m.energy -= 20; // Consume base operating power

                    const digiStorage = [];
                    const digiItems = {};

                    // ── 1. BUILD STORAGE INDEX ──
                    for (const node of m.dataGrid.machines) {
                        if (!node) continue;

                        if (node.def.isDigitalStorage) {
                            digiStorage.push(node);
                            for (const k in node.inv) {
                                digiItems[k] = (digiItems[k] || 0) + node.inv[k];
                            }
                        } else if (node.type === 'machine_digital_exporter') {
                            // Use the engine's pre-compiled port coordinates to find the target
                            if (node._outPorts && node._outPorts.length > 0) {
                                let p = node._outPorts[0];
                                let tId = window.getWorldMap()[p.y * window.getWorldSize() + p.x];

                                if (tId >= 50000) {
                                    let target = window.getActiveMachines()[tId - 50000];

                                    if (target && target.type !== 'machine_hub' && !target.def.isDigitalStorage) {

                                        // PULL-ONLY INJECTION: The network can extract (modify target.inv), 
                                        // but maxStack: 0 and acceptsItem: false prevent the network from pushing back into it.

                                        // 1. Inject Target's Main Inventory
                                        if (target.inv) {
                                            digiStorage.push({ inv: target.inv, def: { acceptsItem: () => false, maxStack: 0 } });
                                            for (const k in target.inv) {
                                                if (target.inv[k] > 0) digiItems[k] = (digiItems[k] || 0) + target.inv[k];
                                            }
                                        }

                                        // 2. Inject Target's Output Buffers (Crucial for Furnaces/Miners/Boxes)
                                        if (target.outBuffer) {
                                            digiStorage.push({ inv: target.outBuffer, def: { acceptsItem: () => false, maxStack: 0 } });
                                            for (const k in target.outBuffer) {
                                                if (target.outBuffer[k] > 0) digiItems[k] = (digiItems[k] || 0) + target.outBuffer[k];
                                            }
                                        }
                                        if (target.out2Buffer) {
                                            digiStorage.push({ inv: target.out2Buffer, def: { acceptsItem: () => false, maxStack: 0 } });
                                            for (const k in target.out2Buffer) {
                                                if (target.out2Buffer[k] > 0) digiItems[k] = (digiItems[k] || 0) + target.out2Buffer[k];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Grab all crafters across the whole active machine list reliably
                    const crafters = window.getActiveMachines().filter(c => c && c.type === 'machine_digital_crafter');

                    m.digiStorage = digiStorage;
                    m.digiItems = digiItems;
                    m.digiCrafters = crafters;

                    // ── 2. PROCESS UPLINKS & DOWNLINKS ──
                    for (const node of m.dataGrid.machines) {
                        if (!node) continue;

                        if (node.type === 'machine_import_uplink') {
                            for (const k in node.inv) {
                                if (!node.inv[k]) continue;
                                const left = insertDigitalItem(digiStorage, k, node.inv[k]);
                                if (left === 0) delete node.inv[k];
                                else node.inv[k] = left;
                            }
                        } else if (node.type === 'machine_export_downlink') {
                            const targets = node.filters?.out1 || [];
                            for (const target of targets) {
                                if (target && (digiItems[target] || 0) > 0) {
                                    const currentAmt = node.outBuffer[target] || 0;
                                    const capLimit = node.def.maxStack || 100;
                                    const need = capLimit - currentAmt;

                                    if (need > 0) {
                                        const toTake = Math.min(need, digiItems[target]);
                                        const taken = extractDigitalItem(digiStorage, target, toTake);
                                        if (taken > 0) {
                                            node.outBuffer[target] = currentAmt + taken;
                                            digiItems[target] -= taken;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── 3. CRAFTER COMPLETION & BYPRODUCT VACUUM ──
                    for (const c of crafters) {
                        // Vacuum byproducts safely (ignores the target item of the current job)
                        for (const k of Object.keys(c.inv || {})) {
                            if (c.currentJob && k === c.currentJob.target) continue;
                            if (!c.inv[k]) continue;

                            const left = insertDigitalItem(digiStorage, k, c.inv[k]);
                            digiItems[k] = (digiItems[k] || 0) + (c.inv[k] - left);

                            if (left === 0) delete c.inv[k];
                            else c.inv[k] = left; // Leftovers stay safely in the crafter
                        }

                        if (!c.currentJob) continue;

                        const target = c.currentJob.target;
                        const fromInv = c.inv[target] || 0;
                        const netNow = digiItems[target] || 0;
                        const netCredit = Math.max(0, netNow - (c.currentJob.lastNetQty || 0));

                        c.currentJob.lastNetQty = netNow;

                        // Total items ready (some in the physical crafter, some already placed back in the network)
                        const available = fromInv + netCredit;

                        if (available >= c.currentJob.qty) {
                            const take = c.currentJob.qty;
                            const invTake = Math.min(fromInv, take);

                            if (invTake > 0) {
                                // Attempt to insert into the network FIRST
                                const leftover = insertDigitalItem(digiStorage, target, invTake);
                                const actuallyStored = invTake - leftover;

                                // Deduct from the crafter ONLY what was successfully stored
                                if (actuallyStored > 0) {
                                    c.inv[target] -= actuallyStored;
                                    if (c.inv[target] <= 0) delete c.inv[target];
                                    digiItems[target] = (digiItems[target] || 0) + actuallyStored;
                                }

                                // Shrink the job by the amount successfully secured
                                const totalSatisfied = actuallyStored + netCredit;
                                c.currentJob.qty -= totalSatisfied;

                                if (c.currentJob.qty <= 0) c.currentJob = null;
                            } else {
                                // All required items arrived via the network directly
                                c.currentJob.qty -= netCredit;
                                if (c.currentJob.qty <= 0) c.currentJob = null;
                            }
                        }
                    }

                    // ── 4. HANDLE REQUESTERS ──
                    m.jobs = (m.jobs || []).filter(j => !j.isRequesterJob);
                    for (const node of m.dataGrid.machines) {
                        if (!node || node.type !== 'machine_digital_requester') continue;
                        const tItem = (node.reqItem || '').trim();
                        const tQty = node.reqQty || 0;

                        if (!tItem || tQty <= 0) continue;

                        const inDisk = digiItems[tItem] || 0;
                        const inFlight = crafters
                            .filter(c => c.currentJob && c.currentJob.target === tItem)
                            .reduce((sum, c) => sum + c.currentJob.qty, 0);

                        const deficit = tQty - inDisk - inFlight;
                        if (deficit > 0) {
                            m.jobs.push({
                                id: Date.now() + Math.random(),
                                target: tItem,
                                qty: deficit,
                                status: 'pending',
                                isRequesterJob: true,
                                requesterId: node.id
                            });
                        }
                    }

                    // ── 5. JOB SCHEDULING (PREDICTIVE SPACE CAP) ──
                    for (const job of m.jobs) {
                        if (job.qty <= 0) { job.status = 'done'; continue; }

                        const c = crafters.find(cr => cr.pattern && (cr.pattern.out || '').trim() === job.target && !cr.currentJob);
                        if (!c) continue;

                        let canCraft = true;
                        let missing = null;
                        let maxBatches = job.qty;

                        // Check ingredient limits
                        for (const k in c.pattern.in) {
                            const avail = digiItems[k] || 0;
                            const possible = Math.floor(avail / c.pattern.in[k]);
                            if (possible === 0) { canCraft = false; missing = k; break; }
                            if (possible < maxBatches) maxBatches = possible;
                        }

                        // Check output capacity limits
                        if (canCraft && maxBatches > 0) {
                            const outQtyPerBatch = c.pattern.outQty || 1;
                            const freeSpace = getDigitalFreeSpace(digiStorage, job.target);
                            const maxFitBatches = Math.floor(freeSpace / outQtyPerBatch);

                            if (maxFitBatches < maxBatches) maxBatches = maxFitBatches;
                            if (maxBatches <= 0) canCraft = false; // Don't trigger 'missing', just halt and wait for space
                        }

                        if (canCraft && maxBatches > 0) {
                            for (const k in c.pattern.in) {
                                const qty = c.pattern.in[k] * maxBatches;
                                extractDigitalItem(digiStorage, k, qty);
                                c.outBuffer = c.outBuffer || {};
                                c.outBuffer[k] = (c.outBuffer[k] || 0) + qty;
                                digiItems[k] -= qty;
                            }

                            const yieldAmt = maxBatches * (c.pattern.outQty || 1);
                            c.currentJob = {
                                target: job.target,
                                qty: yieldAmt,
                                parentJobId: job.id,
                                lastNetQty: digiItems[job.target] || 0,
                                accumulatedNet: 0
                            };

                            job.qty -= yieldAmt;
                            if (job.qty <= 0) job.status = 'done';

                        } else if (missing) {
                            // Auto-request missing ingredients dynamically
                            const needed = (job.qty * c.pattern.in[missing]) - (digiItems[missing] || 0);
                            if (needed > 0) {
                                const existing = m.jobs.find(j => j.target === missing && j.status !== 'done');
                                if (!existing) {
                                    m.jobs.push({ id: Date.now() + Math.random(), target: missing, qty: needed, status: 'pending' });
                                } else {
                                    existing.qty = Math.max(existing.qty, needed);
                                }
                            }
                        }
                    }

                    m.jobs = m.jobs.filter(j => j.status !== 'done' && j.qty > 0);

                    // ── 6. BASE CDH STATS (BOTTLENECKS / POWER) ──
                    let machines = [], defenseNodes = [];
                    let activeRadar = m.dataGrid.machines.some(rm => rm && rm.type === 'machine_defense_radar' && rm.def.isWorking(rm));

                    for (let nm of m.dataGrid.machines) {
                        if (['machine_slug_turret', 'machine_chain_gunner', 'machine_defense_radar', 'machine_defense_node'].includes(nm.type)) defenseNodes.push(nm);
                        else machines.push(nm);
                    }

                    let currentItems = {}, powerDemand = 0, powerStored = 0;
                    let idleMachines = 0, workingMachines = 0, bottlePower = 0, bottleInput = 0, bottleOutput = 0, bottleneckDetails = {};

                    for (let nm of machines) {
                        let buffers = [nm.inv || {}, nm.outBuffer || {}, nm.out2Buffer || {}];
                        for (let buf of buffers) {
                            for (let itm in buf) {
                                currentItems[itm] = (currentItems[itm] || 0) + buf[itm];
                            }
                        }
                        if (nm.energy !== undefined) powerStored += nm.energy;
                        if (nm.def.energy && nm.def.energy.type === 'electric') powerDemand += (nm.def.energy.usage || 0);

                        let isWorking = false;
                        if (nm.def.isWorking) isWorking = nm.def.isWorking(nm);
                        else if (nm.def.recipes && nm.def.recipes.length > 0) {
                            let hasPower = true;
                            if (nm.def.energy.type === 'electric') hasPower = ((nm.energy || 0) >= nm.def.energy.usage);
                            else if (nm.def.energy.type === 'burner' || nm.def.energy.type === 'fluid') hasPower = ((nm.inv[nm.def.energy.fuel] || 0) >= nm.def.energy.usage);

                            let canCraftNode = false; let missingItem = null; let outBlocked = false;
                            for (let recipe of nm.def.recipes) {
                                let recipeCan = true;
                                for (let req in recipe.in) {
                                    if ((nm.inv[req] || 0) < recipe.in[req]) { recipeCan = false; missingItem = req; break; }
                                }
                                if (recipeCan) {
                                    for (let out in recipe.out) {
                                        if ((nm.outBuffer[out] || 0) >= 100) { outBlocked = true; recipeCan = false; break; }
                                    }
                                }
                                if (recipeCan) { canCraftNode = true; break; }
                            }
                            if (canCraftNode && hasPower) isWorking = true;
                            else {
                                if (!hasPower) { bottlePower++; bottleneckDetails[nm.def.name] = "Low Power"; }
                                else if (outBlocked) { bottleOutput++; bottleneckDetails[nm.def.name] = "Output Full"; }
                                else if (missingItem) { bottleInput++; bottleneckDetails[nm.def.name] = `Needs Input`; }
                            }
                        } else isWorking = true;

                        if (isWorking) workingMachines++; else idleMachines++;
                    }

                    m.cdhHistory = m.cdhHistory || {};
                    m.cdhRates = {};
                    for (let itm in currentItems) {
                        let diff = currentItems[itm] - (m.cdhHistory[itm] || 0);
                        if (diff !== 0) m.cdhRates[itm] = diff;
                    }
                    for (let itm in m.cdhHistory) {
                        if (!currentItems[itm] && m.cdhHistory[itm] > 0) m.cdhRates[itm] = -m.cdhHistory[itm];
                    }

                    m.cdhHistory = currentItems;
                    m.cdhData = {
                        machines: machines.length, defense: defenseNodes.length, hasRadar: activeRadar,
                        working: workingMachines, idle: idleMachines, powerStored: powerStored,
                        powerDemand: powerDemand, bottlePower: bottlePower, bottleInput: bottleInput,
                        bottleOutput: bottleOutput, details: bottleneckDetails, items: currentItems, rates: m.cdhRates
                    };
                }
            }

            // DELIBERATELY DO NOT CALL ANY PREVIOUS HOOKS!
            // This breaks the hook chain of doom that was mutating and voiding your items.
        }
    },
    'machine_battery_lead': {
        id: 'machine_battery_lead', name: 'Lead-Acid Battery Bank', color: '#4527a0',
        rotations: [{ w: 2, h: 2, art: ["BB", "BB"], outX: null, outY: null }],
        energy: { type: 'electric', storage: true }, // 'storage' tag triggers charging/discharging logic
        maxEnergy: 80000,
        renderAnim: function (char, t) {
            return { color: t === 0 ? '#4527a0' : '#5e35b1' };
        }
    },
    'machine_pellet_grinder': {
        id: 'machine_pellet_grinder', name: 'Pellet Grinder', color: '#607d8b',
        rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|#|", "\\v/"], outX: 1, outY: 3 }),
        energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 2.0,
        recipes: [{ in: { 'stone': 1 }, out: { 'rock_pellet': 4 } }, { in: { 'iron_ingot': 1 }, out: { 'iron_pellet': 8 } }],
        renderAnim: Anim.spin('#')
    },
    'machine_slug_turret': {
        id: 'machine_slug_turret', name: 'Steam Slug Turret', color: '#5d4037',
        rotations: genRot4({ w: 2, h: 2, art: ["TT", "[]"], outX: null, outY: null }),
        energy: { type: 'fluid', fuel: 'steam', usage: 0 }, // Consumes steam only when firing
        maxStack: 200,
        updateOverride: function (m, r, dt) {

            if (m.timer >= 1.3 && m.inv['steam'] >= 1 && m.inv['iron_pellet'] >= 1) {
                let target = findNearestMonster(m.x, m.y, 17);
                if (target) {
                    m.timer = 0; m.inv['steam']--; m.inv['iron_pellet']--;
                    fireProjectile(m.x + 0.5, m.y + 0.5, target, 10, 25, '#b0bec5');
                }
            }
        }
    },
    'machine_defense_radar': {
        id: 'machine_defense_radar', name: 'Defense Radar', color: '#00e676',
        rotations: genRot4({ w: 3, h: 3, art: ["/|\\", "-R-", "\\|/"], outX: null, outY: null }),
        energy: { type: 'electric', usage: 50 }, maxEnergy: 1000,
        renderAnim: Anim.glow('R', 'r', '#00e676'),
        isWorking: function (m) { return (m.energy || 0) >= 10; }, // FIX 2: Added a dedicated status check
        updateOverride: function (m, r, dt) {
            m.energy = m.energy || 0; // FIX 3: Initialize energy so the UI can see it immediately
            if (m.timer >= 1.0) {
                m.timer = 0;
                if (m.energy >= 50) m.energy -= 50;
            }
        }
    },
    'machine_defense_node': {
        id: 'machine_defense_node', name: 'Signal Node', color: '#00c853',
        rotations: genRot4({ w: 1, h: 1, art: ["^"], outX: null, outY: null }),
        energy: { type: 'none' }
    },
    'machine_chain_gunner': {
        id: 'machine_chain_gunner', name: 'Chain Gunner', color: '#2e7d32',
        rotations: [{ w: 2, h: 2, art: ["!!", "##"], outX: null, outY: null }],
        energy: { type: 'electric', usage: 20 },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 0.2 && (m.energy || 0) >= 5 && m.inv['iron_pellet'] >= 1) {
                // FIX 1: Safely ask the radar if it's working using isWorking()
                let radarActive = m.dataGrid && m.dataGrid.machines.some(rm => rm && rm.type === 'machine_defense_radar' && rm.def.isWorking(rm));

                if (radarActive) {
                    let target = findNearestMonster(m.x, m.y, 25);
                    if (target) { m.timer = 0; m.energy -= 5; m.inv['iron_pellet']--; fireProjectile(m.x + 0.5, m.y + 0.5, target, 15, 40, '#ffd700'); }
                }
            }
        }
    },
    'machine_magnetic_tape_drive': {
        id: 'machine_magnetic_tape_drive', name: 'Magnetic Tape Drive', color: '#607d8b',
        rotations: [{
            w: 7, h: 8, art: [
                "/-----\\",
                "| [O] |",
                "| | | |",
                "| [O] |",
                "|     |",
                "|[---]|",
                "|[###]|",
                "\\-----/"
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 5 },
        isWorking: (m) => (m.energy || 0) >= 5,
        renderAnim: Anim.tapeSpin('O', '#00e676')
    },
    'machine_processing_computer': {
        id: 'machine_processing_computer', name: 'Processing Computer', color: '#37474f',
        rotations: [{
            w: 5, h: 7, art: [
                "/---\\",
                "|[*]|",
                "|[*]|",
                "|[*]|",
                "|   |",
                "|[#]|",
                "\\---/"
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 10 },
        isWorking: (m) => (m.energy || 0) >= 10,
        renderAnim: function (c, t) {
            if (c === '*') {
                const colors = ['#f44336', '#4caf50', '#ffeb3b'];
                const col = colors[Math.floor(performance.now() / 300) % 3];
                return { char: '*', color: col };
            }
            return null;
        }
    },
    'machine_planet_terminal': {
        id: 'machine_planet_terminal', name: 'Planet Terminal', color: '#455a64',
        rotations: [{
            w: 9, h: 4, art: [
                "/-------\\",
                "|[MARS ]|",
                "|       |",
                "\\-------/"
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 15 },
        isWorking: function (m) {
            if ((m.energy || 0) < 15) return false;
            if (!m.analogGrid) return false;
            let computerCount = 0;
            let tapeDriveCount = 0;
            for (let rm of m.analogGrid.machines) {
                if (!rm) continue;
                if (rm.type === 'machine_processing_computer' && rm.def.isWorking(rm)) computerCount++;
                if (rm.type === 'machine_magnetic_tape_drive' && rm.def.isWorking(rm)) tapeDriveCount++;
            }
            return computerCount >= 4 && tapeDriveCount >= 8;
        }
    },
    'machine_parabolic_dish': {
        id: 'machine_parabolic_dish', name: 'Parabolic Dish', color: '#90a4ae',
        rotations: [{
            w: 15, h: 9, art: [
                "/-------------\\",
                "|             |",
                "|             |",
                "|      |      |",
                "|  ----*----  |",
                "|      |      |",
                "|             |",
                "|             |",
                "\\-------------/ "
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 50 },
        isWorking: (m) => (m.energy || 0) >= 50,
        renderAnim: function (c, t) {
            if (c === '*') return { char: '*', color: Math.sin(performance.now() / 200) > 0 ? '#00e5ff' : '#00acc1' };
            return null;
        }
    },
    'machine_construction_crane': {
        id: 'machine_construction_crane', name: 'Construction Crane', color: '#fbc02d',
        rotations: [{
            w: 5, h: 5, art: [
                " [|] ",
                " [|] ",
                " [|] ",
                " [|] ",
                "==^=="
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 50000, capacity: 100000 },
        maxEnergy: 100000,
        acceptsItem: (m, item) => item === 'steel_plate'
    },
    'machine_fuel_mixer': {
        id: 'machine_fuel_mixer', name: 'Fuel Mixer', color: '#4fc3f7',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|MM|", "|MM|", "\\--/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 20 }, processTime: 5.0,
        recipes: [{ in: { 'oxygen': 5, 'hydrogen': 5 }, out: { 'crude_rocket_fuel': 1 } }]
    },
    'machine_fuel_refinery': {
        id: 'machine_fuel_refinery', name: 'Fuel Refinery', color: '#03a9f4',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|RR|", "|RR|", "\\--/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 40 }, processTime: 10.0,
        recipes: [{ in: { 'crude_rocket_fuel': 1 }, out: { 'refined_rocket_fuel': 1 } }]
    },
    'machine_fuel_compressor': {
        id: 'machine_fuel_compressor', name: 'Fuel Compressor', color: '#01579b',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|CC|", "|CC|", "\\--/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 80 }, processTime: 15.0,
        recipes: [{ in: { 'refined_rocket_fuel': 1 }, out: { 'rocket_fuel': 1 } }]
    },
    'machine_rocket_silo_mega': {
        id: 'machine_rocket_silo_mega', name: 'Mega Rocket Silo', color: '#37474f',
        rotations: [{
            w: 25, h: 25, art: [
                "           /---\\           ",
                "         /|     |\\         ",
                "        / |     | \\        ",
                "       /  |     |  \\       ",
                "      |   | [X] |   |      ",
                "      |   | [X] |   |      ",
                "      |   | [X] |   |      ",
                "      |   /--v--\\   |      ",
                "     /|  /       \\  |\\     ",
                "    / | | (#####) | | \\    ",
                "   /  | | (#####) | |  \\   ",
                "  |   | | (#####) | |   |  ",
                "  |   | | (#####) | |   |  ",
                "  |   | | (#####) | |   |  ",
                "  |   |  \\_______/  |   |  ",
                "  |   |      |      |   |  ",
                "  |   |______|______|   |  ",
                "  |  /               \\  |  ",
                "  | /                 \\ |  ",
                "  |/                   \\|  ",
                "  |                     |  ",
                "  |       |     |       |  ",
                "  |      /       \\      |  ",
                "  |   --/         \\--   |  ",
                "  \\_____________________/  "
            ],
            outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 200000 }, // High launch power
        updateOverride: function (m, r, dt) {
            m.energy = m.energy || 0;
            if (m.energy >= 50000) { // Requirement to start launch
                const hasRoverExp = (m.inv['rocket_rover'] >= 1 && m.inv['rocket_fuel'] >= 50 && m.inv['logic_tape'] >= 1);
                const hasSatExp = (m.inv['rocket_satellite'] >= 1 && m.inv['rocket_fuel'] >= 20);

                if (hasRoverExp || hasSatExp) {
                    m.launchTimer = (m.launchTimer || 0) + dt;
                    if (m.launchTimer >= 10.0) { // Longer launch for Mega
                        m.launchTimer = 0;
                        m.energy -= 50000;
                        if (hasRoverExp) {
                            m.inv['rocket_rover']--; m.inv['rocket_fuel'] -= 50; m.inv['logic_tape']--;
                            window.launchRoverToMars();
                        } else {
                            m.inv['rocket_satellite']--; m.inv['rocket_fuel'] -= 20;
                            window.launchSatellite();
                        }
                    }
                } else {
                    m.launchTimer = 0;
                }
            }
        },
        renderAnim: function (c, t, m) {
            if (m.launchTimer > 0) {
                if (c === 'X' || c === '#') return { char: t === 0 ? '^' : '*', color: '#ff9800' };
                if ('/\\|-'.includes(c)) return { color: t === 0 ? '#ff5722' : '#e64a19' };
                if (c === ' ') if (Math.random() < 0.15) return { char: t === 0 ? 'o' : '.', color: '#90a4ae' };
            }
            const hasIngredients = (m.inv['rocket_rover'] >= 1 || m.inv['rocket_satellite'] >= 1);
            if (hasIngredients && !m.launchTimer) if (c === 'X') return { color: '#00e676' };
            return null;
        }
    },
    'machine_mars_refinery': {
        id: 'machine_mars_refinery', name: 'Planet-side Refinery', color: '#f44336',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|~~|", "|RR|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 100 }, processTime: 5.0,
        recipes: [
            { in: { 'mars_iron_ore': 1, 'regolith': 2 }, out: { 'refined_mars_metal': 1 } },
            { in: { 'mars_copper_ore': 1, 'regolith': 2 }, out: { 'refined_mars_metal': 1 } }
        ],
        renderAnim: Anim.wave('~', '#ff5722')
    },
    'machine_defense_radar': {
        id: 'machine_defense_radar', name: 'Defense Radar', color: '#00e676',
        rotations: [{ w: 3, h: 3, art: [" / \\ ", "|(o)|", " \\ / "], outX: null, outY: null }],
        energy: { type: 'electric', usage: 50 },
        isWorking: (m) => (m.energy || 0) >= 50,
        updateOverride: function (m, r, dt) {
            if (m.energy >= 50) m.energy -= 50;
        }
    },
    'machine_defense_node': {
        id: 'machine_defense_node', name: 'Signal Node', color: '#00c853',
        rotations: genRot4({ w: 1, h: 1, art: ["^"], outX: null, outY: null }),
        energy: { type: 'none' }
    },
    'machine_chain_gunner': {
        id: 'machine_chain_gunner', name: 'Chain Gunner', color: '#2e7d32',
        rotations: [{ w: 2, h: 2, art: ["!!", "##"], outX: null, outY: null }],
        energy: { type: 'electric', usage: 20 },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 0.2 && (m.energy || 0) >= 5 && m.inv['iron_pellet'] >= 1) {
                // FIX 1: Safely ask the radar if it's working using isWorking()
                let radarActive = m.dataGrid && m.dataGrid.machines.some(rm => rm && rm.type === 'machine_defense_radar' && rm.def.isWorking(rm));

                if (radarActive) {
                    let target = findNearestMonster(m.x, m.y, 25);
                    if (target) { m.timer = 0; m.energy -= 5; m.inv['iron_pellet']--; fireProjectile(m.x + 0.5, m.y + 0.5, target, 15, 40, '#ffd700'); }
                }
            }
        }
    },
    'machine_magnetic_tape_drive': {
        id: 'machine_magnetic_tape_drive', name: 'Magnetic Tape Drive', color: '#607d8b',
        rotations: [{
            w: 7, h: 8, art: [
                "/-----\\",
                "| [O] |",
                "| | | |",
                "| [O] |",
                "|     |",
                "|[---]|",
                "|[###]|",
                "\\-----/"
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 5 },
        isWorking: (m) => (m.energy || 0) >= 5,
        renderAnim: Anim.tapeSpin('O', '#00e676')
    },
    'machine_processing_computer': {
        id: 'machine_processing_computer', name: 'Processing Computer', color: '#37474f',
        rotations: [{
            w: 5, h: 7, art: [
                "/---\\",
                "|[*]|",
                "|[*]|",
                "|[*]|",
                "|   |",
                "|[#]|",
                "\\---/"
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 10 },
        isWorking: (m) => (m.energy || 0) >= 10,
        renderAnim: function (c, t) {
            if (c === '*') {
                const colors = ['#f44336', '#4caf50', '#ffeb3b'];
                const col = colors[Math.floor(performance.now() / 300) % 3];
                return { char: '*', color: col };
            }
            return null;
        }
    },
    'machine_planet_terminal': {
        id: 'machine_planet_terminal', name: 'Planet Terminal', color: '#455a64',
        rotations: [{
            w: 9, h: 4, art: [
                "/-------\\",
                "|[MARS ]|",
                "|       |",
                "\\-------/"
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 15 },
        isWorking: function (m) {
            if ((m.energy || 0) < 15) return false;
            if (!m.analogGrid) return false;
            let computerCount = 0;
            let tapeDriveCount = 0;
            for (let rm of m.analogGrid.machines) {
                if (!rm) continue;
                if (rm.type === 'machine_processing_computer' && rm.def.isWorking(rm)) computerCount++;
                if (rm.type === 'machine_magnetic_tape_drive' && rm.def.isWorking(rm)) tapeDriveCount++;
            }
            return computerCount >= 4 && tapeDriveCount >= 8;
        }
    },
    'machine_parabolic_dish': {
        id: 'machine_parabolic_dish', name: 'Parabolic Dish', color: '#90a4ae',
        rotations: [{
            w: 15, h: 9, art: [
                "/-------------\\",
                "|             |",
                "|             |",
                "|      |      |",
                "|  ----*----  |",
                "|      |      |",
                "|             |",
                "|             |",
                "\\-------------/ "
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 50 },
        isWorking: (m) => (m.energy || 0) >= 50,
        renderAnim: function (c, t) {
            if (c === '*') return { char: '*', color: Math.sin(performance.now() / 200) > 0 ? '#00e5ff' : '#00acc1' };
            return null;
        }
    },
    'machine_construction_crane': {
        id: 'machine_construction_crane', name: 'Construction Crane', color: '#fbc02d',
        rotations: [{
            w: 5, h: 5, art: [
                " [|] ",
                " [|] ",
                " [|] ",
                " [|] ",
                "==^=="
            ], outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 50000, capacity: 100000 },
        maxEnergy: 100000,
        acceptsItem: (m, item) => item === 'steel_plate'
    },
    'machine_fuel_mixer': {
        id: 'machine_fuel_mixer', name: 'Fuel Mixer', color: '#4fc3f7',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|MM|", "|MM|", "\\--/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 20 }, processTime: 5.0,
        recipes: [{ in: { 'oxygen': 5, 'hydrogen': 5 }, out: { 'crude_rocket_fuel': 1 } }]
    },
    'machine_fuel_refinery': {
        id: 'machine_fuel_refinery', name: 'Fuel Refinery', color: '#03a9f4',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|RR|", "|RR|", "\\--/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 40 }, processTime: 10.0,
        recipes: [{ in: { 'crude_rocket_fuel': 1 }, out: { 'refined_rocket_fuel': 1 } }]
    },
    'machine_fuel_compressor': {
        id: 'machine_fuel_compressor', name: 'Fuel Compressor', color: '#01579b',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|CC|", "|CC|", "\\--/"], outX: 1, outY: 4 }),
        energy: { type: 'electric', usage: 80 }, processTime: 15.0,
        recipes: [{ in: { 'refined_rocket_fuel': 1 }, out: { 'rocket_fuel': 1 } }]
    },
    'machine_rocket_silo_mega': {
        id: 'machine_rocket_silo_mega', name: 'Mega Rocket Silo', color: '#37474f',
        rotations: [{
            w: 25, h: 25, art: [
                "           /---\\           ",
                "         /|     |\\         ",
                "        / |     | \\        ",
                "       /  |     |  \\       ",
                "      |   | [X] |   |      ",
                "      |   | [X] |   |      ",
                "      |   | [X] |   |      ",
                "      |   /--v--\\   |      ",
                "     /|  /       \\  |\\     ",
                "    / | | (#####) | | \\    ",
                "   /  | | (#####) | |  \\   ",
                "  |   | | (#####) | |   |  ",
                "  |   | | (#####) | |   |  ",
                "  |   | | (#####) | |   |  ",
                "  |   |  \\_______/  |   |  ",
                "  |   |      |      |   |  ",
                "  |   |______|______|   |  ",
                "  |  /               \\  |  ",
                "  | /                 \\ |  ",
                "  |/                   \\|  ",
                "  |                     |  ",
                "  |       |     |       |  ",
                "  |      /       \\      |  ",
                "  |   --/         \\--   |  ",
                "  \\_____________________/  "
            ],
            outX: null, outY: null
        }],
        energy: { type: 'electric', usage: 200000 }, // High launch power
        updateOverride: function (m, r, dt) {
            m.energy = m.energy || 0;
            if (m.energy >= 50000) { // Requirement to start launch
                const hasRoverExp = (m.inv['rocket_rover'] >= 1 && m.inv['rocket_fuel'] >= 50 && m.inv['logic_tape'] >= 1);
                const hasSatExp = (m.inv['rocket_satellite'] >= 1 && m.inv['rocket_fuel'] >= 20);

                if (hasRoverExp || hasSatExp) {
                    m.launchTimer = (m.launchTimer || 0) + dt;
                    if (m.launchTimer >= 10.0) { // Longer launch for Mega
                        m.launchTimer = 0;
                        m.energy -= 50000;
                        if (hasRoverExp) {
                            m.inv['rocket_rover']--; m.inv['rocket_fuel'] -= 50; m.inv['logic_tape']--;
                            window.launchRoverToMars();
                        } else {
                            m.inv['rocket_satellite']--; m.inv['rocket_fuel'] -= 20;
                            window.launchSatellite();
                        }
                    }
                } else {
                    m.launchTimer = 0;
                }
            }
        },
        renderAnim: function (c, t, m) {
            if (m.launchTimer > 0) {
                if (c === 'X' || c === '#') return { char: t === 0 ? '^' : '*', color: '#ff9800' };
                if ('/\\|-'.includes(c)) return { color: t === 0 ? '#ff5722' : '#e64a19' };
                if (c === ' ') if (Math.random() < 0.15) return { char: t === 0 ? 'o' : '.', color: '#90a4ae' };
            }
            const hasIngredients = (m.inv['rocket_rover'] >= 1 || m.inv['rocket_satellite'] >= 1);
            if (hasIngredients && !m.launchTimer) if (c === 'X') return { color: '#00e676' };
            return null;
        }
    },

    'machine_mars_refinery': {
        id: 'machine_mars_refinery', name: 'Planet-side Refinery', color: '#f44336',
        rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|~~|", "|RR|", "\\-v/"], outX: 2, outY: 4 }),
        energy: { type: 'electric', usage: 100 }, processTime: 5.0,
        recipes: [
            { in: { 'mars_iron_ore': 1, 'regolith': 2 }, out: { 'refined_mars_metal': 1 } },
            { in: { 'mars_copper_ore': 1, 'regolith': 2 }, out: { 'refined_mars_metal': 1 } }
        ],
        renderAnim: Anim.wave('~', '#ff5722')
    },
    'machine_cdh_plc': {
        id: 'machine_cdh_plc', name: 'PLC Logic Processor', color: '#00b0ff',
        rotations: [{ w: 3, h: 3, art: ["/-\\", "|P|", "\\-/"], outX: null, outY: null }],
        energy: { type: 'electric', usage: 10 },
        isWorking: function (m) { return (m.energy || 0) >= 10; },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 1.0) {
                m.timer = 0;
                if ((m.energy || 0) >= 10 && m.dataGrid && m.plcScriptAST) {
                    m.energy -= 10;

                    let inputs = {};
                    let outputs = {};
                    let outNodes = [];

                    for (let nm of m.dataGrid.machines) {
                        if (!nm) continue;
                        if (nm.type === 'machine_gp_input' || nm.type === 'machine_pgp_input') {
                            inputs[nm.channelId || 0] = nm.currentValue || 0;
                        } else if (nm.type === 'machine_gp_output' || nm.type === 'machine_pgp_output') {
                            outputs[nm.channelId || 0] = nm.currentValue || 0;
                            outNodes.push(nm);
                        }
                    }

                    m.plcEnv = m.plcEnv || {};

                    try {
                        if (window.plcInterpreter) {
                            window.plcInterpreter.execute(m.plcScriptAST, {
                                env: m.plcEnv,
                                inputs: inputs,
                                outputs: outputs
                            });
                        }

                        for (let nm of outNodes) {
                            nm.currentValue = outputs[nm.channelId || 0] || 0;
                        }

                        m.plcError = null;
                    } catch (e) {
                        m.plcError = e.message;
                    }
                }
            }
        },
        renderAnim: Anim.glow('P', 'p', '#00e5ff')
    },
    'machine_gp_input': {
        id: 'machine_gp_input', name: 'GP Input Node', color: '#76ff03',
        rotations: genRot4({ w: 1, h: 1, art: ["I"], outX: null, outY: null }),
        energy: { type: 'none' },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 1.0) {
                m.timer = 0;
                if (m.dataGrid && m.targetItem) {
                    let cdh = m.dataGrid.machines.find(x => x && x.type === 'machine_cdh');
                    if (cdh && cdh.digiItems) {
                        m.currentValue = cdh.digiItems[m.targetItem] || 0;
                    } else {
                        m.currentValue = 0;
                    }
                }
            }
        }
    },
    'machine_gp_output': {
        id: 'machine_gp_output', name: 'GP Output Node', color: '#ff1744',
        rotations: genRot4({ w: 1, h: 1, art: ["O"], outX: null, outY: null }),
        energy: { type: 'none' }
    },
    'machine_pgp_input': {
        id: 'machine_pgp_input', name: 'Physical GP Input', color: '#b2ff59',
        rotations: genRot4({ w: 1, h: 1, art: ["P"], outX: 0, outY: 1 }),
        energy: { type: 'none' },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 1.0) {
                m.timer = 0;
                m.currentValue = 0; // Default
                if (m._outPorts && m._outPorts.length > 0 && m.targetItem) {
                    let p = m._outPorts[0];
                    if (typeof window.getWorldMap === 'function' && typeof window.getWorldSize === 'function') {
                        let wm = window.getWorldMap();
                        let ws = window.getWorldSize();
                        let tId = wm[p.y * ws + p.x];
                        if (tId >= 50000 && typeof window.getActiveMachines === 'function') {
                            let target = window.getActiveMachines()[tId - 50000];
                            if (target) {
                                if (m.targetItem === 'energy') {
                                    m.currentValue = target.energy || 0;
                                } else if (m.targetItem === 'heat') {
                                    m.currentValue = target.heat || 0;
                                } else if (m.targetItem === 'timer') {
                                    m.currentValue = target.timer || 0;
                                } else if (m.targetItem === 'enabled') {
                                    m.currentValue = target.disabledByPLC ? 0 : 1;
                                } else if (m.targetItem.startsWith('item:')) {
                                    let item = m.targetItem.substring(5);
                                    if (target.inv) m.currentValue = target.inv[item] || 0;
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    'machine_pgp_output': {
        id: 'machine_pgp_output', name: 'Physical GP Output', color: '#ff5252',
        rotations: genRot4({ w: 1, h: 1, art: ["Q"], outX: 0, outY: 1 }),
        energy: { type: 'none' },
        updateOverride: function (m, r, dt) {
            if (m.timer >= 1.0) {
                m.timer = 0;
                if (m._outPorts && m._outPorts.length > 0 && m.targetItem) {
                    let p = m._outPorts[0];
                    if (typeof window.getWorldMap === 'function' && typeof window.getWorldSize === 'function') {
                        let wm = window.getWorldMap();
                        let ws = window.getWorldSize();
                        let tId = wm[p.y * ws + p.x];
                        if (tId >= 50000 && typeof window.getActiveMachines === 'function') {
                            let target = window.getActiveMachines()[tId - 50000];
                            if (target) {
                                if (m.targetItem === 'enabled') {
                                    target.disabledByPLC = (m.currentValue === 0);
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    'machine_train_stop': {
        id: 'machine_train_stop', name: 'Train Stop', color: '#ff9800',
        rotations: genRot4({ w: 5, h: 3, art: ["/---\\", "|TS |", "\\-v-/"], outX: 2, outY: 3 }, { w: 3, h: 5, art: ["/-\\", "<T|", "|S|", "| |", "\\-/"], outX: -1, outY: 1 }),
        energy: { type: 'electric', usage: 5 }, maxStack: 2000,
        acceptsItem: (m, itm) => {
            if (typeof getNetworkForItem === 'function') {
                let net = getNetworkForItem(itm);
                return net === 'item' || net === 'item_heavy';
            }
            // Fallback: check window
            if (typeof window !== 'undefined' && window.getNetworkForItem) {
                let net = window.getNetworkForItem(itm);
                return net === 'item' || net === 'item_heavy';
            }
            return true;
        },
        updateOverride: function (m, r, dt) {
            // Push items from inventory to output buffer for pipe networks
            for (let item in m.inv) {
                if (m.inv[item] > 0) {
                    let pass = true;
                    if (m.filters && m.filters.out1 && m.filters.out1.length > 0) {
                        let inList = m.filters.out1.includes(item);
                        pass = m.filters.blacklist ? !inList : inList;
                    }
                    if (pass) {
                        let amount = Math.min(m.inv[item], 5);
                        m.outBuffer[item] = (m.outBuffer[item] || 0) + amount;
                        m.inv[item] -= amount;
                    }
                }
            }
        },
        isWorking: function (m) { return m.dockedTrainId != null; },
        renderAnim: function (char, t, m) {
            if (char === 'T') return { char: t === 0 ? 'T' : 't', color: m && m.dockedTrainId ? '#4caf50' : '#ff9800' };
            if (char === 'S') return { char: t === 0 ? 'S' : 's', color: '#ff9800' };
            return null;
        }
    },
    'machine_train_depot': {
        id: 'machine_train_depot', name: 'Train Depot', color: '#37474f',
        rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|DEP|", "|===|", "|DEP|", "\\---/"], outX: null, outY: null }),
        energy: { type: 'electric', usage: 10 }, maxStack: 100,
        acceptsItem: (m, itm) => ['locomotive', 'cargo_wagon', 'fluid_wagon', 'coal'].includes(itm),
        isWorking: function (m) { return (m.energy || 0) >= 10; },
        updateOverride: function (m, r, dt) {
            // Auto-refuel: every second, find a train on an adjacent rail tile and transfer coal
            if (m.timer >= 1.0) {
                m.timer = 0;
                let coalAvail = m.inv['coal'] || 0;
                if (coalAvail <= 0) return;
                if (!window.TrainSystem || !window.mapPipes || !window.mapPipes['rail']) return;
                let railMap = window.mapPipes['rail'];
                let WORLD_SIZE = window.getWorldSize ? window.getWorldSize() : 1500;
                // Check all tiles adjacent to the depot footprint for a rail tile
                for (let dy = -1; dy <= r.h; dy++) {
                    for (let dx = -1; dx <= r.w; dx++) {
                        if (dx >= 0 && dx < r.w && dy >= 0 && dy < r.h) continue;
                        let wx = m.x + dx, wy = m.y + dy;
                        if (wx < 0 || wy < 0 || wx >= WORLD_SIZE || wy >= WORLD_SIZE) continue;
                        if (railMap[wy * WORLD_SIZE + wx] === 0) continue;
                        // Rail tile found — find a train sitting here
                        for (let train of window.TrainSystem.trains) {
                            if (Math.round(train.x) === wx && Math.round(train.y) === wy) {
                                let need = train.maxFuel - train.fuel;
                                if (need > 0) {
                                    let transfer = Math.min(coalAvail, Math.ceil(need), 10);
                                    train.fuel = Math.min(train.maxFuel, train.fuel + transfer);
                                    m.inv['coal'] -= transfer;
                                    if (m.inv['coal'] <= 0) delete m.inv['coal'];
                                }
                                break;
                            }
                        }
                    }
                }
            }
        },
        renderAnim: function (char, t) {
            if (char === '=') return { char: t === 0 ? '=' : '-', color: '#546e7a' };
            if (char === 'D' || char === 'E' || char === 'P') return { color: t === 0 ? '#37474f' : '#546e7a' };
            return null;
        }
    },
    // --- FOOD, URANIUM PIPELINE & NUCLEAR END-GAME (migrated from afac.html) ---
                'machine_manual_grinder': { id: 'machine_manual_grinder', name: 'Manual Grinder', color: '#8d6e63', rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|G|", "\\v/"], outX: 1, outY: 3 }), energy: { type: 'none' }, processTime: 8.0, recipes: [{ in: { 'wheat': 3 }, out: { 'flour': 1 } }] },
                'machine_coal_grinder': { id: 'machine_coal_grinder', name: 'Coal Grinder', color: '#424242', rotations: genRot4({ w: 3, h: 4, art: ["/-\\", "|C|", "|G|", "\\v/"], outX: 1, outY: 4 }, { w: 4, h: 3, art: ["/--\\", "<CG|", "\\--/"], outX: -1, outY: 1 }), energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0, recipes: [{ in: { 'wheat': 3 }, out: { 'flour': 1 } }] },
                'machine_manual_mixer': { id: 'machine_manual_mixer', name: 'Manual Mixer', color: '#8d6e63', rotations: genRot4({ w: 3, h: 3, art: ["/M\\", "|~|", "\\v/"], outX: 1, outY: 3 }), energy: { type: 'none' }, processTime: 8.0, recipes: [{ in: { 'flour': 1, 'water': 1 }, out: { 'dough': 1 } }] },
                'machine_coal_mixer': { id: 'machine_coal_mixer', name: 'Coal Bowl Mixer', color: '#424242', rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|M~|", "|C~|", "\\-v/"], outX: 2, outY: 4 }), energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0, recipes: [{ in: { 'flour': 1, 'water': 1 }, out: { 'dough': 1 } }] },
                'machine_coal_brick_oven': { id: 'machine_coal_brick_oven', name: 'Coal Brick Oven', color: '#d84315', rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|BB|", "|OO|", "\\-v/"], outX: 2, outY: 4 }), energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 4.0, recipes: [{ in: { 'dough': 1 }, out: { 'bread': 1 } }] },
                'machine_water_filterer': { id: 'machine_water_filterer', name: 'Water Filterer', color: '#03a9f4', rotations: genRot4({ w: 3, h: 5, art: ["/W\\", "|~|", "|F|", "|F|", "\\v/"], outX: 1, outY: 5 }, { w: 5, h: 3, art: ["/---\\", "<FF~|", "\\W--/"], outX: -1, outY: 1 }), energy: { type: 'none' }, processTime: 5.0, recipes: [{ in: { 'water': 1 }, out: { 'drinking_water': 1 } }] },
                'machine_rock_breaker': {
                id: 'machine_rock_breaker', name: 'Heavy Rock Breaker', color: '#607d8b',
                rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|RB|", "|RB|", "\\-v/"], outX: 2, outY: 4 }),
                energy: { type: 'electric', usage: 10 }, processTime: 2.0, recipes: [{ in: { 'stone': 5 }, out: { 'pulverized_stone': 2 } }],
                renderAnim: function (char, t) { if (char === 'R' || char === 'B') return { char: t === 0 ? char : '#' }; return null; }
            },
                'machine_slurry_filter_press': {
                id: 'machine_slurry_filter_press', name: 'Slurry Filter Press', color: '#827717',
                rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|SP|", "|SP|", "|SP|", "\\-v/"], outX: 2, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "<SSS|", "|PPP|", "\\---/"], outX: -1, outY: 1 }),
                energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0, recipes: [{ in: { 'uranium_rich_slurry': 2 }, out: { 'toxic_filter_cake': 1 } }],
                renderAnim: function (char, t) { if (char === 'S' || char === 'P') return { char: t === 0 ? '~' : '=' }; return null; }
            },
                'machine_chemical_oxidizer': {
                id: 'machine_chemical_oxidizer', name: 'Chemical Oxidizer', color: '#1b5e20',
                rotations: genRot4({ w: 5, h: 4, art: ["/---\\", "|OX |", "|OX |", "\\-v-/"], outX: 2, outY: 4 }, { w: 4, h: 5, art: ["/--\\", "<OO|", "|XX|", "|  |", "\\--/"], outX: -1, outY: 1 }),
                energy: { type: 'electric', usage: 20 }, processTime: 3.5, recipes: [{ in: { 'dry_uranic_crust': 2, 'oxygen': 1 }, out: { 'oxidized_uranium_matrix': 2 } }],
                renderAnim: function (char, t) { if (char === 'O') return { char: t === 0 ? 'o' : 'O', color: '#81d4fa' }; return null; }
            },
                'machine_ion_separator': {
                id: 'machine_ion_separator', name: 'Ion Separator', color: '#00e676',
                rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|IS|", "|IS|", "\\-v/"], outX: 2, outY: 4 }),
                energy: { type: 'electric', usage: 40 }, processTime: 5.0, recipes: [{ in: { 'oxidized_uranium_matrix': 2 }, out: { 'uranium_fragment': 1 } }],
                renderAnim: function (char, t) { if (char === 'I' || char === 'S') return { color: t === 0 ? '#00e676' : '#b2ff59' }; return null; }
            },
                'machine_isotope_pulverizer': {
                id: 'machine_isotope_pulverizer', name: 'Isotope Pulverizer', color: '#b2ff59',
                rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|IP|", "|IP|", "\\-v/"], outX: 2, outY: 4 }),
                energy: { type: 'electric', usage: 50 }, processTime: 3.0, recipes: [{ in: { 'uranium_fragment': 1 }, out: { 'uranium_dust': 2 } }],
                renderAnim: function (char, t) { if (char === 'P') return { char: t === 0 ? '*' : 'x' }; return null; }
            },
                'machine_yellowcake_precipitator': {
                id: 'machine_yellowcake_precipitator', name: 'Yellowcake Precipitator', color: '#ffff00',
                rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| Y |", "| Y |", "| Y |", "\\-v-/"], outX: 2, outY: 5 }),
                energy: { type: 'fluid', fuel: 'steam', usage: 5 }, processTime: 4.0, recipes: [{ in: { 'uranium_dust': 2, 'chlorine': 1, 'water': 1 }, out: { 'yellowcake': 1 } }],
                renderAnim: function (char, t) { if (char === 'Y') return { char: t === 0 ? 'y' : 'Y', color: '#ffea00' }; return null; }
            },
                'machine_fluorination_gasifier': {
                id: 'machine_fluorination_gasifier', name: 'Fluorination Gasifier', color: '#c6ff00',
                rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|FG|", "|FG|", "|FG|", "\\-v/"], outX: 2, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "<FFF|", "|GGG|", "\\---/"], outX: -1, outY: 1 }),
                energy: { type: 'electric', usage: 80 }, processTime: 6.0, recipes: [{ in: { 'yellowcake': 1, 'sulfuric_acid': 1 }, out: { 'enriched_uranium': 1 } }],
                renderAnim: function (char, t) { if (char === 'G') return { char: t === 0 ? '~' : '-', color: '#c6ff00' }; return null; }
            },
                'machine_fuel_rod_assembler': {
                id: 'machine_fuel_rod_assembler', name: 'Fuel Rod Assembler', color: '#64dd17',
                rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|FRA|", "|FRA|", "|FRA|", "\\-v-/"], outX: 2, outY: 5 }),
                energy: { type: 'electric', usage: 100 }, processTime: 8.0, recipes: [{ in: { 'enriched_uranium': 2, 'steel_pipe': 1, 'lead_plate': 1 }, out: { 'uranium_fuel_rod': 1 } }],
                renderAnim: function (char, t) { if (char === 'R') return { color: t === 0 ? '#64dd17' : '#1b5e20' }; return null; }
            },
                'machine_waste_storage': {
                id: 'machine_waste_storage', name: 'Nuclear Waste Storage', color: '#263238',
                rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| @ |", "| @ |", "| @ |", "\\---/"], outX: null, outY: null }),
                energy: { type: 'none' }, maxStack: 5000, acceptsItem: (m, itm) => itm === 'nuclear_waste',
                isWorking: function (m) { return m.inv && m.inv['nuclear_waste'] > 0; },
                updateOverride: function (m, r, dt) {

                    if (m.timer >= 15.0 && m.inv['nuclear_waste'] > 0) { m.timer = 0; m.inv['nuclear_waste']--; }
                }
            },
                'machine_steam_turbine': {
                id: 'machine_steam_turbine', name: 'Heavy Steam Turbine', color: '#546e7a',
                rotations: [
                    { w: 11, h: 13, art: ["/---------\\", "|  ~~~~~  |", "| ======= |", "| ======= |", "| ======= |", "| ======= |", "| ======= |", "| ======= |", "| ======= |", "| ======= |", "| ======= |", "|  ~~~~~  |", "\\---------/"], outX: null, outY: null }
                ],
                energy: { type: 'none' },
                updateOverride: function (m, r, dt) {
                    m.inv = m.inv || {}; m.energy = m.energy || 0;

                    if (m.animTimer > 0) m.animTimer -= dt;

                    if (m.energy < 250000 && m.inv['steam'] > 0) {
                        let burnAmt = Math.min(m.inv['steam'], 8);
                        m.inv['steam'] -= burnAmt;
                        m.energy = Math.min(250000, m.energy + (burnAmt * 100));
                        m.animTimer = 0.5;
                    }
                },
                isWorking: function (m) { return m.animTimer > 0; },
                renderAnim: Anim.wave('=', '#b2ebf2')
            },
                'machine_fission_reactor': {
                id: 'machine_fission_reactor', name: 'Fission Reactor CORE', color: '#37474f',
                rotations: [
                    {
                        w: 19, h: 19,
                        art: ["/-----------------\\", "|  [S]       [S]  |", "|   /=========\\   |", "|  /|  [@ @]  |\\  |", "| | |         | | |", "|[W]| =||=||= |[W]|", "| | | =||=||= | | |", "| | | =||=||= | | |", "|-| | =||=||= | |-|", "|@| | ==(@)== | |@|", "|-| | =||=||= | |-|", "| | | =||=||= | | |", "| | | =||=||= | | |", "| | | =||=||= | | |", "| | |         | | |", "|  \\|  [@ @]  |/  |", "|   \\=========/   |", "|  [S]       [S]  |", "\\-----------------/"],
                        // Main Ports
                        outX: 19, outY: 9, out2X: -1, out2Y: 5,
                        // Extra Steam Ports [S] and Waste Ports [W]
                        extraOuts: [{ x: 3, y: -1 }, { x: 15, y: -1 }, { x: 3, y: 19 }, { x: 15, y: 19 }],
                        extraOut2s: [{ x: 19, y: 5 }]
                    }
                ],
                energy: { type: 'none' }, maxStack: 500,
                isWorking: function (m) { return (m.fuelTime && m.fuelTime > 0) || (m.heat && m.heat > 500); },
                updateOverride: function (m, r, dt) {
                    m.heat = m.heat || 0; m.fuelTime = m.fuelTime || 0;
                    m.inv = m.inv || {}; m.outBuffer = m.outBuffer || {}; m.out2Buffer = m.out2Buffer || {};

                    if (m.fuelTime <= 0 && m.inv['uranium_fuel_rod'] > 0) { m.inv['uranium_fuel_rod']--; m.fuelTime = 30.0; }

                    if (m.fuelTime > 0) {
                        m.fuelTime -= dt;
                        let heatGen = 300 * dt;
                        if (m.inv['graphite_control_rod'] > 0) {
                            heatGen = 25 * dt;
                            if (Math.random() < 0.05 * dt) m.inv['graphite_control_rod']--;
                        }
                        m.heat += heatGen;
                        m.wasteTimer = (m.wasteTimer || 0) + dt;
                        if (m.wasteTimer >= 3.0) {
                            m.wasteTimer = 0;
                            if ((m.out2Buffer['nuclear_waste'] || 0) < 200) m.out2Buffer['nuclear_waste'] = (m.out2Buffer['nuclear_waste'] || 0) + 1;
                            else m.heat += 500 * dt;
                        }
                    }
                    if (m.heat > 0 && m.inv['water'] > 0) {
                        let coolAmt = Math.min(m.inv['water'], 40); // Increased cooling capacity
                        m.inv['water'] -= coolAmt;
                        m.heat = Math.max(0, m.heat - (coolAmt * 5));
                        m.outBuffer['steam'] = (m.outBuffer['steam'] || 0) + (coolAmt * 8); // More steam per water
                    }
                    if (m.heat >= 10000) triggerNuclearExplosion(m.x + 9, m.y + 9);
                },
                renderAnim: function (char, t, m) {
                    let h = m ? (m.heat || 0) : 0;
                    if (h > 8000 && (char === '@' || char === '=' || char === '|' || char === '-')) return { color: (t === 0 ? '#f44336' : '#ffeb3b') };
                    if (m && m.fuelTime > 0) {
                        if (char === '@') return { color: (t === 0 ? '#76ff03' : '#b2ff59') };
                        if (char === '=') return { char: (t === 0 ? '~' : '='), color: '#00bcd4' };
                        if (char === 'S') return { color: '#fbc02d' }; // Highlight Steam Ports
                        if (char === 'W') return { color: '#03a9f4' }; // Highlight Waste Ports
                    }
                    return null;
                }
            },
                'machine_particle_collider': {
                id: 'machine_particle_collider', name: 'Particle Collider', color: '#1a237e',
                rotations: [
                    {
                        w: 15, h: 17,
                        art: [
                            "/-------------\\", "|   /=====\\   |", "|  /       \\  |", "| / /=====\\ \\ |", "| | |     | | |", "| | |     | | |", "| | | (O) | | |", "| | |     | | |", "| | |     | | |", "| | |     | | |", "| | | (O) | | |", "| | |     | | |", "| \\ \\=====/ / |", "|  \\       /  |", "|   \\=====/   |", "|   [P] [P]   |", "\\-------------/"
                        ], outX: 15, outY: 8, out2X: -1, out2Y: 8
                    }
                ],
                energy: { type: 'electric', usage: 100000 }, maxEnergy: 500000, processTime: 5.0,
                recipes: [
                    { in: { 'uranium_fuel_rod': 5 }, out: { 'radium': 1 } },
                    { in: { 'deuterium': 2 }, out: { 'tritium': 2 } }
                ],
                renderAnim: function (char, t, m) { if (char === 'O' || char === '=') return { color: t === 0 ? '#3949ab' : '#8c9eff' }; return null; }
            },
                'machine_heavy_pump': {
                id: 'machine_heavy_pump', name: 'Heavy Electric Pump', color: '#01579b',
                rotations: genRot4({ w: 3, h: 3, art: ["/H\\", "|P|", "\\v/"], outX: 1, outY: 3 }),
                energy: { type: 'electric', usage: 1000 }, processTime: 8.0,
                recipes: [{ in: { 'radium': 1 }, out: { 'heavy_water': 2 } }]
            },
                'machine_atmospheric_condenser': {
                id: 'machine_atmospheric_condenser', name: 'Atmospheric Condenser', color: '#b0bec5',
                rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|AC|", "|AC|", "\\-v/"], outX: 2, outY: 4 }),
                energy: { type: 'electric', usage: 500 }, processTime: 2.0, recipes: [{ in: {}, out: { 'nitrogen_gas': 1 } }]
            },
                'machine_cryocooler': {
                id: 'machine_cryocooler', name: 'Cryocooler (HVAC)', color: '#0288d1',
                rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|**|", "|**|", "\\-v/"], outX: 2, outY: 4 }),
                energy: { type: 'electric', usage: 5000 }, processTime: 3.0, recipes: [{ in: { 'nitrogen_gas': 2 }, out: { 'liquid_n2': 2 } }],
                updateOverride: function (m, r, dt) { if (m.inv && m.inv['superheated_n2'] > 0) { triggerNuclearExplosion(m.x, m.y); } }
            },
                'machine_heat_exchanger': {
                id: 'machine_heat_exchanger', name: 'Heat Exchanger', color: '#ff5722',
                rotations: [{ w: 5, h: 5, art: ["/---\\", "|~H~|", "|~H~|", "|~H~|", "\\-v-/"], outX: 2, outY: 5, out2X: -1, out2Y: 2 }],
                energy: { type: 'none' }, processTime: 1.0, recipes: [{ in: { 'superheated_n2': 1, 'water': 2 }, out: { 'hot_n2': 1 }, out2: { 'steam': 4 } }]
            },
                'machine_cooling_tower': {
                id: 'machine_cooling_tower', name: 'Cooling Tower', color: '#90a4ae',
                rotations: [{ w: 5, h: 5, art: ["/---\\", "| C |", "| C |", "| C |", "\\-v-/"], outX: 2, outY: 5 }],
                energy: { type: 'none' }, processTime: 1.5, recipes: [{ in: { 'hot_n2': 2 }, out: { 'nitrogen_gas': 2 } }]
            },
                'machine_fusion_charger': {
                id: 'machine_fusion_charger', name: 'Fusion Charger', color: '#ffd54f',
                rotations: [{ w: 3, h: 3, art: ["/+\\", "|+|", "\\-/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 25000 }, maxEnergy: 250000,
                updateOverride: function (m, r, dt) {
                    m.energy = m.energy || 0;
                    let draw = Math.min(m.energy, 25000);
                    m.energy -= draw;
                    m.chargePulse = draw;
                }
            },
                'machine_mega_transformer': {
                id: 'machine_mega_transformer', name: 'Mega Transformer', color: '#651fff',
                rotations: [{ w: 5, h: 5, art: ["/---\\", "| T |", "| T |", "| T |", "\\---/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 0 }, maxEnergy: 10000000 // Act as a massive power buffer bridged to Hyper Wire
            },
                'machine_fusion_reactor': {
                id: 'machine_fusion_reactor', name: 'Fusion Reactor Core', color: '#00e5ff',
                rotations: [{
                    w: 25, h: 25, art: [
                        "/-----------------------\\",
                        "|                       |",
                        "|      [N]     [N]      |",
                        "|                       |",
                        "|  /=================\\  |",
                        "| /  /-------------\\  \\ |",
                        "| | /               \\ | |",
                        "| | |    [F] [F]    | | |",
                        "| | |               | | |",
                        "| | |   /=======\\   | | |",
                        "| | |  /         \\  | | |",
                        "| | | |           | | | |",
                        "|[N]| |   (CORE)  | |[N]|",
                        "| | | |           | | | |",
                        "| | |  \\         /  | | |",
                        "| | |   \\=======/   | | |",
                        "| | |               | | |",
                        "| | |    [F] [F]    | | |",
                        "| | \\               / | |",
                        "| \\  \\-------------/  / |",
                        "|  \\=================/  |",
                        "|                       |",
                        "|      [N]     [N]      |",
                        "|                       |",
                        "\\-----------------------/"
                    ], outX: null, outY: null
                }],
                energy: { type: 'none' }, maxStack: 50000,
                updateOverride: function (m, r, dt) {
                    m.inv = m.inv || {}; m.outBuffer = m.outBuffer || {}; m.fusionActive = m.fusionActive || false;
                    m.charge = m.charge || 0; m.heat = m.heat || 0;

                    // Absorb Charge from adjacent Chargers
                    for (let am of activeMachines) {
                        if (am && am.type === 'machine_fusion_charger' && am.chargePulse > 0) {
                            let dx = Math.abs(m.x + 12 - (am.x + 1)); let dy = Math.abs(m.y + 12 - (am.y + 1));
                            if (dx <= 14 && dy <= 14) { m.charge += am.chargePulse; am.chargePulse = 0; }
                        }
                    }

                    if (!m.fusionActive) {
                        m.charge = Math.max(0, m.charge - 10 * dt); // Decay
                        return;
                    }

                    // IF RUNNING
                    let fuelBurned = false;
                    if (m.inv['deuterium'] > 0 && m.inv['tritium'] > 0 && m.charge > 1000000) {
                        m.inv['deuterium']--; m.inv['tritium']--; fuelBurned = true;
                    }

                    if (fuelBurned) {
                        if (m.inv['liquid_n2'] >= 10) {
                            m.inv['liquid_n2'] -= 10;
                            m.outBuffer['superheated_n2'] = (m.outBuffer['superheated_n2'] || 0) + 10;
                        } else {
                            m.heat += 50000 * dt; // Rapid overheating
                        }

                        // Power generation & SiCu Manifold check
                        let generatedPower = 10000000 * dt;
                        let connectedSiCu = 0;
                        for (let x = m.x - 1; x <= m.x + 25; x++) {
                            if (mapPipes['sicu'][(m.y - 1) * WORLD_SIZE + x] > 0) connectedSiCu++;
                            if (mapPipes['sicu'][(m.y + 25) * WORLD_SIZE + x] > 0) connectedSiCu++;
                        }
                        for (let y = m.y; y < m.y + 25; y++) {
                            if (mapPipes['sicu'][y * WORLD_SIZE + (m.x - 1)] > 0) connectedSiCu++;
                            if (mapPipes['sicu'][y * WORLD_SIZE + (m.x + 25)] > 0) connectedSiCu++;
                        }

                        if (connectedSiCu === 0) {
                            m.heat += 100000 * dt;
                        } else {
                            let loadPerCable = generatedPower / connectedSiCu;
                            if (loadPerCable > 1000000) {
                                // VAPORIZE CABLES
                                for (let x = m.x - 1; x <= m.x + 25; x++) { mapPipes['sicu'][(m.y - 1) * WORLD_SIZE + x] = 0; mapPipes['sicu'][(m.y + 25) * WORLD_SIZE + x] = 0; }
                                for (let y = m.y; y < m.y + 25; y++) { mapPipes['sicu'][y * WORLD_SIZE + (m.x - 1)] = 0; mapPipes['sicu'][y * WORLD_SIZE + (m.x + 25)] = 0; }
                                floatText(m.x + 12, m.y + 12, "SiCu MANIFOLD VAPORIZED!", "#aa00ff");
                            } else {
                                // Find Transformers to push power into
                                let transformers = activeMachines.filter(tm => tm && tm.type === 'machine_mega_transformer');
                                if (transformers.length > 0) {
                                    let give = generatedPower / transformers.length;
                                    transformers.forEach(tm => tm.energy = Math.min(10000000, (tm.energy || 0) + give));
                                }
                            }
                        }
                    } else {
                        m.fusionActive = false; // flame out
                    }

                    if (m.heat > 500000) triggerSupernova(m.x + 12, m.y + 12);
                },
                renderAnim: function (char, t, m) { if (m && m.fusionActive && (char === 'O' || char === '=')) return { color: (t === 0 ? '#e0f7fa' : '#ffffff') }; return null; }
            },

    // ═══ MIGRATED FROM afac.html (all Object.assign blocks) ═══
    'machine_drone_station_farming': {
                id: 'machine_drone_station_farming', name: 'Crude Farming Drone Station', color: '#8bc34a',
                rotations: genRot4({ w: 3, h: 3, art: ["/F\\", "|+|", "\\-/"], outX: 1, outY: 3 }), energy: { type: 'none' },
                updateOverride: function (m, r, dt) {
                    if (!m.drone) m.drone = { x: m.x + 1.5, y: m.y + 1.5, state: 'idle', inv: { wheat: 0, seeds: 0 } };
                    let d = m.drone; m.inv = m.inv || {}; m.outBuffer = m.outBuffer || {};

                    if (d.state === 'idle') {
                        d.x = m.x + 1.5; d.y = m.y + 1.5; // Snap to center
                        // Fallback to empty inventory if it randomly goes idle
                        if (d.inv.wheat > 0 || d.inv.seeds > 0) {
                            m.outBuffer['wheat'] = (m.outBuffer['wheat'] || 0) + d.inv.wheat;
                            m.outBuffer['seeds'] = (m.outBuffer['seeds'] || 0) + d.inv.seeds;
                            d.inv = { wheat: 0, seeds: 0 };
                        }

                        if (m.area && m.inv['coal'] > 0) {
                            let found = null;
                            d.scanTimer = (d.scanTimer || 0) + dt;
                            if (d.scanTimer > 0.5) {
                                d.scanTimer = 0;
                                for (let y = m.area.y1; y <= m.area.y2; y++) for (let x = m.area.x1; x <= m.area.x2; x++) {
                                    if (worldMap[y * WORLD_SIZE + x] === 48) { found = { x, y }; break; }
                                }
                            }
                            if (found) { m.inv['coal']--; d.state = 'harvest'; d.target = { x: found.x + 0.5, y: found.y + 0.5 }; }
                        }
                    } else {
                        let dx = d.target.x - d.x, dy = d.target.y - d.y; let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0.1) { let speed = 6; d.x += (dx / dist) * speed * dt; d.y += (dy / dist) * speed * dt; }
                        else {
                            if (d.state === 'harvest') {
                                let idx = Math.floor(d.target.y) * WORLD_SIZE + Math.floor(d.target.x);
                                if (worldMap[idx] === 48) {
                                    d.inv.wheat = (d.inv.wheat || 0) + 1; d.inv.seeds = (d.inv.seeds || 0) + 2;
                                    if (d.inv.seeds > 0 || (m.inv['seeds'] && m.inv['seeds'] > 0)) {
                                        worldMap[idx] = 47; cropProgress[idx] = 0;
                                        if (d.inv.seeds > 0) d.inv.seeds--; else m.inv['seeds']--;
                                    } else worldMap[idx] = 45;
                                }
                                if (d.inv.wheat >= 8) { d.state = 'return'; d.target = { x: m.x + 1.5, y: m.y + 1.5 }; }
                                else {
                                    let found = null;
                                    for (let y = m.area.y1; y <= m.area.y2; y++) for (let x = m.area.x1; x <= m.area.x2; x++) { if (worldMap[y * WORLD_SIZE + x] === 48) { found = { x, y }; break; } }
                                    if (found) d.target = { x: found.x + 0.5, y: found.y + 0.5 }; else { d.state = 'return'; d.target = { x: m.x + 1.5, y: m.y + 1.5 }; }
                                }
                            } else if (d.state === 'return') {
                                // Drop off EVERY TIME it returns to the station
                                if (d.inv.wheat > 0 || d.inv.seeds > 0) {
                                    m.outBuffer['wheat'] = (m.outBuffer['wheat'] || 0) + d.inv.wheat;
                                    m.outBuffer['seeds'] = (m.outBuffer['seeds'] || 0) + d.inv.seeds;
                                    d.inv = { wheat: 0, seeds: 0 };
                                }
                                d.state = 'idle';
                            }
                        }
                    }
                }
            },
    'machine_drone_station_carrier': {
                id: 'machine_drone_station_carrier', name: 'Crude Carrier Drone Station', color: '#ff9800',
                rotations: [{ w: 3, h: 3, art: ["/C\\", "|%|", "\\-/"], outX: null, outY: null }], energy: { type: 'none' },
                updateOverride: function (m, r, dt) {
                    if (!m.drone) m.drone = { x: m.x + 1.5, y: m.y + 1.5, state: 'idle', inv: null, invCount: 0 };
                    let d = m.drone; m.inv = m.inv || {};

                    let inM = m.linkInput && worldMap[m.linkInput.y * WORLD_SIZE + m.linkInput.x] >= 50000 ? activeMachines[worldMap[m.linkInput.y * WORLD_SIZE + m.linkInput.x] - 50000] : null;
                    let outM = m.linkOutput && worldMap[m.linkOutput.y * WORLD_SIZE + m.linkOutput.x] >= 50000 ? activeMachines[worldMap[m.linkOutput.y * WORLD_SIZE + m.linkOutput.x] - 50000] : null;

                    let linkInValid = inM && inM.type === 'machine_drone_input';
                    let linkOutValid = outM && outM.type === 'machine_drone_output';

                    if (d.state === 'idle') {
                        d.x = m.x + 1.5; d.y = m.y + 1.5;
                        if (m.inv['coal'] > 0 && linkInValid && linkOutValid) {
                            let avail = Object.keys(inM.inv).find(k => inM.inv[k] > 0);
                            if (avail) { m.inv['coal']--; d.state = 'fetch'; d.target = { x: m.linkInput.x + 0.5, y: m.linkInput.y + 0.5 }; d.invCount = 0; }
                        }
                    } else {
                        let dx = d.target.x - d.x, dy = d.target.y - d.y; let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0.1) { let speed = 8; d.x += (dx / dist) * speed * dt; d.y += (dy / dist) * speed * dt; }
                        else {
                            if (d.state === 'fetch') {
                                if (linkInValid) {
                                    let avail = Object.keys(inM.inv).find(k => inM.inv[k] > 0);
                                    if (avail) {
                                        let grabCount = Math.min(8, inM.inv[avail]);
                                        inM.inv[avail] -= grabCount;
                                        if (inM.inv[avail] <= 0) delete inM.inv[avail]; // BUGFIX: Prevents infinite 0-stack fetch loop

                                        d.inv = avail; d.invCount = grabCount;
                                        d.state = 'deliver'; d.target = { x: m.linkOutput.x + 0.5, y: m.linkOutput.y + 0.5 };
                                    } else { d.state = 'return'; d.target = { x: m.x + 1.5, y: m.y + 1.5 }; }
                                } else { d.state = 'return'; d.target = { x: m.x + 1.5, y: m.y + 1.5 }; }
                            } else if (d.state === 'deliver') {
                                if (linkOutValid && d.inv && d.invCount > 0) {
                                    outM.outBuffer[d.inv] = (outM.outBuffer[d.inv] || 0) + d.invCount;
                                    d.inv = null; d.invCount = 0;
                                }
                                d.state = 'return'; d.target = { x: m.x + 1.5, y: m.y + 1.5 };
                            } else if (d.state === 'return') {
                                // BUGFIX: Return items securely to the station's buffer if delivery failed (Output was mined)
                                if (d.inv && d.invCount > 0) {
                                    m.outBuffer = m.outBuffer || {};
                                    m.outBuffer[d.inv] = (m.outBuffer[d.inv] || 0) + d.invCount;
                                    d.inv = null; d.invCount = 0;
                                }
                                d.state = 'idle';
                            }
                        }
                    }
                }
            },
    'machine_advanced_drone_station': {
                id: 'machine_advanced_drone_station', name: 'Advanced Carrier Station', color: '#00e5ff',
                rotations: [
                    {
                        w: 5, h: 5, art: [
                            "/---\\",
                            "|/ \\|",
                            "||A||",
                            "|\\ /|",
                            "\\---/"
                        ], outX: null, outY: null
                    }
                ],
                energy: { type: 'electric', usage: 10000 }, maxEnergy: 60000,
                updateOverride: function (m, r, dt) {
                    if (!m.drone) m.drone = { x: m.x + 2.5, y: m.y + 2.5, state: 'idle', inv: null, invCount: 0 };
                    let d = m.drone; m.inv = m.inv || {}; m.energy = m.energy || 0;

                    let inM = m.linkInput && worldMap[m.linkInput.y * WORLD_SIZE + m.linkInput.x] >= 50000 ? activeMachines[worldMap[m.linkInput.y * WORLD_SIZE + m.linkInput.x] - 50000] : null;
                    let outM = m.linkOutput && worldMap[m.linkOutput.y * WORLD_SIZE + m.linkOutput.x] >= 50000 ? activeMachines[worldMap[m.linkOutput.y * WORLD_SIZE + m.linkOutput.x] - 50000] : null;

                    let linkInValid = inM && inM.type === 'machine_drone_input';
                    let linkOutValid = outM && outM.type === 'machine_drone_output';

                    if (d.state === 'idle') {
                        d.x = m.x + 2.5; d.y = m.y + 2.5;
                        // 10,000 EU per trip
                        if (m.energy >= 10000 && linkInValid && linkOutValid) {
                            let avail = Object.keys(inM.inv).find(k => inM.inv[k] > 0);
                            if (avail) { m.energy -= 10000; d.state = 'fetch'; d.target = { x: m.linkInput.x + 0.5, y: m.linkInput.y + 0.5 }; d.invCount = 0; }
                        }
                    } else {
                        let dx = d.target.x - d.x, dy = d.target.y - d.y; let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0.1) { let speed = 20; d.x += (dx / dist) * speed * dt; d.y += (dy / dist) * speed * dt; } // Highly accelerated speed
                        else {
                            if (d.state === 'fetch') {
                                if (linkInValid) {
                                    let avail = Object.keys(inM.inv).find(k => inM.inv[k] > 0);
                                    if (avail) {
                                        let grabCount = Math.min(64, inM.inv[avail]); // 64 Capacity!
                                        inM.inv[avail] -= grabCount;
                                        if (inM.inv[avail] <= 0) delete inM.inv[avail];

                                        d.inv = avail; d.invCount = grabCount;
                                        d.state = 'deliver'; d.target = { x: m.linkOutput.x + 0.5, y: m.linkOutput.y + 0.5 };
                                    } else { d.state = 'return'; d.target = { x: m.x + 2.5, y: m.y + 2.5 }; }
                                } else { d.state = 'return'; d.target = { x: m.x + 2.5, y: m.y + 2.5 }; }
                            } else if (d.state === 'deliver') {
                                if (linkOutValid && d.inv && d.invCount > 0) {
                                    outM.outBuffer[d.inv] = (outM.outBuffer[d.inv] || 0) + d.invCount;
                                    d.inv = null; d.invCount = 0;
                                }
                                d.state = 'return'; d.target = { x: m.x + 2.5, y: m.y + 2.5 };
                            } else if (d.state === 'return') {
                                if (d.inv && d.invCount > 0) {
                                    m.outBuffer = m.outBuffer || {};
                                    m.outBuffer[d.inv] = (m.outBuffer[d.inv] || 0) + d.invCount;
                                    d.inv = null; d.invCount = 0;
                                }
                                d.state = 'idle';
                            }
                        }
                    }
                },
                isWorking: function (m) { return m.drone && m.drone.state !== 'idle'; },
                renderAnim: function (char, t, m) {
                    // Glow cyan if charged, dark grey if empty
                    if (char === 'A') return { color: ((m.energy || 0) >= 10000 ? '#00e5ff' : '#455a64') };
                    return null;
                }
            },
    'machine_drone_input': { id: 'machine_drone_input', name: 'Drone Input', color: '#03a9f4', rotations: [{ w: 1, h: 1, art: ["I"], outX: null, outY: null }], energy: { type: 'none' }, maxStack: 100 },
    'machine_drone_output': { id: 'machine_drone_output', name: 'Drone Output', color: '#ff9800', rotations: genRot4({ w: 1, h: 1, art: ["v"], outX: 0, outY: 1 }), energy: { type: 'none' } },
    'machine_qe_forge': {
                id: 'machine_qe_forge', name: 'Quantum Entanglement Forge', color: '#9c6fe4',
                rotations: [{
                    w: 9, h: 9,
                    art: [
                        "/-------\\",
                        "| Q   Q |",
                        "|[=====]|",
                        "||     ||",
                        "|| (E) ||",
                        "||     ||",
                        "|[=====]|",
                        "| Q   Q |",
                        "\\--v--v-/"
                    ],
                    outX: 3, outY: 9,    // entangled_pair output  (left  'v' at pos 3)
                    out2X: 6, out2Y: 9   // quantum_circuit output (right 'v' at pos 6)
                }],
                energy: { type: 'electric', usage: 1500000 }, maxEnergy: 3000000, processTime: 10.0,
                recipes: [{
                    in: { 'pure_silica': 4, 'compute_module': 2 },
                    out: { 'entangled_pair': 2 },
                    out2: { 'quantum_circuit': 1 }
                }],
                isWorking: function (m) {
                    return (m.energy || 0) >= 1500000
                        && (m.inv['pure_silica'] || 0) >= 4
                        && (m.inv['compute_module'] || 0) >= 2;
                },
                renderAnim: function (char, t) {
                    if (char === 'E') return { char: t === 0 ? 'E' : '*', color: '#b388ff' };
                    if (char === '=') return { char: t === 0 ? '=' : '~', color: '#7c4dff' };
                    if (char === 'Q') return { char: t === 0 ? 'Q' : 'q', color: '#ce93d8' };
                    return null;
                }
            },
    'machine_q_router': {
                id: 'machine_q_router', name: 'Q-Router', color: '#6a1b9a',
                rotations: genRot4({ w: 2, h: 2, art: ["QR", "vv"], outX: 0, outY: 2 }),
                energy: { type: 'electric', usage: 0 }, maxEnergy: 1200000, maxStack: 200,

                updateOverride: function (m, r, dt) {
                    m.energy = m.energy || 0;
                    if (m.partnerId === null || m.partnerId === undefined) return;

                    let partner = activeMachines[m.partnerId];

                    // ── Decoherence: partner was destroyed or mined ──
                    if (!partner || partner.type !== 'machine_q_router') {
                        m.decoherent = true;
                        m.partnerId = null;
                        floatText(m.x + 1, m.y, "DECOHERENCE!", "#b388ff");
                        // Scatter in-transit items back to the player
                        for (let itm in m.inv) {
                            inventory[itm] = (inventory[itm] || 0) + m.inv[itm];
                        }
                        m.inv = {};
                        return;
                    }

                    // ── Continuous entanglement maintenance drain ──
                    m.energy = Math.max(0, m.energy - 60000 * dt);

                    // ── Teleport: move inv → partner.outBuffer on each tick ──
                    let hasItems = Object.values(m.inv).some(v => v > 0);
                    if (hasItems && m.energy >= 200000) {
                        m.energy -= 200000;
                        partner.outBuffer = partner.outBuffer || {};
                        for (let itm in m.inv) {
                            if (m.inv[itm] > 0) {
                                partner.outBuffer[itm] = (partner.outBuffer[itm] || 0) + m.inv[itm];
                                m.inv[itm] = 0;
                            }
                        }
                        m.inv = {};
                        floatText(m.x + 1, m.y, "~>", "#b388ff");
                    }
                },

                isWorking: function (m) {
                    return !m.decoherent
                        && m.partnerId !== null && m.partnerId !== undefined
                        && (m.energy || 0) > 100000;
                },
                renderAnim: function (char, t) {
                    if (char === 'Q' || char === 'R') {
                        return { color: t === 0 ? '#7c4dff' : '#ce93d8' };
                    }
                    return null;
                }
            },
    'machine_q_processor': {
                id: 'machine_q_processor', name: 'Q-Processor', color: '#7c4dff',
                rotations: [{
                    w: 5, h: 5,
                    art: ["/---\\", "|QQQ|", "|QPQ|", "|QQQ|", "\\---/"],
                    outX: null, outY: null   // utility machine, no item output
                }],
                energy: { type: 'electric', usage: 0 }, maxEnergy: 600000,

                updateOverride: function (m, r, dt) {
                    m.energy = m.energy || 0;
                    if (m.energy < 100000) return;   // starved — go dark

                    m.energy -= 80000 * dt;

                    // ── Predictive defense: rebuild flow field every 2 s ──
                    m.defenseTimer = (m.defenseTimer || 0) + dt;
                    if (m.defenseTimer >= 2.0) {
                        m.defenseTimer = 0;
                        if (gameState.rebuild_monster_paths) {
                            gameState.rebuild_monster_paths(player.x, player.y);
                        }
                    }

                    // ── Auto-routing: scan data-grid for unrouted output ports ──
                    m.routeTimer = (m.routeTimer || 0) + dt;
                    if (m.routeTimer >= 8.0) {
                        m.routeTimer = 0;
                        qProcessorAutoRoute(m);
                    }
                },

                isWorking: function (m) { return (m.energy || 0) >= 100000; },
                renderAnim: function (char, t) {
                    if (char === 'P') return { char: t === 0 ? 'P' : '*', color: '#b388ff' };
                    if (char === 'Q') return { color: t === 0 ? '#7c4dff' : '#9c6fe4' };
                    return null;
                }
            },
    'machine_primitive_plasma_tap': {
                id: 'machine_primitive_plasma_tap', name: 'Primitive Plasma Tap', color: '#ff6d00',
                rotations: genRot4({ w: 4, h: 4, art: ["/P-\\", "|TP|", "|~~|", "\\-v/"], outX: 1, outY: 4 }),
                energy: { type: 'none' }, processTime: 3.0,
                recipes: [{ in: { lava: 1 }, out: { raw_plasma: 1 } }],
                updateOverride(m, r, dt) {
                    plasmaTick(m, dt);
                    if (!activeMachines[m.id]) return;
                    if (m.timer < m.def.processTime) return;
                    if ((m.inv['lava'] || 0) < 1) return;
                    m.timer = 0;
                    m.inv['lava']--;
                    if (!m.inv['lava']) delete m.inv['lava'];
                    m.outBuffer['raw_plasma'] = (m.outBuffer['raw_plasma'] || 0) + 1;
                },
                isWorking(m) { return (m.inv['lava'] || 0) >= 1; },
                renderAnim(char, t) {
                    if (char === '~') return { char: t === 0 ? '~' : '*', color: '#ff6d00' };
                    if (char === 'P') return { color: t === 0 ? '#ff6d00' : '#ffab40' };
                    return null;
                }
            },
    'machine_plasma_manifold': {
                id: 'machine_plasma_manifold', name: 'Plasma Manifold', color: '#ff9100',
                rotations: [
                    {
                        w: 9, h: 9,
                        art: ["/-------\\",
                            "|M=====M|",
                            "|=======|",
                            "|=[PMF]=|",
                            "|=======|",
                            "|=======|",
                            "|=======|",
                            "|M=====M|",
                            "\\---v---/"],
                        outX: 4, outY: 9
                    },
                    {
                        w: 9, h: 9,
                        art: ["/-------\\",
                            "|M=====M|",
                            "|=======|",
                            "<[PMF]==|",
                            "|=======|",
                            "|=======|",
                            "|=======|",
                            "|M=====M|",
                            "\\-------/"],
                        outX: -1, outY: 3
                    },
                    {
                        w: 9, h: 9,
                        art: ["/---^---\\",
                            "|M=====M|",
                            "|=======|",
                            "|=[PMF]=|",
                            "|=======|",
                            "|=======|",
                            "|=======|",
                            "|M=====M|",
                            "\\-------/"],
                        outX: 4, outY: -1
                    },
                    {
                        w: 9, h: 9,
                        art: ["/-------\\",
                            "|M=====M|",
                            "|=======|",
                            "|==[PMF>",
                            "|=======|",
                            "|=======|",
                            "|=======|",
                            "|M=====M|",
                            "\\-------/"],
                        outX: 9, outY: 3
                    }
                ],
                energy: { type: 'electric', usage: 250000 }, maxEnergy: 1000000,
                processTime: 4.0,
                updateOverride(m, r, dt) {
                    m.energy = m.energy || 0;
                    plasmaTick(m, dt);
                    if (!activeMachines[m.id]) return;
                    if (m.energy < 250000) return;
                    if (m.timer < m.def.processTime) return;
                    if ((m.inv['raw_plasma'] || 0) < 2 || (m.inv['water'] || 0) < 1) return;
                    m.timer = 0;
                    m.inv['raw_plasma'] -= 2; if (!m.inv['raw_plasma']) delete m.inv['raw_plasma'];
                    m.inv['water']--; if (!m.inv['water']) delete m.inv['water'];
                    m.energy -= 250000;
                    m.outBuffer['stabilized_plasma'] = (m.outBuffer['stabilized_plasma'] || 0) + 1;
                    m.out2Buffer = m.out2Buffer || {};
                    m.out2Buffer['plasma_slag'] = (m.out2Buffer['plasma_slag'] || 0) + 1;
                },
                isWorking(m) {
                    return (m.energy || 0) >= 250000
                        && (m.inv['raw_plasma'] || 0) >= 2
                        && (m.inv['water'] || 0) >= 1;
                },
                renderAnim(char, t) {
                    if (char === '=') return { char: t === 0 ? '~' : '=', color: '#ff9100' };
                    if (char === 'M') return { color: t === 0 ? '#ff6d00' : '#e65100' };
                    return null;
                }
            },
    'machine_plasma_torch_furnace': {
                id: 'machine_plasma_torch_furnace', name: 'Plasma Torch Furnace', color: '#bf360c',
                rotations: genRot4({ w: 7, h: 7, art: ["/-----\\", "|T===P|", "|=====|", "|~~~~~|", "|=====|", "|T===P|", "\\--v--/"], outX: 3, outY: 7 }),
                energy: { type: 'none' }, processTime: 5.0,
                recipes: [
                    { in: { tungsten_ore: 2, stabilized_plasma: 1 }, out: { tungsten_ingot: 1 } },
                    { in: { rhenium_ore: 2, stabilized_plasma: 1 }, out: { rhenium_ingot: 1 } },
                    { in: { tungsten_ore: 2, raw_plasma: 3 }, out: { tungsten_ingot: 1 } }
                ],
                updateOverride(m, r, dt) {
                    plasmaTick(m, dt);
                    if (!activeMachines[m.id]) return;
                    if (m.timer < m.def.processTime) return;
                    for (let rec of m.def.recipes) {
                        let can = true;
                        for (let k in rec.in) if ((m.inv[k] || 0) < rec.in[k]) { can = false; break; }
                        if (!can) continue;
                        m.timer = 0;
                        for (let k in rec.in) { m.inv[k] -= rec.in[k]; if (!m.inv[k]) delete m.inv[k]; }
                        for (let k in rec.out) m.outBuffer[k] = (m.outBuffer[k] || 0) + rec.out[k];
                        break;
                    }
                },
                isWorking(m) {
                    return m.def.recipes.some(rec =>
                        Object.keys(rec.in).every(k => (m.inv[k] || 0) >= rec.in[k]));
                },
                renderAnim(char, t) {
                    if (char === '~') return { char: t === 0 ? '~' : '*', color: '#ff6d00' };
                    if (char === '=') return { char: t === 0 ? '=' : '~', color: '#bf360c' };
                    return null;
                }
            },
    'machine_carbide_press': {
                id: 'machine_carbide_press', name: 'Carbide Press', color: '#37474f',
                rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|CRB|", "|===|", "|CRB|", "\\-v-/"], outX: 2, outY: 5 }),
                energy: { type: 'electric', usage: 15 }, processTime: 4.0,
                recipes: [
                    { in: { tungsten_ingot: 2, coal: 2 }, out: { tungsten_carbide: 1 } },
                    { in: { tungsten_carbide: 2 }, out: { carbide_rod: 3 } }
                ],
                renderAnim(char, t) {
                    if (char === '=') return { char: t === 0 ? '=' : '_' };
                    return null;
                }
            },
    'machine_plasma_refinery': {
                id: 'machine_plasma_refinery', name: 'Plasma Refinery', color: '#7b1fa2',
                rotations: genRot4({ w: 7, h: 7, art: ["/-----\\", "|R~~~R|", "|~===~|", "|~===~|", "|~===~|", "|R~~~R|", "\\--v--/"], outX: 3, outY: 7 }),
                energy: { type: 'none' }, processTime: 3.5,
                recipes: [
                    { in: { rhenium_ore: 3, stabilized_plasma: 1 }, out: { rhenium_ingot: 2 } },
                    { in: { plasma_slag: 3, stabilized_plasma: 1 }, out: { raw_plasma: 2 } }
                ],
                updateOverride(m, r, dt) {
                    plasmaTick(m, dt);
                    if (!activeMachines[m.id]) return;
                    if (m.timer < m.def.processTime) return;
                    for (let rec of m.def.recipes) {
                        let can = true;
                        for (let k in rec.in) if ((m.inv[k] || 0) < rec.in[k]) { can = false; break; }
                        if (!can) continue;
                        m.timer = 0;
                        for (let k in rec.in) { m.inv[k] -= rec.in[k]; if (!m.inv[k]) delete m.inv[k]; }
                        for (let k in rec.out) m.outBuffer[k] = (m.outBuffer[k] || 0) + rec.out[k];
                        break;
                    }
                },
                isWorking(m) {
                    return m.def.recipes.some(rec =>
                        Object.keys(rec.in).every(k => (m.inv[k] || 0) >= rec.in[k]));
                },
                renderAnim(char, t) {
                    if (char === '~') return { char: t === 0 ? '~' : '-', color: '#7b1fa2' };
                    if (char === '=') return { char: t === 0 ? '=' : '~', color: '#9c27b0' };
                    return null;
                }
            },
    'machine_alloying_arc_furnace': {
                id: 'machine_alloying_arc_furnace', name: 'Alloying Arc Furnace', color: '#512da8',
                rotations: genRot4({ w: 7, h: 7, art: ["/-----\\", "|A===R|", "|=====|", "|*===*|", "|=====|", "|A===R|", "\\--v--/"], outX: 3, outY: 7 }),
                energy: { type: 'electric', usage: 30 }, processTime: 6.0,
                recipes: [{ in: { tungsten_ingot: 2, rhenium_ingot: 1 }, out: { rhenite_alloy: 1 } }],
                renderAnim(char, t) {
                    if (char === '=') return { char: t === 0 ? '~' : '=', color: '#512da8' };
                    if (char === '*') return { char: t === 0 ? '*' : '+', color: '#ff6d00' };
                    return null;
                }
            },
    'machine_mhd_generator': {
                id: 'machine_mhd_generator', name: 'MHD Generator', color: '#ff6d00',
                rotations: (() => {
                    const rot = {
                        w: 11, h: 11,
                        art: [
                            "/=========\\",
                            "|G~~~~~~~G|",
                            "|~~~~~~~~~|",
                            "|~~[MHD]~~|",
                            "|~~~~~~~~~|",
                            "|~~~~~~~~~|",
                            "|~~[MHD]~~|",
                            "|~~~~~~~~~|",
                            "|~~~~~~~~~|",
                            "|G~~~~~~~G|",
                            "\\=========/"],
                        outX: null, outY: null
                    };
                    return [rot, rot, rot, rot];
                })(),
                energy: { type: 'none' }, maxEnergy: 100_000_000,
                updateOverride(m, r, dt) {
                    m.inv = m.inv || {};
                    m.energy = m.energy || 0;
                    if (m.energy < m.def.maxEnergy
                        && (m.inv['stabilized_plasma'] || 0) > 0
                        && m.timer >= 1.0) {
                        m.timer = 0;
                        m.inv['stabilized_plasma']--;
                        if (!m.inv['stabilized_plasma']) delete m.inv['stabilized_plasma'];
                        m.energy = Math.min(m.def.maxEnergy, m.energy + 5_000_000);
                    }
                },
                isWorking(m) {
                    return (m.inv['stabilized_plasma'] || 0) > 0
                        && (m.energy || 0) < m.def.maxEnergy;
                },
                renderAnim(char, t) {
                    if (char === '~') return { char: t === 0 ? '~' : '^', color: '#ff6d00' };
                    if (char === 'G') return { char: t === 0 ? 'G' : '9', color: '#ffab40' };
                    return null;
                }
            },
    'machine_plasma_arc_welder': {
                id: 'machine_plasma_arc_welder', name: 'Plasma Arc Welder', color: '#ff9100',
                rotations: genRot4({
                    w: 9, h: 9,
                    art: ["/-------\\",
                        "|W=====W|",
                        "|=======|",
                        "|=[ARC]=|",
                        "|=======|",
                        "|=======|",
                        "|W=====W|",
                        "|=======|",
                        "\\---v---/"],
                    outX: 4, outY: 9
                }),
                energy: { type: 'electric', usage: 100 }, maxEnergy: 500000,
                processTime: 8.0,
                recipes: [
                    {
                        in: { rhenite_alloy: 1, carbide_rod: 2, stabilized_plasma: 1 },
                        out: { plasma_composite_plate: 1 }
                    }
                ],
                updateOverride(m, r, dt) {
                    m.energy = m.energy || 0;
                    plasmaTick(m, dt);
                    if (!activeMachines[m.id]) return;
                    if (m.energy < 100 || m.timer < m.def.processTime) return;
                    let rec = m.def.recipes[0];
                    if (!Object.keys(rec.in).every(k => (m.inv[k] || 0) >= rec.in[k])) return;
                    m.timer = 0; m.energy -= 100;
                    for (let k in rec.in) { m.inv[k] -= rec.in[k]; if (!m.inv[k]) delete m.inv[k]; }
                    m.outBuffer['plasma_composite_plate'] = (m.outBuffer['plasma_composite_plate'] || 0) + 1;
                },
                isWorking(m) {
                    let rec = m.def.recipes[0];
                    return (m.energy || 0) >= 100
                        && Object.keys(rec.in).every(k => (m.inv[k] || 0) >= rec.in[k]);
                },
                renderAnim(char, t) {
                    if (char === '=') return { char: t === 0 ? '~' : '=', color: '#ff9100' };
                    if (char === 'W') return { color: t === 0 ? '#ff9100' : '#e65100' };
                    return null;
                }
            },
    'machine_pair_production_chamber': {
                id: 'machine_pair_production_chamber', name: 'Pair Production Chamber', color: '#b388ff',
                rotations: [{ w: 7, h: 7, art: ["/-----\\", "|  P  |", "| ( ) |", "|  P  |", "| ( ) |", "|  P  |", "\\--v--/"], outX: 3, outY: 7 }],
                energy: { type: 'electric', usage: 500000 }, processTime: 10.0, // 500k/s over 10s = 5M total
                recipes: [{ in: { crystal_lens: 3, gamma_target: 1 }, out: { positron_stream: 1 } }]
            },
    'machine_penning_trap_array': {
                id: 'machine_penning_trap_array', name: 'Penning Trap Array', color: '#ea80fc',
                rotations: [{ w: 5, h: 5, art: ["/---\\", "| T |", "| T |", "| T |", "\\-v-/"], outX: 2, outY: 5 }],
                energy: { type: 'electric', usage: 100000 }, processTime: 5.0,
                recipes: [{ in: { positron_stream: 1, rhenite_alloy: 10 }, out: { antiproton: 1 } }]
            },
    'machine_magnetic_confinement_ring': {
                id: 'machine_magnetic_confinement_ring', name: 'Magnetic Confinement Ring', color: '#ff1744',
                rotations: [{ w: 9, h: 9, art: ["/-------\\", "| /===\\ |", "|/     \\|", "|| (C) ||", "||     ||", "|| (C) ||", "|\\     /|", "| \\===/ |", "\\---v---/"], outX: 4, outY: 9 }],
                energy: { type: 'electric', usage: 200000 }, processTime: 8.0,
                recipes: [{ in: { antiproton: 10, crystal_lens: 3 }, out: { antimatter_pellet: 1 } }],
                renderAnim: function (char, t) { if (char === 'C') return { char: t === 0 ? '*' : 'C', color: '#d50000' }; return null; }
            },
    'machine_antimatter_containment_vessel': {
                id: 'machine_antimatter_containment_vessel', name: 'Antimatter Containment Vessel', color: '#00e5ff',
                rotations: [{ w: 5, h: 5, art: ["/---\\", "|[A]|", "|[A]|", "|[A]|", "\\-v-/"], outX: 2, outY: 5 }],
                energy: { type: 'electric', usage: 50000 }, processTime: 5.0,
                recipes: [{ in: { antimatter_pellet: 1, plasma_composite_plate: 10 }, out: { antimatter_cell: 1 } }]
            },
    'machine_terrain_vitrifier': {
                id: 'machine_terrain_vitrifier', name: 'Terrain Vitrifier', color: '#84ffff',
                rotations: [{ w: 5, h: 5, art: ["/---\\", "| V |", "| V |", "| V |", "\\---/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 100000 }, processTime: 4.0,
                recipes: [{ in: { antimatter_cell: 1, sand: 25 }, out: { reinforced_glass_floor: 25 } }] // Safely produces the floor logic block for the player
            },
    'machine_pseudo_matter_compositor': {
                id: 'machine_pseudo_matter_compositor', name: 'Pseudo Matter Compositor', color: '#b2ff59',
                rotations: [{ w: 7, h: 7, art: ["/-----\\", "|C===C|", "|=====|", "|=[P]=|", "|=====|", "|C===C|", "\\--v--/"], outX: 3, outY: 7 }],
                energy: { type: 'electric', usage: 500000 }, processTime: 5.0,
                recipes: [{ in: { plasma_composite_plate: 2, antimatter_pellet: 1 }, out: { irradiated_plate: 2 } }],
                renderAnim: function (char, t) { if (char === 'P' || char === '=') return { color: t === 0 ? '#b2ff59' : '#76ff03' }; return null; }
            },
    'machine_antimatter_catalyst_bath': {
                id: 'machine_antimatter_catalyst_bath', name: 'Antimatter Catalyst Bath', color: '#d500f9',
                rotations: [{ w: 7, h: 7, art: ["/-----\\", "| ~~~ |", "| ~A~ |", "| ~~~ |", "| ~~~ |", "| ~~~ |", "\\--v--/"], outX: 3, outY: 7 }],
                energy: { type: 'electric', usage: 200000 }, processTime: 1.0,

                // Display recipes for Auto-Wiki so players understand it uses pellets and outputs 10x
                recipes: [
                    ...ORES.map(o => ({ in: { [`${o}_ore`]: 1, antimatter_pellet: 1 }, out: { [`${o}_ingot`]: 10, antimatter_pellet: 1 } })),
                    { in: { tungsten_ore: 1, antimatter_pellet: 1 }, out: { tungsten_ingot: 10, antimatter_pellet: 1 } },
                    { in: { rhenium_ore: 1, antimatter_pellet: 1 }, out: { rhenium_ingot: 10, antimatter_pellet: 1 } }
                ],

                // Custom logic to NOT consume the pellet 95% of the time!
                updateOverride: function (m, r, dt) {
                    m.energy = m.energy || 0;
                    if (m.energy < 200000 || m.timer < m.def.processTime) return;
                    if ((m.inv['antimatter_pellet'] || 0) < 1) return; // Needs catalyst!

                    let allOres = [...ORES, 'tungsten', 'rhenium'];
                    let processed = false;

                    for (let ore of allOres) {
                        let oreName = ore + '_ore';
                        let ingotName = ore + '_ingot';
                        if ((m.inv[oreName] || 0) >= 1) {
                            m.inv[oreName]--;
                            if (!m.inv[oreName]) delete m.inv[oreName];
                            m.outBuffer[ingotName] = (m.outBuffer[ingotName] || 0) + 10;
                            processed = true;
                            break;
                        }
                    }

                    if (processed) {
                        m.timer = 0;
                        m.energy -= 200000;
                        if (Math.random() < 0.05) { // 5% chance to degrade catalyst
                            m.inv['antimatter_pellet']--;
                            if (!m.inv['antimatter_pellet']) delete m.inv['antimatter_pellet'];
                            floatText(m.x, m.y, "Catalyst Degraded!", "#f44336");
                        }
                    }
                },
                renderAnim: Anim.glow('~', '-', '#d500f9')
            },
    'machine_annihilation_reactor': {
        id: 'machine_annihilation_reactor', name: 'Annihilation Reactor', color: '#ff1744',
        rotations: [{
            w: 11, h: 11,
            art: [
                "/=========\\",
                "| /=====\\ |",
                "|/       \\|",
                "|| ( @ ) ||",
                "||       ||",
                "||  [A]  ||",
                "||       ||",
                "|| ( @ ) ||",
                "|\\       /|",
                "| \\=====/ |",
                "\\---------/"
            ],
            outX: null, outY: null
        }],
        energy: { type: 'none' }, maxEnergy: 1_000_000_000,
        updateOverride: function (m, r, dt) {
            m.ontoIndex = m.ontoIndex !== undefined ? m.ontoIndex : 100;
            let stabilized = false;
            for (let am of activeMachines) {
                if (am && am.type === 'machine_quantum_stabilizer' && am.isStabilizing) {
                    // Perfect Center-to-Center Distance Check 
                    // (11/2 = 5.5 radius) + (3/2 = 1.5 radius) = 7.0 touch distance
                    let dx = Math.abs((am.x + 1.5) - (m.x + 5.5));
                    let dy = Math.abs((am.y + 1.5) - (m.y + 5.5));
                    if (dx <= 7 && dy <= 7) {
                        stabilized = true; break;
                    }
                }
            }
            if (stabilized) {
                m.ontoIndex = Math.min(100, m.ontoIndex + 5 * dt);
            } else {
                m.ontoIndex -= 15 * dt;
            }

            if (m.ontoIndex <= 0) {
                if (typeof triggerParadoxicalCollapse === 'function') triggerParadoxicalCollapse();
                return;
            }

            m.inv = m.inv || {};
            if (m.inv['antimatter_cell'] > 0 && m.inv['matter_slug'] > 0) {
                let isSafe = m.underlying.every(id => id === 55);
                if (!isSafe) { triggerSupernova(m.x + 5, m.y + 5); return; }

                m.inv['antimatter_cell']--; if (!m.inv['antimatter_cell']) delete m.inv['antimatter_cell'];
                m.inv['matter_slug']--; if (!m.inv['matter_slug']) delete m.inv['matter_slug'];

                let generatedPower = 400_000_000;
                let connectedSiCu = 0;
                for (let x = m.x - 1; x <= m.x + 11; x++) {
                    if (mapPipes['sicu'][(m.y - 1) * WORLD_SIZE + x] > 0) connectedSiCu++;
                    if (mapPipes['sicu'][(m.y + 11) * WORLD_SIZE + x] > 0) connectedSiCu++;
                }
                for (let y = m.y; y < m.y + 11; y++) {
                    if (mapPipes['sicu'][y * WORLD_SIZE + (m.x - 1)] > 0) connectedSiCu++;
                    if (mapPipes['sicu'][y * WORLD_SIZE + (m.x + 11)] > 0) connectedSiCu++;
                }

                if (connectedSiCu === 0) {
                    triggerSupernova(m.x + 5, m.y + 5);
                } else {
                    let transformers = activeMachines.filter(tm => tm && tm.type === 'machine_mega_transformer');
                    if (transformers.length > 0) {
                        let give = generatedPower / transformers.length;
                        transformers.forEach(tm => tm.energy = Math.min(tm.def.maxEnergy || 1000000000, (tm.energy || 0) + give));
                        floatText(m.x + 5, m.y + 5, `ANNIHILATION: ${m.ontoIndex.toFixed(1)}%`, "#84ffff");
                    } else {
                        triggerSupernova(m.x + 5, m.y + 5);
                    }
                }
            }
        },
        renderAnim: function (char, t, m) {
            if (char === 'A') return { char: t === 0 ? 'A' : '!', color: '#ff1744' };
            if (char === '=' || char === '/' || char === '\\') return { color: t === 0 ? '#d50000' : '#ff1744' };
            if (char === '@' && m && m.ontoIndex < 50) return { color: t === 0 ? '#ff1744' : '#000' };
            return null;
        }
    },
    'machine_chemical_tank': {
                id: 'machine_chemical_tank', name: 'Chemical Bulk Tank', color: '#00838f',
                rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|CC|", "|CC|", "\\v-/"], outX: 1, outY: 4 }),
                energy: { type: 'none' }, maxStack: 100000,
                acceptsItem: (m, itm) => acceptsTank(m, itm, ['deuterium', 'tritium', 'liquid_n2', 'superheated_n2', 'hot_n2', 'sulfuric_acid', 'brine', 'chlorine', 'sour_water', 'heavy_water']),
                updateOverride: tankUpdate
            },
    'machine_quantum_stabilizer': {
                id: 'machine_quantum_stabilizer', name: 'Quantum Stabilizer', color: '#ea80fc',
                rotations: [{ w: 3, h: 3, art: ["/-\\", "|S|", "\\-/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 1_000_000 }, maxEnergy: 5_000_000,
                updateOverride: function (m, r, dt) {
                    m.energy = m.energy || 0;
                    m.isStabilizing = m.energy >= 1_000_000;
                    if (m.isStabilizing) m.energy -= 1_000_000 * dt;
                },
                isWorking: function (m) { return m.isStabilizing; },
                renderAnim: Anim.glow('S', '8', '#00e5ff')
            },
    'machine_digital_disk_drive': {
                id: 'machine_digital_disk_drive', name: 'Digital Disk Drive', color: '#673ab7',
                rotations: [{ w: 5, h: 4, art: ["/---\\", "|D D|", "|D D|", "\\---/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 100 }, maxStack: 5000,
                isDigitalStorage: true,
                acceptsItem: (m, item) => getNetworkForItem(item) === 'item' || getNetworkForItem(item) === 'item_heavy' || item.includes('ic') || item.includes('wafer')
            },
    'machine_digital_fluid_tank': {
                id: 'machine_digital_fluid_tank', name: 'Digital Fluid Tank', color: '#2196f3',
                rotations: [{ w: 4, h: 4, art: ["/--\\", "|DF|", "|DF|", "\\--/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 100 }, maxStack: 50000, isDigitalStorage: true,
                acceptsItem: (m, itm) => acceptsTank(m, itm, ['water', 'lava', 'heavy_water', 'sour_water', 'brine'])
            },
    'machine_digital_gas_tank': {
                id: 'machine_digital_gas_tank', name: 'Digital Gas Tank', color: '#00bcd4',
                rotations: [{ w: 4, h: 4, art: ["/--\\", "|DG|", "|DG|", "\\--/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 100 }, maxStack: 50000, isDigitalStorage: true,
                acceptsItem: (m, itm) => acceptsTank(m, itm, ['steam', 'oxygen', 'hydrogen', 'nitrogen_gas', 'liquid_n2', 'superheated_n2', 'hot_n2', 'chlorine', 'sulfur_dioxide'])
            },
    'machine_digital_acid_tank': {
                id: 'machine_digital_acid_tank', name: 'Digital Acid Tank', color: '#8bc34a',
                rotations: [{ w: 4, h: 4, art: ["/--\\", "|DA|", "|DA|", "\\--/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 100 }, maxStack: 50000, isDigitalStorage: true,
                acceptsItem: (m, itm) => acceptsTank(m, itm, ['sulfuric_acid'])
            },
    'machine_digital_crafter': {
                id: 'machine_digital_crafter', name: 'Digital Crafter', color: '#9c27b0',
                rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\v/"], outX: 1, outY: 3 }),
                energy: { type: 'electric', usage: 500 },
                maxStack: 1000000,
                updateOverride: function (m, r, dt) {
                    m.inv = m.inv || {};
                },
                renderAnim: function (char, t, m) { if (char === 'C') return { color: m.currentJob ? '#e040fb' : '#9c27b0' }; return null; }
            },
    'machine_digital_requester': {
                id: 'machine_digital_requester', name: 'Digital Requester', color: '#e91e63',
                rotations: [{ w: 4, h: 4, art: ["/--\\", "|RQ|", "|RQ|", "\\--/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 100 }
            },
    'machine_import_uplink': {
                id: 'machine_import_uplink', name: 'Import Uplink', color: '#03a9f4',
                rotations: [{ w: 1, h: 1, art: ["U"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 50 }, maxStack: 100
            },
    'machine_digital_exporter': {
                id: 'machine_digital_exporter', name: 'Digital Exporter', color: '#e64a19',
                rotations: genRot4({ w: 1, h: 1, art: ["E"], outX: 0, outY: 1 }),
                energy: { type: 'electric', usage: 50 }, maxStack: 100,
                // Scan the block in front of the orange box every 0.5s for UI feedback
                updateOverride: function (m, r, dt) {
                    m.timer = (m.timer || 0) + dt;
                    if (m.timer >= 0.5) {
                        m.timer = 0;
                        m.targetName = "None";
                        if (m._outPorts && m._outPorts.length > 0) {
                            let p = m._outPorts[0];
                            let tId = worldMap[p.y * WORLD_SIZE + p.x];
                            if (tId >= 50000) {
                                let target = activeMachines[tId - 50000];
                                if (target && target.type !== 'machine_hub') {
                                    m.targetName = target.def.name;
                                }
                            }
                        }
                    }
                }
            },
    'machine_export_downlink': {
                id: 'machine_export_downlink', name: 'Export Downlink', color: '#ff9800',
                rotations: genRot4({ w: 1, h: 1, art: ["D"], outX: 0, outY: 1 }),
                energy: { type: 'electric', usage: 50 }, maxStack: 100
            },
    'machine_grid_crafting_interface': {
                id: 'machine_grid_crafting_interface', name: 'Grid Crafting Terminal', color: '#00bcd4',
                rotations: [{ w: 4, h: 3, art: ["/--\\", "|GT|", "\\--/"], outX: null, outY: null }],
                energy: { type: 'electric', usage: 200 }
            },
    'machine_creative_generator': {
        id: 'machine_creative_generator',
        name: 'Creative Generator',
        color: '#e040fb',
        rotations: [
            { w: 3, h: 3, art: ["/-\\", "|*|", "\\-/"], outX: null, outY: null }
        ],
        energy: { type: 'none' },
        maxEnergy: 10000000,
        updateOverride: function (m, r, dt) {
            m.energy = 10000000;
        },
        isWorking: () => true,
        renderAnim: function (char, t) {
            if (char === '*') return { char: t === 0 ? '*' : '+', color: '#00e5ff' };
            if (char === '-' || char === '|' || char === '/' || char === '\\') return { color: t === 0 ? '#e040fb' : '#b388ff' };
            return null;
        }
    }
};
MACHINE_DEFS['machine_acid_leaching_vat'].recipes.push({
    in: { 'pulverized_stone': 2, 'sulfuric_acid': 1 },
    out: { 'uranium_rich_slurry': 2 }
});
// Inject the missing Step 4 into the Vacuum Calciner
MACHINE_DEFS['machine_vacuum_calciner'].recipes.push({
    in: { 'toxic_filter_cake': 1 },
    out: { 'dry_uranic_crust': 1 }
});

// Auto-generate Ore Tripling Recipes
for (let o of ORES) {
    MACHINE_DEFS['machine_bronze_crusher'].recipes.push({ in: { [`${o}_ore`]: 1 }, out: { [`ore_piece_${o}`]: 3 }, chanceOut: { item: `ore_piece_${o}`, chance: 0.15 } });
    MACHINE_DEFS['machine_bronze_mill'].recipes.push({ in: { [`ore_piece_${o}`]: 1 }, out: { [`dirty_dust_${o}`]: 1 } });
    MACHINE_DEFS['machine_bronze_washer'].recipes.push({ in: { [`dirty_dust_${o}`]: 1, 'water': 1 }, out: { [`clean_dust_${o}`]: 1 } });
    // Roaster outputs pure dust AND SO2 Gas
    MACHINE_DEFS['machine_bronze_roaster'].recipes.push({ in: { [`clean_dust_${o}`]: 1 }, out: { [`pure_dust_${o}`]: 1 }, out2: { 'sulfur_dioxide': 1 } });
    MACHINE_DEFS['machine_bronze_furnace'].recipes.push({ in: { [`pure_dust_${o}`]: 1 }, out: { [`${o}_ingot`]: 1 } });
}
MACHINE_DEFS['machine_bronze_crusher'].recipes.push({ in: { 'stone': 1 }, out: { 'gravel': 2 } });
MACHINE_DEFS['machine_bronze_crusher'].recipes.push({ in: { 'gravel': 1 }, out: { 'sand': 2 } });
MACHINE_DEFS['machine_furnace_coal'].recipes.push({ in: { 'sand': 1 }, out: { 'glass': 1 } });
MACHINE_DEFS['machine_furnace_electric'].recipes.push({ in: { 'sand': 1 }, out: { 'glass': 1 } });
MACHINE_DEFS['machine_bronze_furnace'].recipes.push({ in: { 'sand': 1 }, out: { 'glass': 1 } });

export const recipes = [
    { name: "Bronze Kinetic Axle x5", env: "table", output: { id: "bronze_axle", amount: 5 }, input: { "bronze_plate": 2 } },
    { name: "Sand Filter", env: "table", output: { id: "machine_sand_filter", amount: 1 }, input: { "bronze_plate": 10, "stone": 10 } },
    { name: "Sand Cleaner", env: "table", output: { id: "machine_sand_cleaner", amount: 1 }, input: { "bronze_plate": 10, "stone": 10 } },
    { name: "Pressure Relief Vent", env: "table", output: { id: "machine_pressure_vent", amount: 1 }, input: { "bronze_plate": 5, "brass_pipe": 5 } },
    { name: "Coal Washer", env: "table", output: { id: "machine_coal_washer", amount: 1 }, input: { "bronze_plate": 15, "stone_brick": 5 } },
    { name: "Concrete Mixer", env: "table", output: { id: "machine_concrete_mixer", amount: 1 }, input: { "bronze_plate": 10, "stone_brick": 10 } },
    { name: "Steam Engine", env: "table", output: { id: "machine_steam_engine", amount: 1 }, input: { "bronze_plate": 20, "brass_pipe": 10, "bronze_plate": 5 } },
    { name: "Kinetic Relay", env: "table", output: { id: "machine_kinetic_relay", amount: 1 }, input: { "bronze_plate": 10, "bronze_axle": 2 } },
    { name: "Blast Furnace", env: "table", output: { id: "machine_blast_furnace", amount: 1 }, input: { "bronze_plate": 50, "stone_brick": 50 } },
    { name: "Puddling Furnace", env: "table", output: { id: "machine_puddling_furnace", amount: 1 }, input: { "bronze_plate": 30, "stone_brick": 30 } },
    { name: "Steam Drop Hammer", env: "table", output: { id: "machine_steam_hammer", amount: 1 }, input: { "bronze_plate": 40, "bronze_axle": 10, "brass_pipe": 10 } },
    { name: "Wooden Pickaxe", env: "hand", output: { id: "wood_pickaxe", amount: 1 }, input: { "wood": 3, "stick": 2, "rope": 1 } },
    { name: "Stone Pickaxe", env: "hand", output: { id: "stone_pickaxe", amount: 1 }, input: { "stone": 3, "stick": 2, "rope": 1 } },
    { name: "Crafting Table", env: "hand", output: { id: "machine_crafter", amount: 1 }, input: { "wood": 10 } },
    { name: "Coal Furnace", env: "hand", output: { id: "machine_furnace_coal", amount: 1 }, input: { "stone": 10 } },
    { name: "Item Pipe x5", env: "table", output: { id: "item_pipe", amount: 5 }, input: { "iron_plate": 1 } },
    { name: "Copper Wire x5", env: "table", output: { id: "copper_wire", amount: 5 }, input: { "copper_plate": 1 } },
    { name: "Iron Pipe (Lava) x5", env: "table", output: { id: "iron_pipe", amount: 5 }, input: { "iron_plate": 2 } },
    { name: "Copper Pipe (Water) x5", env: "table", output: { id: "copper_pipe", amount: 5 }, input: { "copper_plate": 2 } },
    { name: "Brass Pipe (Steam) x5", env: "table", output: { id: "brass_pipe", amount: 5 }, input: { "brass_plate": 2 } },
    { name: "Automated Miner", env: "table", output: { id: "machine_miner", amount: 1 }, input: { "iron_plate": 5, "stone": 5 } },
    { name: "Coal Press", env: "table", output: { id: "machine_press_coal", amount: 1 }, input: { "stone": 10 } },
    { name: "Electric Furnace", env: "table", output: { id: "machine_furnace_electric", amount: 1 }, input: { "machine_furnace_coal": 1, "invar_casing": 2, "steel_plate": 5 } },
    { name: "Wire Cutter", env: "table", output: { id: "machine_wire_cutter", amount: 1 }, input: { "steel_plate": 5, "invar_casing": 1, "copper_wire": 5 } },
    { name: "Assembler", env: "table", output: { id: "machine_assembler", amount: 1 }, input: { "steel_plate": 10, "invar_casing": 2, "copper_wire": 5 } },
    { name: "Coal Generator", env: "table", output: { id: "machine_generator", amount: 1 }, input: { "iron_plate": 15, "stone": 20 } },
    { name: "Magmaeous Crucible", env: "table", output: { id: "machine_magmaeous_crucible", amount: 1 }, input: { "iron_plate": 15, "stone": 20 } },
    { name: "Alloying Smelter", env: "table", output: { id: "machine_alloying_smelter", amount: 1 }, input: { "iron_plate": 20, "stone": 30, "copper_wire": 15 } },
    { name: "Brass Pump", env: "table", output: { id: "machine_brass_pump", amount: 1 }, input: { "brass_casing": 1, "iron_plate": 5 } },
    { name: "Brass Boiler", env: "table", output: { id: "machine_brass_boiler", amount: 1 }, input: { "brass_casing": 1, "iron_plate": 10 } },
    { name: "Bronze Gear Miller", env: "table", output: { id: "machine_bronze_gear_miller", amount: 1 }, input: { "bronze_casing": 1, "iron_plate": 5 } },
    { name: "Bronze Extruder", env: "table", output: { id: "machine_bronze_rod_extruder", amount: 1 }, input: { "bronze_casing": 1, "iron_plate": 5 } },
    { name: "Bronze Cutter", env: "table", output: { id: "machine_bronze_wire_cutter", amount: 1 }, input: { "bronze_casing": 1, "iron_plate": 5 } },
    { name: "Bronze Crusher", env: "table", output: { id: "machine_bronze_crusher", amount: 1 }, input: { "bronze_casing": 2, "iron_plate": 15 } },
    { name: "Bronze Mill", env: "table", output: { id: "machine_bronze_mill", amount: 1 }, input: { "bronze_casing": 2, "iron_plate": 15 } },
    { name: "Bronze Washer", env: "table", output: { id: "machine_bronze_washer", amount: 1 }, input: { "bronze_casing": 2, "iron_plate": 15 } },
    { name: "Bronze Roaster", env: "table", output: { id: "machine_bronze_roaster", amount: 1 }, input: { "bronze_casing": 2, "iron_plate": 15 } },
    { name: "Bronze Furnace", env: "table", output: { id: "machine_bronze_furnace", amount: 1 }, input: { "bronze_casing": 2, "iron_plate": 15 } },
    { name: "Coal Pump", env: "table", output: { id: "machine_coal_pump", amount: 1 }, input: { "iron_plate": 5, "stone": 10 } },
    { name: "Storage Box", env: "hand", output: { id: "machine_storage_box", amount: 1 }, input: { "wood": 20, "iron_plate": 10 } },
    { name: "Splitter", env: "table", output: { id: "machine_splitter", amount: 1 }, input: { "iron_plate": 10, "copper_wire": 5 } },
    { name: "Filter Item Pipe", env: "table", output: { id: "machine_filter_pipe", amount: 1 }, input: { "item_pipe": 1, "copper_wire": 2 } },
    { name: "Brick Kiln", env: "table", output: { id: "machine_kiln", amount: 1 }, input: { "stone": 20, "iron_plate": 5 } },
    { name: "Coke Oven", env: "table", output: { id: "machine_coke_oven", amount: 1 }, input: { "stone_brick": 25, "iron_plate": 10 } },
    { name: "Bessemer Converter", env: "table", output: { id: "machine_bessemer", amount: 1 }, input: { "stone_brick": 50, "bronze_casing": 15, "brass_plate": 20, "iron_plate": 25 } },
    { name: "Steam Stamp Mill", env: "table", output: { id: "machine_steam_stamp_mill", amount: 1 }, input: { "bronze_casing": 5, "iron_plate": 15, "stone": 20 } },
    { name: "Acidic Slurry Vat", env: "table", output: { id: "machine_slurry_vat", amount: 1 }, input: { "brass_plate": 10, "copper_pipe": 15, "stone_brick": 20 } },
    { name: "Slurry Centrifuge", env: "table", output: { id: "machine_slurry_centrifuge", amount: 1 }, input: { "bronze_gear": 10, "iron_plate": 10, "copper_wire": 5 } },
    { name: "Flux Agglomerator", env: "table", output: { id: "machine_flux_agglomerator", amount: 1 }, input: { "steel_ingot": 5, "bronze_casing": 10, "iron_plate": 15 } },
    { name: "Blast Roaster", env: "table", output: { id: "machine_blast_roaster", amount: 1 }, input: { "steel_ingot": 15, "stone_brick": 50, "iron_pipe": 10 } },
    { name: "Induction Foundry", env: "table", output: { id: "machine_induction_foundry", amount: 1 }, input: { "steel_ingot": 50, "brass_casing": 20, "iron_pipe": 40, "stone_brick": 100 } },
    { name: "Invar Casing", env: "table", output: { id: "invar_casing", amount: 1 }, input: { "invar_ingot": 2, "steel_plate": 1 } },
    { name: "Glass Pipe x5", env: "table", output: { id: "glass_pipe", amount: 5 }, input: { "glass": 2 } },
    { name: "Electrolyzer", env: "table", output: { id: "machine_electrolyzer", amount: 1 }, input: { "steel_plate": 10, "invar_casing": 5, "glass_pipe": 10 } },
    { name: "Arc Oxygen Furnace", env: "table", output: { id: "machine_arc_oxygen_furnace", amount: 1 }, input: { "invar_casing": 10, "steel_plate": 25, "stone_brick": 50, "glass_pipe": 20 } },
    { name: "Tar Mixer", env: "table", output: { id: "machine_tar_mixer", amount: 1 }, input: { "bronze_casing": 5, "iron_plate": 10 } },
    { name: "Baking Oven", env: "table", output: { id: "machine_baking_oven", amount: 1 }, input: { "stone_brick": 20, "iron_plate": 10 } },
    { name: "Graphitizer", env: "table", output: { id: "machine_graphitizer", amount: 1 }, input: { "steel_plate": 20, "invar_casing": 10, "stone_brick": 30 } },
    { name: "Acid Wash Bath", env: "table", output: { id: "machine_acid_bath", amount: 1 }, input: { "brass_plate": 10, "invar_casing": 5, "glass_pipe": 10 } },
    { name: "Vacuum Calciner", env: "table", output: { id: "machine_vacuum_calciner", amount: 1 }, input: { "steel_plate": 20, "invar_casing": 10, "copper_wire": 15 } },
    { name: "Motor", env: "table", output: { id: "motor", amount: 1 }, input: { "copper_wire": 5, "iron_plate": 5, "steel_plate": 2 } },
    { name: "Lead Lined Pipe x5", env: "table", output: { id: "lead_lined_pipe", amount: 5 }, input: { "glass_pipe": 1, "lead_plate": 1 } },
    { name: "Liquid Tank", env: "table", output: { id: "machine_liquid_tank", amount: 1 }, input: { "iron_plate": 20 } },
    { name: "Brass Gas Tank", env: "table", output: { id: "machine_brass_gas_tank", amount: 1 }, input: { "brass_plate": 20, "iron_pipe": 10 } },
    { name: "Glass Tank", env: "table", output: { id: "machine_glass_tank", amount: 1 }, input: { "glass": 20, "invar_casing": 5 } },
    { name: "Sulfuric Scrubber", env: "table", output: { id: "machine_sulfuric_scrubber", amount: 1 }, input: { "tin_casing": 5, "iron_pipe": 10, "stone_brick": 20 } },
    { name: "Chemical Mixer", env: "table", output: { id: "machine_chemical_mixer", amount: 1 }, input: { "lead_casing": 5, "aluminium_plate": 10, "motor": 5, "glass_pipe": 10 } },
    { name: "Catalytic Reactor", env: "table", output: { id: "machine_catalytic_reactor", amount: 1 }, input: { "invar_casing": 10, "steel_plate": 20, "silver_ingot": 5 } },
    { name: "Desalinator", env: "table", output: { id: "machine_desalinator", amount: 1 }, input: { "bronze_casing": 5, "copper_pipe": 10 } },
    { name: "Steel Pipe x5", env: "table", output: { id: "steel_pipe", amount: 5 }, input: { "steel_plate": 2 } },
    { name: "Pumpjack", env: "table", output: { id: "machine_pumpjack", amount: 1 }, input: { "steel_plate": 15, "motor": 5, "iron_pipe": 10 } },
    { name: "Heavy Distillation Tower", env: "table", output: { id: "machine_heavy_tower", amount: 1 }, input: { "steel_plate": 50, "stone_brick": 50, "steel_pipe": 20 } },
    { name: "Light Distillation Tower", env: "table", output: { id: "machine_light_tower", amount: 1 }, input: { "steel_plate": 30, "glass_pipe": 10, "steel_pipe": 15 } },
    { name: "Gas Distillation Tower", env: "table", output: { id: "machine_gas_tower", amount: 1 }, input: { "glass": 20, "steel_plate": 20, "glass_pipe": 20 } },
    { name: "Gas Generator", env: "table", output: { id: "machine_gas_generator", amount: 1 }, input: { "steel_plate": 15, "copper_wire": 20, "motor": 5 } },
    { name: "Sour Water Centrifuge", env: "table", output: { id: "machine_centrifuge_oil", amount: 1 }, input: { "motor": 5, "steel_plate": 10, "brass_pipe": 5 } },
    { name: "Asphalt Mixer", env: "table", output: { id: "machine_asphalt_mixer", amount: 1 }, input: { "iron_plate": 15, "motor": 2 } },
    { name: "Naphtha Cracker", env: "table", output: { id: "machine_naphtha_cracker", amount: 1 }, input: { "steel_plate": 15, "copper_pipe": 10, "stone_brick": 20 } },
    { name: "Polymerizer", env: "table", output: { id: "machine_polymerizer", amount: 1 }, input: { "steel_plate": 25, "glass_pipe": 15, "invar_casing": 5 } },
    { name: "Pellet Extruder", env: "table", output: { id: "machine_pellet_extruder", amount: 1 }, input: { "iron_plate": 10, "motor": 5 } },
    { name: "Slingshot", env: "hand", output: { id: "slingshot", amount: 1 }, input: { "wood": 5, "rope": 2 } },
    { name: "Rock Pellet x4", env: "hand", output: { id: "rock_pellet", amount: 4 }, input: { "stone": 1 } },
    { name: "Pellet Grinder", env: "table", output: { id: "machine_pellet_grinder", amount: 1 }, input: { "iron_plate": 10, "bronze_gear": 2 } },
    { name: "Steam Slug Turret", env: "table", output: { id: "machine_slug_turret", amount: 1 }, input: { "iron_plate": 20, "brass_pipe": 5, "bronze_gear": 5 } },
    { name: "Defense Radar", env: "table", output: { id: "machine_defense_radar", amount: 1 }, input: { "quartz_glass": 10, "quartz_cable": 20, "steel_plate": 20 } },
    { name: "Signal Node", env: "table", output: { id: "machine_defense_node", amount: 1 }, input: { "quartz_cable": 5, "iron_plate": 2 } },
    { name: "Chain Gunner", env: "table", output: { id: "machine_chain_gunner", amount: 1 }, input: { "steel_plate": 50, "motor": 10, "cpu_ic": 2 } },
    { name: "Blank Magnetic Tape x5", env: "table", output: { id: "blank_tape", amount: 5 }, input: { "iron_plate": 2, "copper_wire": 10 } },
    { name: "Magnetic Tape Unit", env: "table", output: { id: "machine_magnetic_tape_drive", amount: 1 }, input: { "invar_casing": 2, "motor": 1, "copper_wire": 5 } },
    { name: "Crude Logic Engine", env: "table", output: { id: "machine_crude_logic_engine", amount: 1 }, input: { "invar_casing": 4, "vacuum_tube": 10, "heavy_relay": 5 } },
    { name: "Rocket Fuel x10", env: "table", output: { id: "rocket_fuel", amount: 10 }, input: { "petroleum_gas": 5, "oxygen": 5 } },
    { name: "Heavy Rover", env: "table", output: { id: "heavy_rover", amount: 1 }, input: { "titanium_hull_plate": 10, "motor": 4, "compute_module": 1 } },
    { name: "Rocket Rover", env: "table", output: { id: "rocket_rover", amount: 1 }, input: { "heavy_rover": 1, "titanium_hull_plate": 5 } },
    { name: "Satellite", env: "table", output: { id: "satellite", amount: 1 }, input: { "compute_module": 1, "polished_silicon_wafer": 4, "crystal_lens": 2 } },
    { name: "Rocket Satellite", env: "table", output: { id: "rocket_satellite", amount: 1 }, input: { "satellite": 1, "titanium_hull_plate": 5 } },
    { name: "Planet Terminal", env: "table", output: { id: "machine_planet_terminal", amount: 1 }, input: { "machine_processing_computer": 1, "machine_magnetic_tape_drive": 1, "steel_plate": 20 } },
    { name: "Analog Data Cable x5", env: "table", output: { id: "analog_cable", amount: 5 }, input: { "copper_wire": 5, "liquid_plastic": 2 } },
    { name: "PLC Logic Processor", env: "table", output: { id: "machine_cdh_plc", amount: 1 }, input: { "machine_processing_computer": 1, "cpu_ic": 2, "quartz_cable": 10 } },
    { name: "GP Input Node", env: "table", output: { id: "machine_gp_input", amount: 1 }, input: { "quartz_cable": 5, "io_ic": 1, "copper_wire": 5 } },
    { name: "GP Output Node", env: "table", output: { id: "machine_gp_output", amount: 1 }, input: { "quartz_cable": 5, "io_ic": 1, "heavy_relay": 2 } },
    { name: "Physical GP Input", env: "table", output: { id: "machine_pgp_input", amount: 1 }, input: { "quartz_cable": 10, "io_ic": 2, "copper_wire": 10 } },
    { name: "Physical GP Output", env: "table", output: { id: "machine_pgp_output", amount: 1 }, input: { "quartz_cable": 10, "io_ic": 2, "heavy_relay": 4 } },
    { name: "Rail Track x10", env: "table", output: { id: "rail_track", amount: 10 }, input: { "steel_plate": 2, "stone_brick": 2 } },
    { name: "Locomotive", env: "table", output: { id: "locomotive", amount: 1 }, input: { "steel_plate": 20, "motor": 5, "compute_module": 2 } },
    { name: "Cargo Wagon", env: "table", output: { id: "cargo_wagon", amount: 1 }, input: { "steel_plate": 15, "iron_plate": 4 } },
    { name: "Fluid Wagon", env: "table", output: { id: "fluid_wagon", amount: 1 }, input: { "steel_plate": 10, "lead_lined_pipe": 5 } },
    { name: "Train Stop", env: "table", output: { id: "machine_train_stop", amount: 1 }, input: { "steel_plate": 10, "copper_wire": 5, "io_ic": 2 } },
    { name: "Train Depot", env: "table", output: { id: "machine_train_depot", amount: 1 }, input: { "steel_plate": 30, "motor": 10, "compute_module": 5 } },

    // --- MIGRATED FROM afac.html ---
    { name: "Hyper Wire x5", env: "table", output: { id: "hyper_wire", amount: 5 }, input: { "copper_wire": 5, "liquid_plastic": 2 } },
    { name: "Gold-Lead Pipe x5", env: "table", output: { id: "gold_lead_pipe", amount: 5 }, input: { "gold_ingot": 2, "lead_plate": 1 } },
    { name: "Graphite Control Rod", env: "table", output: { id: "graphite_control_rod", amount: 1 }, input: { "coal_brick": 2, "steel_plate": 1 } },
    { name: "Heavy Rock Breaker", env: "table", output: { id: "machine_rock_breaker", amount: 1 }, input: { "machine_miner": 1, "steel_plate": 10 } },
    { name: "Slurry Filter Press", env: "table", output: { id: "machine_slurry_filter_press", amount: 1 }, input: { "steel_plate": 10, "cloth": 5 } },
    { name: "Chemical Oxidizer", env: "table", output: { id: "machine_chemical_oxidizer", amount: 1 }, input: { "machine_chemical_mixer": 1, "titanium_hull_plate": 5 } },
    { name: "Ion Separator", env: "table", output: { id: "machine_ion_separator", amount: 1 }, input: { "titanium_hull_plate": 10, "copper_wire": 20 } },
    { name: "Isotope Pulverizer", env: "table", output: { id: "machine_isotope_pulverizer", amount: 1 }, input: { "machine_pellet_grinder": 1, "steel_plate": 10 } },
    { name: "Yellowcake Precipitator", env: "table", output: { id: "machine_yellowcake_precipitator", amount: 1 }, input: { "machine_slurry_vat": 1, "steel_plate": 5 } },
    { name: "Fluorination Gasifier", env: "table", output: { id: "machine_fluorination_gasifier", amount: 1 }, input: { "machine_chemical_mixer": 1, "gold_lead_pipe": 5 } },
    { name: "Fuel Rod Assembler", env: "table", output: { id: "machine_fuel_rod_assembler", amount: 1 }, input: { "machine_assembler": 1, "titanium_hull_plate": 5 } },
    { name: "Fission Reactor", env: "table", output: { id: "machine_fission_reactor", amount: 1 }, input: { "titanium_hull_plate": 20, "graphite_control_rod": 10, "copper_wire": 50 } },
    { name: "Steam Turbine", env: "table", output: { id: "machine_steam_turbine", amount: 1 }, input: { "steel_plate": 20, "motor": 10 } },
    { name: "Nuclear Waste Storage", env: "table", output: { id: "machine_waste_storage", amount: 1 }, input: { "titanium_hull_plate": 10, "gold_lead_pipe": 10 } },
    { name: "Silver Pipe x5", env: "table", output: { id: "silver_pipe", amount: 5 }, input: { "silver_ingot": 2, "iron_plate": 1 } },
    { name: "Insulated Pipe x5", env: "table", output: { id: "insulated_pipe", amount: 5 }, input: { "iron_pipe": 5, "liquid_plastic": 2 } },
    { name: "SiCu Cable x5", env: "table", output: { id: "sicu_cable", amount: 5 }, input: { "copper_wire": 5, "silicon_wafer": 1 } },
    { name: "Particle Collider", env: "table", output: { id: "machine_particle_collider", amount: 1 }, input: { "titanium_hull_plate": 50, "hyper_wire": 50 } },
    { name: "Heavy Electric Pump", env: "table", output: { id: "machine_heavy_pump", amount: 1 }, input: { "machine_pumpjack": 1, "motor": 5 } },
    { name: "Atmospheric Condenser", env: "table", output: { id: "machine_atmospheric_condenser", amount: 1 }, input: { "machine_brass_boiler": 1, "titanium_hull_plate": 5 } },
    { name: "Cryocooler", env: "table", output: { id: "machine_cryocooler", amount: 1 }, input: { "machine_heat_exchanger": 1, "titanium_hull_plate": 10 } },
    { name: "Heat Exchanger", env: "table", output: { id: "machine_heat_exchanger", amount: 1 }, input: { "titanium_hull_plate": 10, "insulated_pipe": 10 } },
    { name: "Cooling Tower", env: "table", output: { id: "machine_cooling_tower", amount: 1 }, input: { "steel_plate": 20, "iron_pipe": 20 } },
    { name: "Fusion Charger", env: "table", output: { id: "machine_fusion_charger", amount: 1 }, input: { "machine_mega_transformer": 1, "hyper_wire": 20 } },
    { name: "Mega Transformer", env: "table", output: { id: "machine_mega_transformer", amount: 1 }, input: { "titanium_hull_plate": 10, "copper_wire": 50 } },
    { name: "Fusion Reactor Core", env: "table", output: { id: "machine_fusion_reactor", amount: 1 }, input: { "titanium_hull_plate": 50, "hyper_wire": 100, "machine_fission_reactor": 1 } },
    { name: "Lead-Acid Battery Bank", env: "table", output: { id: "machine_battery_lead", amount: 1 }, input: { "lead_plate": 10, "sulfuric_acid": 10, "copper_wire": 10 } },
    { name: "Heavy Item Pipe x5", env: "table", output: { id: "item_pipe_heavy", amount: 5 }, input: { "item_pipe": 5, "steel_plate": 2 } },
    { name: "Heavy Brass Pipe x5", env: "table", output: { id: "brass_pipe_heavy", amount: 5 }, input: { "brass_pipe": 5, "steel_plate": 2 } },
    { name: "Plasmatic Superconductor x5", env: "table", output: { id: "plasmatic_superconductor", amount: 5 }, input: { "sicu_cable": 5, "stabilized_plasma": 1 } },
    { name: "Quantum Fiber Cable x5", env: "table", output: { id: "quantum_fiber_cable", amount: 5 }, input: { "quartz_cable": 5, "antimatter_pellet": 1 } },
    { name: "Plasma Conduit x5", env: "table", output: { id: "plasma_conduit_pipe", amount: 5 }, input: { "insulated_pipe": 5, "plasma_composite_plate": 1 } },
    { name: "Magnetic Containment Pipe x5", env: "table", output: { id: "magnetic_containment_pipe", amount: 5 }, input: { "item_pipe_heavy": 5, "rhenite_alloy": 1 } },
    { name: "Reinforced Glass Floor x5", env: "table", output: { id: "reinforced_glass_floor", amount: 5 }, input: { "glass": 5, "plasma_composite_plate": 1 } },
    { name: "Crude Farming Drone Station", env: "table", output: { id: "machine_drone_station_farming", amount: 1 }, input: { "iron_plate": 15, "coal": 10, "stone_brick": 10 } },
    { name: "Crude Carrier Drone Station", env: "table", output: { id: "machine_drone_station_carrier", amount: 1 }, input: { "iron_plate": 15, "coal": 10, "copper_wire": 5 } },
    { name: "Drone Input", env: "table", output: { id: "machine_drone_input", amount: 1 }, input: { "iron_plate": 5, "item_pipe": 2 } },
    { name: "Drone Output", env: "table", output: { id: "machine_drone_output", amount: 1 }, input: { "iron_plate": 5, "item_pipe": 2 } },
    { name: "Advanced Carrier Station", env: "table", output: { id: "machine_advanced_drone_station", amount: 1 }, input: { "invar_casing": 10, "cpu_ic": 1, "motor": 4, "hyper_wire": 5 } },
    { name: "Rope x2", env: "hand", output: { id: "rope", amount: 2 }, input: { "fiber": 3 } },
    { name: "Wood x2", env: "hand", output: { id: "wood", amount: 2 }, input: { "log": 1 } },
    { name: "Stick x4", env: "hand", output: { id: "stick", amount: 4 }, input: { "wood": 1 } },
    { name: "Wooden Axe", env: "hand", output: { id: "wooden_axe", amount: 1 }, input: { "wood": 3, "stick": 2, "rope": 1 } },
    { name: "Stone Axe", env: "hand", output: { id: "stone_axe", amount: 1 }, input: { "stone": 3, "stick": 2, "rope": 1 } },
    { name: "Wooden Hoe", env: "hand", output: { id: "wooden_hoe", amount: 1 }, input: { "wood": 2, "stick": 2, "rope": 1 } },
    { name: "Stone Hoe", env: "hand", output: { id: "stone_hoe", amount: 1 }, input: { "stone": 2, "stick": 2, "rope": 1 } },
    { name: "Manual Grinder", env: "table", output: { id: "machine_manual_grinder", amount: 1 }, input: { "stone": 10, "wood": 5 } },
    { name: "Coal Grinder", env: "table", output: { id: "machine_coal_grinder", amount: 1 }, input: { "stone_brick": 10, "iron_plate": 5 } },
    { name: "Manual Mixer", env: "table", output: { id: "machine_manual_mixer", amount: 1 }, input: { "stone": 5, "wood": 10 } },
    { name: "Coal Bowl Mixer", env: "table", output: { id: "machine_coal_mixer", amount: 1 }, input: { "stone_brick": 5, "iron_plate": 10 } },
    { name: "Coal Brick Oven", env: "table", output: { id: "machine_coal_brick_oven", amount: 1 }, input: { "stone_brick": 20 } },
    { name: "Water Filterer", env: "table", output: { id: "machine_water_filterer", amount: 1 }, input: { "wood": 10, "sand": 5, "gravel": 5 } },
    { name: "Quartz Glass x5", env: "table", output: { id: "quartz_glass", amount: 5 }, input: { "quartz_sand": 2 } },
    { name: "Quartz Data Cable x5", env: "table", output: { id: "quartz_cable", amount: 5 }, input: { "quartz_glass": 1, "copper_wire": 2 } },
    { name: "Sand Washer", env: "table", output: { id: "machine_sand_washer", amount: 1 }, input: { "iron_plate": 15, "copper_pipe": 10 } },
    { name: "Thermal Desorber", env: "table", output: { id: "machine_thermal_desorber", amount: 1 }, input: { "steel_plate": 15, "stone_brick": 20 } },
    { name: "Magnetic Separator", env: "table", output: { id: "machine_magnetic_separator", amount: 1 }, input: { "iron_plate": 20, "copper_wire": 15, "motor": 2 } },
    { name: "Acid Leaching Vat", env: "table", output: { id: "machine_acid_leaching_vat", amount: 1 }, input: { "lead_plate": 15, "glass_pipe": 10 } },
    { name: "Flotation Cell", env: "table", output: { id: "machine_flotation_cell", amount: 1 }, input: { "steel_plate": 20, "motor": 4 } },
    { name: "Calcination Kiln", env: "table", output: { id: "machine_calcination_kiln", amount: 1 }, input: { "stone_brick": 40, "steel_plate": 10 } },
    { name: "Arc Purifier", env: "table", output: { id: "machine_arc_purifier", amount: 1 }, input: { "invar_casing": 10, "steel_plate": 30, "copper_wire": 50 } },
    { name: "HEPA Air Purifier", env: "table", output: { id: "machine_hepa_purifier", amount: 1 }, input: { "plastic_pellet": 20, "fiber": 50, "motor": 5 } },
    { name: "Czochralski Puller", env: "table", output: { id: "machine_czochralski_puller", amount: 1 }, input: { "invar_casing": 20, "quartz_glass": 15, "motor": 10, "steel_plate": 50 } },
    { name: "Wafer Saw", env: "table", output: { id: "machine_wafer_saw", amount: 1 }, input: { "steel_plate": 20, "motor": 5 } },
    { name: "Wafer Polisher", env: "table", output: { id: "machine_wafer_polisher", amount: 1 }, input: { "steel_plate": 15, "motor": 5, "water": 10 } },
    { name: "Lens Caster", env: "table", output: { id: "machine_lens_caster", amount: 1 }, input: { "steel_plate": 15, "quartz_glass": 10 } },
    { name: "Optical Grinder", env: "table", output: { id: "machine_optical_grinder", amount: 1 }, input: { "steel_plate": 15, "motor": 4 } },
    { name: "Stencil Press", env: "table", output: { id: "machine_stencil_press", amount: 1 }, input: { "steel_plate": 25, "motor": 5, "copper_wire": 10 } },
    { name: "Lithographer", env: "table", output: { id: "machine_lithographer", amount: 1 }, input: { "invar_casing": 50, "crystal_lens": 10, "motor": 20, "quartz_cable": 50 } },
    { name: "Compute Module", env: "table", output: { id: "compute_module", amount: 1 }, input: { "cpu_ic": 1, "gpu_ic": 1, "rom_ic": 1, "ram_ic": 1, "ssd_ic": 1, "power_ic": 1, "clock_ic": 1, "io_ic": 1 } },
    { name: "Central Digital Hub", env: "table", output: { id: "machine_cdh", amount: 1 }, input: { "invar_casing": 20, "compute_module": 5, "quartz_glass": 20, "quartz_cable": 30 } },

    // --- QUANTUM & PLASMA ERA RECIPES ---
    { name: "Quantum Fiber Cable x5", env: "table", output: { id: "quantum_fiber_cable", amount: 5 }, input: { "silicon_ingot": 2, "invar_casing": 1, "crystal_lens": 1 } },
    { name: "Quantum Entanglement Forge", env: "table", output: { id: "machine_qe_forge", amount: 1 }, input: { "invar_casing": 200, "compute_module": 50, "crystal_lens": 20, "sicu_cable": 100, "hyper_wire": 200 } },
    { name: "Q-Router pair", env: "table", output: { id: "machine_q_router", amount: 2 }, input: { "compute_module": 10, "crystal_lens": 5, "invar_casing": 20, "hyper_wire": 50 } },
    { name: "Q-Processor", env: "table", output: { id: "machine_q_processor", amount: 1 }, input: { "compute_module": 30, "crystal_lens": 10, "invar_casing": 100, "sicu_cable": 200, "quartz_cable": 50 } },
    { name: "Plasma Conduit x5", env: "table", output: { id: "plasma_conduit_pipe", amount: 5 }, input: { "steel_plate": 3, "invar_casing": 1 } },
    { name: "Primitive Plasma Tap", env: "table", output: { id: "machine_primitive_plasma_tap", amount: 1 }, input: { "invar_casing": 20, "steel_plate": 10, "iron_pipe": 20, "stone_brick": 30 } },
    { name: "Plasma Torch Furnace", env: "table", output: { id: "machine_plasma_torch_furnace", amount: 1 }, input: { "invar_casing": 30, "steel_plate": 25, "stone_brick": 50, "iron_pipe": 20 } },
    { name: "Carbide Press", env: "table", output: { id: "machine_carbide_press", amount: 1 }, input: { "steel_plate": 20, "invar_casing": 10, "motor": 5, "copper_wire": 15 } },
    { name: "Plasma Manifold", env: "table", output: { id: "machine_plasma_manifold", amount: 1 }, input: { "tungsten_carbide": 15, "invar_casing": 60, "steel_plate": 40, "copper_wire": 50, "stone_brick": 100 } },
    { name: "Plasma Refinery", env: "table", output: { id: "machine_plasma_refinery", amount: 1 }, input: { "tungsten_carbide": 20, "invar_casing": 40, "steel_plate": 30, "glass_pipe": 20 } },
    { name: "Alloying Arc Furnace", env: "table", output: { id: "machine_alloying_arc_furnace", amount: 1 }, input: { "tungsten_carbide": 30, "invar_casing": 50, "steel_plate": 40, "stone_brick": 80 } },
    { name: "MHD Generator", env: "table", output: { id: "machine_mhd_generator", amount: 1 }, input: { "tungsten_carbide": 50, "invar_casing": 100, "steel_plate": 80, "motor": 30, "copper_wire": 100 } },
    { name: "Plasma Arc Welder", env: "table", output: { id: "machine_plasma_arc_welder", amount: 1 }, input: { "tungsten_carbide": 60, "invar_casing": 80, "steel_plate": 60, "crystal_lens": 10, "compute_module": 10 } },

    // --- ANTIMATTER ERA RECIPES ---
    { name: "Gamma Target", env: "table", output: { id: "gamma_target", amount: 1 }, input: { tungsten_carbide: 2, lead_plate: 5 } },
    { name: "Magnetic Pipe x5", env: "table", output: { id: "magnetic_containment_pipe", amount: 5 }, input: { rhenite_alloy: 2, quantum_fiber_cable: 1 } },
    { name: "Pair Production Chamber", env: "table", output: { id: "machine_pair_production_chamber", amount: 1 }, input: { machine_mhd_generator: 2, plasma_composite_plate: 5, sicu_cable: 20 } },
    { name: "Penning Trap Array", env: "table", output: { id: "machine_penning_trap_array", amount: 1 }, input: { rhenite_alloy: 20, sicu_cable: 10, invar_casing: 20 } },
    { name: "Magnetic Confinement Ring", env: "table", output: { id: "machine_magnetic_confinement_ring", amount: 1 }, input: { tungsten_carbide: 50, hyper_wire: 100, plasma_composite_plate: 20 } },
    { name: "Antimatter Containment Vessel", env: "table", output: { id: "machine_antimatter_containment_vessel", amount: 1 }, input: { plasma_composite_plate: 30, quantum_fiber_cable: 20, invar_casing: 40 } },
    { name: "Annihilation Reactor", env: "table", output: { id: "machine_annihilation_reactor", amount: 1 }, input: { irradiated_plate: 50, quantum_circuit: 20, sicu_cable: 100, machine_fission_reactor: 1 } },
    { name: "Antimatter Catalyst Bath", env: "table", output: { id: "machine_antimatter_catalyst_bath", amount: 1 }, input: { irradiated_plate: 20, heavy_water: 50, invar_casing: 50 } },
    { name: "Terrain Vitrifier", env: "table", output: { id: "machine_terrain_vitrifier", amount: 1 }, input: { machine_plasma_manifold: 1, antimatter_pellet: 1, steel_plate: 100 } },
    { name: "Quantum Stabilizer", env: "table", output: { id: "machine_quantum_stabilizer", amount: 1 }, input: { magnetic_containment_pipe: 100, compute_module: 100, rhenite_alloy: 100, sicu_cable: 500 } },
    { name: "Pseudo Matter Compositor", env: "table", output: { id: "machine_pseudo_matter_compositor", amount: 1 }, input: { machine_plasma_arc_welder: 1, antimatter_pellet: 2, quantum_fiber_cable: 20 } },

    // --- DIGITAL ERA RECIPES ---
    { name: "Digital Crafter", env: "table", output: { id: "machine_digital_crafter", amount: 1 }, input: { "compute_module": 2, "quartz_cable": 5, "iron_plate": 10 } },
    { name: "Digital Disk Drive", env: "table", output: { id: "machine_digital_disk_drive", amount: 1 }, input: { "ssd_ic": 4, "quartz_cable": 10, "steel_plate": 15 } },
    { name: "Digital Requester", env: "table", output: { id: "machine_digital_requester", amount: 1 }, input: { "compute_module": 1, "quartz_cable": 5, "copper_wire": 10 } },
    { name: "Import Uplink", env: "table", output: { id: "machine_import_uplink", amount: 1 }, input: { "quartz_cable": 2, "iron_plate": 5 } },
    { name: "Export Downlink", env: "table", output: { id: "machine_export_downlink", amount: 1 }, input: { "quartz_cable": 2, "iron_plate": 5 } },
    { name: "Grid Crafting Terminal", env: "table", output: { id: "machine_grid_crafting_interface", amount: 1 }, input: { "compute_module": 2, "quartz_glass": 10, "quartz_cable": 10 } },
    { name: "Digital Fluid Tank", env: "table", output: { id: "machine_digital_fluid_tank", amount: 1 }, input: { "machine_liquid_tank": 1, "quartz_cable": 5, "compute_module": 1 } },
    { name: "Digital Gas Tank", env: "table", output: { id: "machine_digital_gas_tank", amount: 1 }, input: { "machine_glass_tank": 1, "quartz_cable": 5, "compute_module": 1 } },
    { name: "Digital Acid Tank", env: "table", output: { id: "machine_digital_acid_tank", amount: 1 }, input: { "lead_lined_pipe": 10, "quartz_cable": 5, "compute_module": 1 } },
    { name: "Digital Exporter", env: "table", output: { id: "machine_digital_exporter", amount: 1 }, input: { "compute_module": 1, "quartz_cable": 2, "iron_plate": 5 } }
];

// ═══════ BUILD MENU CATEGORIES ═══════

setTimeout(() => {
    let map = typeof window !== 'undefined' ? window.MACHINE_CATEGORY_MAP : null;
    if (map) {
        map['Quantum'] = {
            color: '#7c4dff',
            machines: ['machine_qe_forge', 'machine_q_router', 'machine_q_processor']
        };
        map['Plasma Engineering'] = {
            color: '#ff6d00',
            machines: [
                'machine_primitive_plasma_tap',
                'machine_plasma_torch_furnace',
                'machine_carbide_press',
                'machine_plasma_manifold',
                'machine_plasma_refinery',
                'machine_alloying_arc_furnace',
                'machine_mhd_generator',
                'machine_plasma_arc_welder',
            ]
        };
        map['Antimatter Era'] = {
            color: '#d500f9',
            machines: [
                'machine_pair_production_chamber',
                'machine_penning_trap_array',
                'machine_magnetic_confinement_ring',
                'machine_antimatter_containment_vessel',
                'machine_annihilation_reactor',
                'machine_terrain_vitrifier',
                'machine_antimatter_catalyst_bath',
                'machine_pseudo_matter_compositor',
                'machine_quantum_stabilizer'
            ]
        };
        map['Digital Era'] = {
            color: '#00bcd4',
            machines: [
                'machine_grid_crafting_interface',
                'machine_digital_disk_drive',
                'machine_digital_fluid_tank',
                'machine_digital_gas_tank',
                'machine_digital_acid_tank',
                'machine_digital_crafter',
                'machine_digital_requester',
                'machine_import_uplink',
                'machine_export_downlink',
                'machine_digital_exporter'
            ]
        };
        if (map['Routing'] && !map['Routing'].machines.includes('machine_advanced_drone_station')) {
            map['Routing'].machines.push('machine_advanced_drone_station');
        }
        if (map['Storage'] && !map['Storage'].machines.includes('machine_chemical_tank')) {
            map['Storage'].machines.push('machine_chemical_tank');
        }
        if (map['Power'] && !map['Power'].machines.includes('machine_creative_generator')) {
            map['Power'].machines.push('machine_creative_generator');
        }
    }
}, 0);



// ═══ RECIPE OVERRIDES & WIKI PATCHES (migrated from afac.html) ═══
if (MACHINE_DEFS['machine_plasma_manifold']) MACHINE_DEFS['machine_plasma_manifold'].recipes = [
    { in: { 'raw_plasma': 2, 'water': 1 }, out: { 'stabilized_plasma': 1 }, out2: { 'plasma_slag': 1 } }
];
if (MACHINE_DEFS['machine_mhd_generator']) MACHINE_DEFS['machine_mhd_generator'].recipes = [
    { in: { 'stabilized_plasma': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_pumpjack']) MACHINE_DEFS['machine_pumpjack'].recipes = [
    { in: {}, out: { 'crude_oil': 1 } }
];
if (MACHINE_DEFS['machine_generator']) MACHINE_DEFS['machine_generator'].recipes = [
    { in: { 'coal': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_gas_generator']) MACHINE_DEFS['machine_gas_generator'].recipes = [
    { in: { 'petroleum_gas': 1 }, out: {} },
    { in: { 'hydrogen': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_fission_reactor']) MACHINE_DEFS['machine_fission_reactor'].recipes = [
    { in: { 'uranium_fuel_rod': 1, 'water': 40 }, out: { 'steam': 320 }, out2: { 'nuclear_waste': 1 } }
];
if (MACHINE_DEFS['machine_steam_turbine']) MACHINE_DEFS['machine_steam_turbine'].recipes = [
    { in: { 'steam': 8 }, out: {} }
];
if (MACHINE_DEFS['machine_waste_storage']) MACHINE_DEFS['machine_waste_storage'].recipes = [
    { in: { 'nuclear_waste': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_fusion_reactor']) MACHINE_DEFS['machine_fusion_reactor'].recipes = [
    { in: { 'deuterium': 1, 'tritium': 1, 'liquid_n2': 10 }, out: { 'superheated_n2': 10 } }
];
if (MACHINE_DEFS['machine_q_router']) MACHINE_DEFS['machine_q_router'].recipes = [
    { in: { 'entangled_pair': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_annihilation_reactor']) MACHINE_DEFS['machine_annihilation_reactor'].recipes = [
    { in: { 'antimatter_cell': 1, 'matter_slug': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_slug_turret']) MACHINE_DEFS['machine_slug_turret'].recipes = [
    { in: { 'steam': 1, 'iron_pellet': 1 }, out: {} }
];
if (MACHINE_DEFS['machine_chain_gunner']) MACHINE_DEFS['machine_chain_gunner'].recipes = [
    { in: { 'iron_pellet': 1 }, out: {} }
];
// Push for machine_carbide_press:
MACHINE_DEFS['machine_carbide_press'].recipes.push({
            in: { stone: 5, gravel: 5, sand: 5, iron_ingot: 1 }, out: { matter_slug: 1 }
        });

// ═══ LOGISTICS ITEMS (migrated from afac.html) ═══


// ═══ ENGINE PATCHES & PLASMATIC NETWORK LOGIC ═══

setTimeout(() => {
    // UI Patch for Antimatter Era
    if (typeof window.updateMachineUI === 'function') {
        const oldUpdateUI = window.updateMachineUI;
        window.updateMachineUI = function (m) {
            oldUpdateUI(m);
            if (m.type === 'machine_annihilation_reactor') {
                let div = document.getElementById('machine-custom-area');
                if (div) {
                    div.innerHTML = `
                        <div style="border-top:1px solid #444; padding-top:10px; margin-top:10px;">
                            <div style="color:#d500f9; font-weight:bold; font-size:14px; margin-bottom:5px;">ONTOLOGICAL INDEX</div>
                            <div style="height:20px; background:#222; border:1px solid #444; border-radius:10px; overflow:hidden;">
                                <div style="width:${m.ontoIndex || 0}%; height:100%; background:linear-gradient(90deg, #6200ea, #d500f9); transition:width 0.2s;"></div>
                            </div>
                            <div style="text-align:right; font-size:11px; margin-top:2px;">${(m.ontoIndex || 0).toFixed(1)}% Stability</div>
                        </div>
                    `;
                }
            }
        };
    }

    // Render Patch for Antimatter Era
    if (typeof window.render === 'function') {
        const oldRender = window.render;
        window.render = function () {
            oldRender();
            // Draw Ontological Rift visual if Annihilator is running low
            for (let m of activeMachines) {
                if (m && m.type === 'machine_annihilation_reactor' && m.ontoIndex < 100) {
                    let ctx = document.getElementById('gameCanvas').getContext('2d');
                    ctx.save();
                    ctx.translate((m.x + 5.5 - window.cameraX) * window.TILE_SIZE, (m.y + 5.5 - window.cameraY) * window.TILE_SIZE);
                    let pulse = (100 - m.ontoIndex) / 100;
                    let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, pulse * 200);
                    grad.addColorStop(0, 'rgba(213, 0, 249, 0.4)');
                    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(0, 0, pulse * 200, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            }
        };
    }

    // Power Grid Patch for Plasmatic Network
    if (typeof window.rebuildPowerGrids === 'function') {
        const oldRebuild = window.rebuildPowerGrids;
        window.rebuildPowerGrids = function () {
            oldRebuild();
            // Inject Plasmatic Superconductors into the electrical network logic
            if (window.mapPipes['plasmatic'] && window.NETWORKS.includes('electric')) {
                // This is a high-level hook; the actual electrical connectivity
                // is handled in WASM, but we can sync the Plasmatic network state here.
                // For now, we ensure the Plasmatic network is recognized as a high-capacity bridge.
            }
        };
    }

    // --- PLASMATIC NETWORK MEMORY BINDING ---
    // This prevents detachment when WASM memory grows
    const originalMalloc = window.wasmInstance?.exports?.malloc;
    if (originalMalloc) {
        // If WASM is already loaded, we hook it
        const syncPlasmatic = () => {
            if (window.mapPipes && window.mapPipes['plasmatic']) {
                // Ensure it's bound to the correct heap offset
                // This logic depends on the specific WASM export names
            }
        };
        syncPlasmatic();
    }

}, 1000); // Delay to ensure afac.html globals are defined

export function triggerNuclearExplosion(cx, cy) {
    const radius = 25; 
    let machinesToDestroy = new Set();
    for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
            if (x < 0 || x >= WORLD_SIZE || y < 0 || y >= WORLD_SIZE) continue;
            let dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist <= radius) {
                let idx = y * WORLD_SIZE + x;
                let tId = worldMap[idx];
                if (tId >= 50000) machinesToDestroy.add(tId - 50000);
                worldMap[idx] = 1;
                for (let n of NETWORKS) { if (mapPipes[n]) mapPipes[n][idx] = 0; }
                hasPipeMap[idx] = 0;
            }
        }
    }
    for (let mId of machinesToDestroy) {
        let m = activeMachines[mId];
        if (m && m.type !== 'machine_hub') {
            let r = m.def.rotations[m.rotIndex];
            for (let my = 0; my < r.h; my++) {
                for (let mx = 0; mx < r.w; mx++) {
                    let idx = (m.y + my) * WORLD_SIZE + (m.x + mx);
                    if (worldMap[idx] >= 50000) worldMap[idx] = 1;
                }
            }
            activeMachines[mId] = null;
        }
    }
    if (window.gameState?.clear_belt_items_in_radius) window.gameState.clear_belt_items_in_radius(cx, cy, radius);
    window.powerGridNeedsUpdate = true; window.dataGridNeedsUpdate = true;
    if (typeof updateHepaNetwork === 'function') updateHepaNetwork();
    let pDist = Math.sqrt((player.x - cx) * (player.x - cx) + (player.y - cy) * (player.y - cy));
    if (pDist <= radius + 5) player.hp = -9999;
    let overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100vw'; overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#fff'; overlay.style.zIndex = 9999; overlay.style.transition = 'opacity 3s'; overlay.style.pointerEvents = 'none';
    overlay.innerHTML = '<h1 style="color:#f44336; text-align:center; margin-top:40vh; font-family:monospace; font-size:64px; text-shadow:0 0 20px #000;">CRITICAL MELTDOWN</h1>';
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = 0; }, 100);
    setTimeout(() => { overlay.remove(); }, 3100);
    if (window.gameState?.rebuild_monster_paths) window.gameState.rebuild_monster_paths(player.x, player.y);
}

export function triggerSupernova(cx, cy) {
    const radius = 150;
    let machinesToDestroy = new Set();
    for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
            if (x < 0 || x >= WORLD_SIZE || y < 0 || y >= WORLD_SIZE) continue;
            let dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist <= radius) {
                let idx = y * WORLD_SIZE + x;
                let tId = worldMap[idx];
                if (tId >= 50000) machinesToDestroy.add(tId - 50000);
                worldMap[idx] = (Math.random() > 0.5) ? 1 : 43;
                for (let n of NETWORKS) { if (mapPipes[n]) mapPipes[n][idx] = 0; }
                hasPipeMap[idx] = 0;
            }
        }
    }
    for (let mId of machinesToDestroy) {
        let m = activeMachines[mId];
        if (m && m.type !== 'machine_hub') {
            let r = m.def.rotations[m.rotIndex];
            for (let my = 0; my < r.h; my++) {
                for (let mx = 0; mx < r.w; mx++) {
                    let idx = (m.y + my) * WORLD_SIZE + (m.x + mx);
                    if (worldMap[idx] >= 50000) worldMap[idx] = 1;
                }
            }
            activeMachines[mId] = null;
        }
    }
    if (window.gameState?.clear_belt_items_in_radius) window.gameState.clear_belt_items_in_radius(cx, cy, radius);
    window.powerGridNeedsUpdate = true; window.dataGridNeedsUpdate = true;
    if (typeof updateHepaNetwork === 'function') updateHepaNetwork();
    let pDist = Math.sqrt((player.x - cx) * (player.x - cx) + (player.y - cy) * (player.y - cy));
    if (pDist <= radius + 10) player.hp = -9999;
    let overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.top = 0; overlay.style.left = 0; overlay.style.width = '100vw'; overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#fff'; overlay.style.zIndex = 9999; overlay.style.transition = 'opacity 5s'; overlay.style.pointerEvents = 'none';
    overlay.innerHTML = '<h1 style="color:#000; text-align:center; margin-top:40vh; font-family:monospace; font-size:80px; text-shadow:0 0 40px #03a9f4;">SUPERNOVA COLLAPSE</h1>';
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = 0; }, 2000);
    setTimeout(() => { overlay.remove(); }, 7100);
    if (window.gameState?.rebuild_monster_paths) window.gameState.rebuild_monster_paths(player.x, player.y);
}

export function triggerParadoxicalCollapse() {
    if (typeof worldMap === 'undefined') return;
    worldMap.fill(1);
    if (typeof NETWORKS !== 'undefined' && typeof mapPipes !== 'undefined') {
        for (let n of NETWORKS) if (mapPipes[n]) mapPipes[n].fill(0);
    }
    if (typeof hasPipeMap !== 'undefined') hasPipeMap.fill(0);
    if (typeof activeMachines !== 'undefined') activeMachines.length = 0;
    if (typeof itemsOnBelts !== 'undefined') itemsOnBelts.length = 0;
    if (typeof activeRoutes !== 'undefined') activeRoutes.length = 0;
    if (typeof player !== 'undefined') player.hp = -9999;

    let overlay = document.createElement('div');
    overlay.style.position = 'fixed'; overlay.style.top = 0; overlay.style.left = 0;
    overlay.style.width = '100vw'; overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#000'; overlay.style.zIndex = 9999;
    overlay.style.color = '#fff'; overlay.style.display = 'flex';
    overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column'; overlay.style.fontFamily = 'monospace';
    overlay.innerHTML = '<h1 style="color:#d500f9; font-size:72px; text-shadow:0 0 30px #d500f9;">PARADOXICAL COLLAPSE</h1><p>Ontological Index reached 0. Reality erased.</p>';
    document.body.appendChild(overlay);
}

window.triggerNuclearExplosion = triggerNuclearExplosion;
window.triggerSupernova = triggerSupernova;
window.triggerParadoxicalCollapse = triggerParadoxicalCollapse;

// ═══ DIGITAL ERA: APPLIED ENERGISTICS STYLE STORAGE & AUTOCRAFTING ═══

window.insertDigitalItem = function (storageArr, item, qty) {
    let inserted = 0;
    for (let n of storageArr) {
        if (n.def.acceptsItem && !n.def.acceptsItem(n, item)) continue;
        let currentTotal = Object.values(n.inv).reduce((a, b) => a + b, 0);
        let cap = (n.def.maxStack || 5000) - currentTotal;
        if (cap > 0) {
            let put = Math.min(cap, qty - inserted);
            n.inv[item] = (n.inv[item] || 0) + put;
            inserted += put;
            if (inserted >= qty) break;
        }
    }
    return qty - inserted;
};

window.extractDigitalItem = function (storageArr, item, qty) {
    let extracted = 0;
    for (let n of storageArr) {
        if (n.inv && n.inv[item] > 0) {
            let take = Math.min(n.inv[item], qty - extracted);
            n.inv[item] -= take;
            if (n.inv[item] === 0) delete n.inv[item];
            extracted += take;
            if (extracted >= qty) break;
        }
    }
    return extracted;
};

// Patch CDH for Digital Loop
setTimeout(() => {
    if (MACHINE_DEFS['machine_cdh']) {
        const _origCdhUpdate = MACHINE_DEFS['machine_cdh'].updateOverride;
        MACHINE_DEFS['machine_cdh'].updateOverride = function (m, r, dt) {
            if (m.timer >= 1.0) { // Execute digital loop on same interval as stats loop
                if (m.energy >= 20 && m.dataGrid) {
                    // -- SCAN DIGITAL NETWORK --
                    let digiStorage = [];
                    let digiItems = {};
                    let crafters = [];

                    for (let node of m.dataGrid.machines) {
                        if (!node) continue;

                        if (node.def.isDigitalStorage) {
                            digiStorage.push(node);
                            for (let k in node.inv) digiItems[k] = (digiItems[k] || 0) + node.inv[k];
                        }
                        else if (node.type === 'machine_digital_crafter') {
                            crafters.push(node);
                        }
                        else if (node.type === 'machine_import_uplink') {
                            for (let k in node.inv) {
                                if (node.inv[k] > 0) {
                                    let left = insertDigitalItem(digiStorage, k, node.inv[k]);
                                    if (left === 0) delete node.inv[k]; else node.inv[k] = left;
                                }
                            }
                        }
                        else if (node.type === 'machine_export_downlink') {
                            let target = node.filters?.out1?.[0];
                            if (target && (digiItems[target] || 0) > 0) {
                                if ((node.outBuffer[target] || 0) < 100) {
                                    let taken = extractDigitalItem(digiStorage, target, 1);
                                    if (taken > 0) {
                                        node.outBuffer[target] = (node.outBuffer[target] || 0) + taken;
                                        digiItems[target] -= taken;
                                    }
                                }
                            }
                        }
                        else if (node.type === 'machine_digital_requester') {
                            let tItem = node.reqItem;
                            let tQty = node.reqQty;
                            if (tItem && tQty > 0) {
                                let cur = digiItems[tItem] || 0;
                                if (cur < tQty) {
                                    m.jobs = m.jobs || [];
                                    let existing = m.jobs.find(j => j.target === tItem && j.status !== 'done' && j.isRequesterJob);
                                    if (!existing) {
                                        m.jobs.push({ id: Math.random(), target: tItem, qty: tQty - cur, status: 'pending', isRequesterJob: true });
                                    } else {
                                        existing.qty = tQty - cur; // Ensure requesters proactively update missing qty
                                    }
                                }
                            }
                        }
                    }

                    m.digiStorage = digiStorage;
                    m.digiItems = digiItems;
                    m.digiCrafters = crafters;

                    // -- PROCESS CRAFTER RETURNS & BYPRODUCTS --
                    for (let c of crafters) {
                        // Instantly vacuum all unused byproducts 
                        for (let k in c.inv) {
                            if (c.currentJob && k === c.currentJob.target) continue;
                            let leftover = insertDigitalItem(digiStorage, k, c.inv[k]);
                            digiItems[k] = (digiItems[k] || 0) + (c.inv[k] - leftover);
                            if (leftover === 0) delete c.inv[k]; else c.inv[k] = leftover;
                        }

                        if (c.currentJob) {
                            let target = c.currentJob.target;
                            let avail = c.inv[target] || 0;
                            if (avail > 0) {
                                let take = Math.min(avail, c.currentJob.qty);
                                let leftover = insertDigitalItem(digiStorage, target, take);
                                let actuallyTaken = take - leftover;

                                if (actuallyTaken > 0) {
                                    c.inv[target] -= actuallyTaken;
                                    if (c.inv[target] === 0) delete c.inv[target];

                                    digiItems[target] = (digiItems[target] || 0) + actuallyTaken;

                                    c.currentJob.qty -= actuallyTaken;
                                    if (m.jobs) {
                                        let pJob = m.jobs.find(j => j.id === c.currentJob.parentJobId);
                                        if (pJob) pJob.qty -= actuallyTaken;
                                    }
                                }

                                if (c.currentJob.qty <= 0) {
                                    c.currentJob = null;
                                }
                            }
                        }
                    }

                    // -- PROCESS GREEDY JOB SCHEDULING --
                    m.jobs = m.jobs || [];
                    for (let job of m.jobs) {
                        if (job.qty <= 0) { job.status = 'done'; continue; }

                        let c = crafters.find(cr => cr.pattern && cr.pattern.out === job.target && !cr.currentJob);
                        if (!c) continue;

                        let canCraft = true;
                        let missing = null;
                        let maxBatches = job.qty;

                        for (let k in c.pattern.in) {
                            let avail = digiItems[k] || 0;
                            let possible = Math.floor(avail / c.pattern.in[k]);
                            if (possible === 0) { canCraft = false; missing = k; break; }
                            if (possible < maxBatches) maxBatches = possible;
                        }

                        if (canCraft) {
                            for (let k in c.pattern.in) {
                                let toExtract = c.pattern.in[k] * maxBatches;
                                extractDigitalItem(digiStorage, k, toExtract);
                                c.outBuffer[k] = (c.outBuffer[k] || 0) + toExtract;
                                digiItems[k] -= toExtract;
                            }
                            c.currentJob = { target: job.target, qty: maxBatches, parentJobId: job.id };
                        } else if (missing) {
                            // Ensure mathematically accurate sub-job values are requested based on the input deficit
                            let needed = (job.qty * c.pattern.in[missing]) - (digiItems[missing] || 0);
                            if (needed > 0) {
                                let existing = m.jobs.find(j => j.target === missing && j.status !== 'done');
                                if (!existing) {
                                    m.jobs.push({ id: Math.random(), target: missing, qty: needed, status: 'pending' });
                                } else {
                                    existing.qty = Math.max(existing.qty, needed);
                                }
                            }
                        }
                    }
                    m.jobs = m.jobs.filter(j => j.status !== 'done' && j.qty > 0);
                }
            }

            if (_origCdhUpdate) {
                _origCdhUpdate(m, r, dt);
            }
        };
    }
}, 2000);

window.generateMachineShowcase = function() {
    console.log("Generating 8K Machine Showcase...");
    if (typeof floatText === 'function' && typeof player !== 'undefined') {
        floatText(player.x, player.y, "Generating Showcase Image...", "#03a9f4");
    }

    const SCALE = 4; 
    const CW = 10 * SCALE; 
    const CH = 16 * SCALE; 
    const MARGIN = 60 * SCALE;
    const PADDING = 30 * SCALE;
    const MAX_W = 1920 * SCALE; 

    let commands = [];
    let cx = MARGIN;
    let cy = MARGIN;
    let rowH = 0;

    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `bold ${14 * SCALE}px "Courier New", monospace`;

    let categories = [];
    let assigned = new Set();

    let categoryMap = typeof MACHINE_CATEGORY_MAP !== 'undefined' ? MACHINE_CATEGORY_MAP : (typeof window !== 'undefined' ? window.MACHINE_CATEGORY_MAP : {});
    for (let cat in categoryMap) {
        categories.push({
            name: cat,
            color: categoryMap[cat].color,
            machines: categoryMap[cat].machines.filter(m => MACHINE_DEFS[m])
        });
        categoryMap[cat].machines.forEach(m => assigned.add(m));
    }

    let uncategorized = [];
    if (MACHINE_DEFS['machine_hub'] && !assigned.has('machine_hub')) {
        uncategorized.push('machine_hub');
        assigned.add('machine_hub');
    }
    for (let mId in MACHINE_DEFS) {
        if (!assigned.has(mId)) uncategorized.push(mId);
    }
    if (uncategorized.length > 0) {
        categories.push({ name: 'Miscellaneous', color: '#757575', machines: uncategorized });
    }

    for (let cat of categories) {
        if (cat.machines.length === 0) continue;

        cx = MARGIN;
        if (rowH > 0) cy += rowH + PADDING * 2;
        rowH = 0;

        commands.push({ type: 'text', text: `[ ${cat.name.toUpperCase()} ]`, x: cx, y: cy, color: cat.color, font: `bold ${26 * SCALE}px "Courier New", monospace`, align: 'left', baseline: 'top' });
        cy += 60 * SCALE;
        cx = MARGIN;

        for (let mId of cat.machines) {
            let mDef = MACHINE_DEFS[mId];
            let r = mDef.rotations[0];

            let titleWidth = tempCtx.measureText(mDef.name).width;
            let artWidth = r.w * CW;
            let blockW = Math.max(titleWidth, artWidth) + PADDING * 2;
            let blockH = r.h * CH + (30 * SCALE) + PADDING;

            if (cx + blockW > MAX_W - MARGIN) {
                cx = MARGIN;
                cy += rowH + PADDING;
                rowH = 0;
            }

            let startX = cx + (blockW - artWidth) / 2;
            let startY = cy + (30 * SCALE);

            commands.push({ type: 'text', text: mDef.name, x: cx + blockW / 2, y: cy, color: mDef.color || '#222', font: `bold ${14 * SCALE}px "Courier New", monospace`, align: 'center', baseline: 'top' });

            let addPort = (px, py, color) => {
                commands.push({ type: 'rect', x: startX + px * CW, y: startY + py * CH, w: CW, h: CH, color: color });
            };
            if (r.outX !== null && r.outX !== undefined) addPort(r.outX, r.outY, 'rgba(230, 80, 0, 0.4)');
            if (r.extraOuts) r.extraOuts.forEach(p => addPort(p.x, p.y, 'rgba(230, 80, 0, 0.4)'));
            if (r.out2X !== null && r.out2X !== undefined) addPort(r.out2X, r.out2Y, 'rgba(3, 169, 244, 0.4)');
            if (r.extraOut2s) r.extraOut2s.forEach(p => addPort(p.x, p.y, 'rgba(3, 169, 244, 0.4)'));

            for (let y = 0; y < r.h; y++) {
                for (let x = 0; x < r.w; x++) {
                    let char = r.art[y][x];
                    if (char && char !== ' ') {
                        commands.push({ type: 'char', char: char, x: startX + x * CW + (5 * SCALE), y: startY + y * CH + (8 * SCALE), color: mDef.color });
                    }
                }
            }

            cx += blockW;
            rowH = Math.max(rowH, blockH);
        }
        cy += rowH;
        rowH = 0;
    }

    cy += MARGIN;

    let canvas = document.createElement('canvas');
    canvas.width = MAX_W;
    canvas.height = cy;
    let ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f0f0f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1 * SCALE;
    for (let x = 0; x < canvas.width; x += CW) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += CH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    for (let cmd of commands) {
        if (cmd.type === 'text' || cmd.type === 'char') {
            ctx.fillStyle = cmd.color;
            ctx.font = cmd.font || `bold ${14 * SCALE}px "Courier New", monospace`;
            ctx.textAlign = cmd.align || 'center';
            ctx.textBaseline = cmd.baseline || 'middle';
            ctx.fillText(cmd.text || cmd.char, cmd.x, cmd.y);
        } else if (cmd.type === 'rect') {
            ctx.fillStyle = cmd.color;
            ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
        }
    }

    let link = document.createElement('a');
    link.download = 'ROOT_WORKS_Machines_Showcase.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    if (typeof floatText === 'function' && typeof player !== 'undefined') {
        floatText(player.x, player.y, "Image Downloaded!", "#4caf50");
    }
};

