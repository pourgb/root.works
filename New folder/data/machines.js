import { ORES } from './constants.js';
import { ITEM_COLORS, LOGISTICS_ITEMS, LOGISTICS_COLORS } from './items.js';

// ═══════ ROTATION GENERATOR & COMMON BEHAVIORS ═══════
    const _M = {'<':'>','>':'<','v':'^','^':'v','[':']',']':'['};
    function _mc(c) { return _M[c] || c; }
    function _flip180(art) { return art.slice().reverse().map(r => r.split('').reverse().map(c => _mc(c)).join('')); }
    function _rp180(px, py, w, h) { return (px === null || px === undefined) ? {x:null,y:null} : {x: w-1-px, y: h-1-py}; }

    export function genRot4(base, alt) {
        let r0 = Object.assign({}, base);
        let a2 = _flip180(base.art); let p2 = _rp180(base.outX, base.outY, base.w, base.h);
        let r2 = { w:base.w, h:base.h, art:a2, outX:p2.x, outY:p2.y };
        if (base.out2X !== undefined) { let p = _rp180(base.out2X, base.out2Y, base.w, base.h); r2.out2X=p.x; r2.out2Y=p.y; }
        if (base.extraOuts) { r2.extraOuts = base.extraOuts.map(p => _rp180(p.x, p.y, base.w, base.h)); }
        if (base.extraOut2s) { r2.extraOut2s = base.extraOut2s.map(p => _rp180(p.x, p.y, base.w, base.h)); }
        let r1, r3;
        if (alt) {
            r1 = Object.assign({}, alt);
            let a3 = _flip180(alt.art); let p3 = _rp180(alt.outX, alt.outY, alt.w, alt.h);
            r3 = { w:alt.w, h:alt.h, art:a3, outX:p3.x, outY:p3.y };
            if (alt.out2X !== undefined) { let p = _rp180(alt.out2X, alt.out2Y, alt.w, alt.h); r3.out2X=p.x; r3.out2Y=p.y; }
            if (alt.extraOuts) { r3.extraOuts = alt.extraOuts.map(p => _rp180(p.x, p.y, alt.w, alt.h)); }
            if (alt.extraOut2s) { r3.extraOut2s = alt.extraOut2s.map(p => _rp180(p.x, p.y, alt.w, alt.h)); }
        } else {
            let cw = (art,w,h) => { let n=[]; for(let x=0;x<w;x++){let s='';for(let y=h-1;y>=0;y--)s+=art[y]?.[x]||' ';n.push(s);} return n.map(r=>r.split('').map(c=>c==='^'?'>':c==='>'?'v':c==='v'?'<':c==='<'?'^':c==='/'?'\\':c==='\\'?'/':c==='-'?'|':c==='|'?'-':c).join('')); };
            let rp90 = (px,py,w,h) => (px===null||px===undefined)?{x:null,y:null}:{x:h-1-py,y:px};
            let a1 = cw(base.art, base.w, base.h); let p1 = rp90(base.outX, base.outY, base.w, base.h);
            r1 = { w:base.h, h:base.w, art:a1, outX:p1.x, outY:p1.y };
            if (base.out2X!==undefined){let p=rp90(base.out2X,base.out2Y,base.w,base.h);r1.out2X=p.x;r1.out2Y=p.y;}
            let a3 = _flip180(a1); let p3 = _rp180(r1.outX, r1.outY, r1.w, r1.h);
            r3 = { w:r1.w, h:r1.h, art:a3, outX:p3.x, outY:p3.y };
            if (r1.out2X!==undefined){let p=_rp180(r1.out2X,r1.out2Y,r1.w,r1.h);r3.out2X=p.x;r3.out2Y=p.y;}
        }
        return [r0, r1, r2, r3];
    }

    export const Anim = {
        glow: (ch, g, col) => function(c, t) { if(c===ch) return {char:t===0?ch:g, color:col}; return null; },
        fire: (ch, col) => function(c, t) { if(c===ch) return {char:t===0?'*':'^', color:col||'#ff5722'}; return null; },
        wave: (ch, col) => function(c, t) { if(c===ch) return {char:t===0?'~':'=', color:col}; return null; },
        waveAlt: (ch, col) => function(c, t) { if(c===ch) return {char:t===0?'~':'*', color:col}; return null; },
        spin: (ch) => function(c, t) { if(c===ch) return {char:t===0?'+':'x'}; return null; }
    };

    export const acceptsTank = (m, item, allowed) => allowed.includes(item) && (Object.keys(m.inv).length === 0 || (m.inv[item] !== undefined));

    export const tankUpdate = function(m, r, dt) {
        m.pullTimer = (m.pullTimer||0) + dt;
        if (m.pullTimer >= 0.5) { m.pullTimer = 0;
            for (let item in m.inv) { if (m.inv[item] > 0) {
                let pass = true;
                if (m.filters && m.filters.out1 && m.filters.out1.length > 0) { let inList = m.filters.out1.includes(item); pass = m.filters.blacklist ? !inList : inList; }
                if (pass) { m.outBuffer[item] = (m.outBuffer[item]||0)+1; m.inv[item]--; break; }
            }}
        }
    };

        export const MACHINE_DEFS = {
        'machine_crafter': { 
            id: 'machine_crafter', name: 'Crafting Table', color: '#8d6e63', 
            rotations: [{ w: 1, h: 1, art: ["T"], outX:null, outY:null }], energy: {type: 'none'} 
        },
        'machine_miner': {
            id: 'machine_miner', name: 'Automated Miner', color: '#e65100',
            rotations: genRot4({ w: 2, h: 2, art: ["/\\", "MM"], outX: 0, outY: 2 }),
            energy: { type: 'none' }, processTime: 2.0,
            updateOverride: function(m, r, dt) {
                if (m.oreType) {
                    let speed = (['stone', 'coal'].includes(m.oreType) ? 2.0 : 4.0);
                    if (m.timer >= speed) { m.timer = 0; m.outBuffer[m.oreType] = (m.outBuffer[m.oreType] || 0) + 1; }
                }
            },
            renderAnim: function(char, t) { if (char === 'M') return { char: t===0 ? 'M' : 'm', color: t===0 ? '#e65100' : '#ffb74d' }; return null; },
            isWorking: function(m) { return m.oreType != null; }
        },
        'machine_furnace_coal': { 
            id: 'machine_furnace_coal', name: 'Coal Furnace', color: '#424242', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|==|", "|==|", "\\FF/"], outX: 1, outY: 4 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 5.0, 
            recipes: ORES.map(o => ({ in: {[`${o}_ore`]: 1}, out: {[`${o}_ingot`]: 1} })),
            renderAnim: Anim.waveAlt('=', '#ff5722')
        },
        'machine_furnace_electric': { 
            id: 'machine_furnace_electric', name: 'Electric Furnace', color: '#0288d1', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|==|", "|==|", "\\EE/"], outX: 1, outY: 4 }), 
            energy: { type: 'electric', usage: 10 }, processTime: 3.0, 
            recipes: ORES.map(o => ({ in: {[`${o}_ore`]: 1}, out: {[`${o}_ingot`]: 1} })),
            renderAnim: Anim.waveAlt('=', '#00bcd4')
        },
        'machine_press_coal': { 
            id: 'machine_press_coal', name: 'Coal Press', color: '#8e24aa', 
            rotations: genRot4({ w: 2, h: 2, art: ["P|", "C|"], outX: 0, outY: 2 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 4.0, 
            recipes: [
                { in: {'iron_ingot': 1}, out: {'iron_plate':1} }, { in: {'copper_ingot': 1}, out: {'copper_plate':1} }, 
                { in: {'brass_ingot': 1}, out: {'brass_plate':1} }, { in: {'bronze_ingot': 1}, out: {'bronze_plate':1} },
                { in: {'steel_ingot': 1}, out: {'steel_plate': 1} }, { in: {'lead_ingot': 1}, out: {'lead_plate': 1} },
                { in: {'tin_ingot': 1}, out: {'tin_plate': 1} }, { in: {'aluminium_ingot': 1}, out: {'aluminium_plate': 1} }
            ],
            renderAnim: Anim.glow('P', '_')
        },
        'machine_wire_cutter': { 
            id: 'machine_wire_cutter', name: 'Wire Cutter', color: '#795548', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\W/"], outX: 1, outY: 3 }), 
            energy: { type: 'electric', usage: 5 }, processTime: 3.0, 
            recipes: [{ in: {'copper_plate': 1}, out: {'copper_wire': 2} }],
            renderAnim: Anim.glow('C', 'x', '#ffb74d')
        },
        'machine_assembler': { 
            id: 'machine_assembler', name: 'Assembler', color: '#1976d2', 
            rotations: genRot4({ w: 3, h: 3, art: ["/A\\", "|=|", "\\B/"], outX: 1, outY: 3 }), 
            energy: { type: 'electric', usage: 15 }, processTime: 4.0, 
            recipes: [
                {in: {'bronze_plate':1, 'bronze_gear':1}, out:{'bronze_casing':1}}, 
                {in: {'brass_plate':1, 'brass_gear':1}, out:{'brass_casing':1}},
                {in: {'lead_plate':2}, out:{'lead_casing':1}},
                {in: {'tin_plate':2}, out:{'tin_casing':1}}
            ],
            renderAnim: Anim.spin('=')
        },
        'machine_generator': { 
            id: 'machine_generator', name: 'Coal Generator', color: '#757575', 
            rotations: [{ w: 5, h: 5, art: ["/GGG\\", "|===|", "|===|", "|===|", "\\GGG/"], outX:null, outY:null }], 
            energy: { type: 'none' }, 
            updateOverride: function(m, r, dt) { 
                m.inv = m.inv || {}; m.energy = m.energy || 0; 
                if (m.energy < 10000 && m.inv['coal'] > 0 && m.timer >= 3.0) { 
                    m.timer = 0; m.inv['coal']--; m.energy = Math.min(10000, m.energy + 20); 
                } 
            },
            renderAnim: function(char, t) { 
                if (char === '=') return { char: t===0 ? '~' : '=', color: '#f9a825' }; 
                if (char === 'G') return { char: t===0 ? 'G' : '6', color: '#ffc107' }; // Spinning G's
                return null; 
            },
            isWorking: function(m) { return m.inv && m.inv['coal'] > 0 && (m.energy || 0) < 10000; }
        },
        'machine_magmaeous_crucible': { 
            id: 'machine_magmaeous_crucible', name: 'Magmaeous Crucible', color: '#d84315', 
            rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|LA|", "|~~|", "|~~|", "\\MM/"], outX: 1, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "M~~L|", "M~~A|", "\\---/"], outX: -1, outY: 1 }), 
            energy: { type: 'none' }, processTime: 4.0, 
            recipes: [{ in: {'coal': 1, 'stone': 1}, out: {'lava': 1} }],
            renderAnim: Anim.waveAlt('~', '#ff5722')
        },
        'machine_alloying_smelter': { 
            id: 'machine_alloying_smelter', name: 'Alloying Smelter', color: '#ff7043', 
            rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|L M|", "|~=~|", "|~=~|", "\\A-S/"], outX: 2, outY: 5 }), 
            energy: { type: 'fluid', fuel: 'lava', usage: 1 }, processTime: 5.0, 
            recipes: [{ in: {'copper_ingot': 1, 'zinc_ingot': 1}, out: {'brass_ingot': 2} }, { in: {'copper_ingot': 3, 'tin_ingot': 1}, out: {'bronze_ingot': 4} }],
            renderAnim: Anim.wave('=', '#d84315')
        },
        'machine_coal_pump': { 
            id: 'machine_coal_pump', name: 'Coal Pump', color: '#424242', 
            rotations: genRot4({ w: 1, h: 2, art: ["C", "="], outX:0, outY:2 }, { w: 2, h: 1, art: ["=C"], outX:-1, outY:0 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0, 
            recipes: [{ in: {}, out: {'water': 1} }],
            renderAnim: Anim.wave('=', '#03a9f4')
        },
        'machine_brass_pump': { 
            id: 'machine_brass_pump', name: 'Brass Pump', color: '#fbc02d', 
            rotations: genRot4({ w: 1, h: 2, art: ["P", "="], outX:0, outY:2 }, { w: 2, h: 1, art: ["=P"], outX:-1, outY:0 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 0.5, 
            recipes: [{ in: {}, out: {'water': 1} }],
            renderAnim: Anim.wave('=', '#03a9f4')
        },
        'machine_brass_boiler': { 
            id: 'machine_brass_boiler', name: 'Brass Boiler', color: '#fbc02d', 
            rotations: genRot4({ w: 3, h: 4, art: ["/B\\", "|~|", "|*|", "\\-/"], outX: 1, outY: 4 }, { w: 4, h: 3, art: ["/--\\", "*~B|", "\\--/"], outX: -1, outY: 1 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 2.5, 
            recipes: [{ in: {'water': 1}, out: {'steam': 1} }],
            renderAnim: Anim.fire('*')
        },
        'machine_bronze_rod_extruder': { 
            id: 'machine_bronze_rod_extruder', name: 'Bronze Extruder', color: '#ff9800', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|E|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 2.0, 
            recipes:[
                { in: {'iron_plate': 2}, out: {'iron_pipe': 5} },
                { in: {'copper_plate': 2}, out: {'copper_pipe': 5} },
                { in: {'brass_plate': 2}, out: {'brass_pipe': 5} }
            ],
            renderAnim: Anim.glow('E', '=', '#ffb74d')
        },
        'machine_bronze_wire_cutter': { 
            id: 'machine_bronze_wire_cutter', name: 'Bronze Cutter', color: '#ff9800', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|C|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 2.0, 
            recipes:[{ in: {'copper_plate': 1}, out: {'copper_wire': 5} }],
            renderAnim: Anim.glow('C', 'x', '#ffb74d')
        },
        'machine_bronze_gear_miller': { 
            id: 'machine_bronze_gear_miller', name: 'Bronze Gear Miller', color: '#ff9800', 
            rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|**|", "\\GE/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "|*|", "G*|", "\\E/"], outX: -1, outY: 2 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 2.0, 
            recipes: [{ in: {'bronze_plate':1}, out:{'bronze_gear':1}}, { in: {'brass_plate':1}, out:{'brass_gear':1}}],
            renderAnim: Anim.spin('*')
        },
        'machine_bronze_crusher': { 
            id: 'machine_bronze_crusher', name: 'Bronze Crusher', color: '#ff9800', 
            rotations: genRot4({ w: 3, h: 4, art: ["/-\\", "|#|", "|V|", "\\v/"], outX: 1, outY: 4 }, { w: 4, h: 3, art: ["/--\\", "v#V|", "\\--/"], outX: -1, outY: 1 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.0, recipes: [],
            renderAnim: function(char, t) { if (char === 'V' || char === 'v') return { char: t===0 ? 'V' : 'v' }; return null; }
        },
        'machine_bronze_mill': { 
            id: 'machine_bronze_mill', name: 'Bronze Mill', color: '#ff9800', 
            rotations: genRot4({ w: 5, h: 3, art: ["/---\\", "|(%)|", "\\-M-/"], outX: 2, outY: 3 }, { w: 3, h: 5, art: ["/-\\", "|(|", "M%|", "|)|", "\\-/"], outX: -1, outY: 2 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.0, recipes: [],
            renderAnim: Anim.spin('%')
        },
        'machine_bronze_washer': { 
            id: 'machine_bronze_washer', name: 'Bronze Washer', color: '#ff9800', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|%%|", "|%%|", "\\~W/"], outX: 2, outY: 4 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.0, recipes: [],
            renderAnim: function(char, t) { if (char === '~') return { char: t===0 ? '-' : '~', color: '#03a9f4' }; return null; }
        },
        'machine_bronze_roaster': { 
            id: 'machine_bronze_roaster', name: 'Bronze Roaster', color: '#ff9800', 
            rotations: genRot4({ w: 3, h: 4, art: ["/-\\", "|@|", "| |", "\\R/"], outX: 1, outY: 4, out2X: -1, out2Y: 1 }, { w: 4, h: 3, art: ["/--\\", "R @|", "\\--/"], outX: -1, outY: 1, out2X: 2, out2Y: -1 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.0, recipes: [], // SO2 byproduct recipes added dynamically
            renderAnim: function(char, t) { if (char === '@') return { char: t===0 ? '*' : '@', color: '#ff5722' }; return null; }
        },
        'machine_bronze_furnace': { 
            id: 'machine_bronze_furnace', name: 'Bronze Furnace', color: '#ff9800', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|**|", "|**|", "\\-F/"], outX: 2, outY: 4 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 3 }, processTime: 3.0, recipes: [],
            renderAnim: Anim.fire('*')
        },
        'machine_hub': { 
            id: 'machine_hub', name: 'Central Hub', color: '#558b2f', 
            rotations: [{ w: 3, h: 3, art: ["/H\\", "HHH", "\\H/"], outX:null, outY:null }], 
            energy: { type: 'none' }, maxStack: 10000 
        },
        'machine_storage_box': {
            id: 'machine_storage_box', name: 'Storage Box', color: '#795548',
            rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|  |", "\\v-/"], outX: 1, outY: 3 }, { w: 3, h: 4, art:["/-\\", "< |", "| |", "\\-/"], outX: -1, outY: 1 }),
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
            rotations: genRot4({ w: 4, h: 4, art:["/--\\", "|OO|", "|OO|", "\\v-/"], outX: 1, outY: 4 }),
            energy: { type: 'none' }, maxStack: 5000, 
            acceptsItem: (m, itm) => acceptsTank(m, itm,['oxygen', 'hydrogen', 'sulfur_dioxide', 'chlorine', 'unrefined_gas', 'petroleum_gas', 'nitrogen_gas']),
            updateOverride: tankUpdate
        },
        'machine_splitter': {
            id: 'machine_splitter', name: 'Splitter', color: '#009688',
            rotations: genRot4({ w: 1, h: 2, art: ["S", "s"], outX: 1, outY: 0, out2X: 1, out2Y: 1 }, { w: 2, h: 1, art: ["sS"], outX: 1, outY: 1, out2X: 0, out2Y: 1 }),
            energy: { type: 'none' }, maxStack: 5,
            updateOverride: function(m, r, dt) {
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
            isWorking: function(m) { return Object.keys(m.inv).some(k=>m.inv[k]>0); },
            renderAnim: Anim.glow('S', 's', '#009688')
        },
        'machine_filter_pipe': {
            id: 'machine_filter_pipe', name: 'Filter Item Pipe', color: '#424242',
            rotations: genRot4({ w: 1, h: 1, art: ["F"], outX: 1, outY: 0 }),
            energy: { type: 'none' }, maxStack: 5,
            updateOverride: function(m, r, dt) {
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
            isWorking: function(m) { return Object.keys(m.inv).some(k=>m.inv[k]>0); },
            renderAnim: Anim.glow('F', 'f', '#424242')
        },
        'machine_kiln': { 
            id: 'machine_kiln', name: 'Brick Kiln', color: '#8d6e63', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|K|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0, 
            recipes: [{ in: {'stone': 2}, out: {'stone_brick': 1} }],
            renderAnim: Anim.glow('K', '#', '#ff5722')
        },
        'machine_coke_oven': { 
            id: 'machine_coke_oven', name: 'Coke Oven', color: '#424242', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|CC|", "|CC|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'none' }, processTime: 5.0, 
            recipes: [{ in: {'coal': 3}, out: {'coke': 1, 'coal_tar': 1} }],
            renderAnim: Anim.glow('C', 'c', '#ff5722')
        },
        'machine_bessemer': { 
            id: 'machine_bessemer', name: 'Bessemer Converter', color: '#546e7a', 
            rotations: [
                { w: 6, h: 8, art: ["/----\\", "| || |", "| || |", "| || |", "|<BB>|", "|\\==/|", "| || |", "\\-vv-/"], outX: 2, outY: 8 },
                { w: 8, h: 6, art: ["/------\\", "|-===--|", "|<BBBB>|", "|------|", "|      |", "\\------/"], outX: -1, outY: 2 }
            ], 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 8.0, 
            recipes: [{ in: {'iron_ingot': 4, 'coke': 3}, out: {'steel_ingot': 2} }],
            renderAnim: Anim.wave('=', '#ffeb3b')
        },
        'machine_steam_stamp_mill': { 
            id: 'machine_steam_stamp_mill', name: 'Steam Stamp Mill', color: '#8d6e63', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|SS|", "|SS|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.0, 
            recipes: [{ in: {'iron_ore': 1, 'nickel_ore': 1}, out: {'bimetal_dust': 2} }],
            renderAnim: Anim.glow('S', 's')
        },
        'machine_slurry_vat': { 
            id: 'machine_slurry_vat', name: 'Acidic Slurry Vat', color: '#00897b', 
            rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|~~|", "\\-v/"], outX: 2, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "<~|", "|~|", "\\-/"], outX: -1, outY: 1 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 4.0, 
            recipes: [{ in: {'bimetal_dust': 2, 'coal_tar': 1, 'water': 1}, out: {'treated_bimetal_slurry': 2} }],
            renderAnim: Anim.glow('~', '-', '#4db6ac')
        },
        'machine_slurry_centrifuge': { 
            id: 'machine_slurry_centrifuge', name: 'Slurry Centrifuge', color: '#7cb342', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|@|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 2.5, 
            recipes: [{ in: {'treated_bimetal_slurry': 2}, out: {'pure_invar_dust': 2} }],
            renderAnim: Anim.spin('@')
        },
        'machine_flux_agglomerator': { 
            id: 'machine_flux_agglomerator', name: 'Flux Agglomerator', color: '#f4511e', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|%%|", "|%%|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 3.5, 
            recipes: [{ in: {'pure_invar_dust': 2, 'coke': 1}, out: {'invar_pellet': 2} }],
            renderAnim: Anim.glow('%', 'o')
        },
        'machine_blast_roaster': { 
            id: 'machine_blast_roaster', name: 'Blast Roaster', color: '#d32f2f', 
            rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|***|", "|***|", "|***|", "\\-v-/"], outX: 2, outY: 5 }), 
            energy: { type: 'burner', fuel: 'coke', usage: 1 }, processTime: 5.0, 
            recipes: [{ in: {'invar_pellet': 1}, out: {'calcined_invar_pellet': 1} }],
            renderAnim: Anim.fire('*', '#ff9800')
        },
        'machine_induction_foundry': { 
            id: 'machine_induction_foundry', name: 'Induction Foundry', color: '#512da8', 
            rotations: genRot4({ w: 7, h: 10, art: ["/-----\\", "| === |", "| (O) |", "|  |  |", "| ||| |", "| ||| |", "|  |  |", "| (O) |", "| === |", "\\--v--/"], outX: 3, outY: 10 }, { w: 10, h: 7, art: ["/--------\\", "| ==  == |", "| (O)(O) |", "<--||||--|", "| (O)(O) |", "| ==  == |", "\\--------/"], outX: -1, outY: 3 }), 
            energy: { type: 'fluid', fuel: 'lava', usage: 5 }, processTime: 8.0, 
            recipes: [{ in: {'calcined_invar_pellet': 2}, out: {'invar_ingot': 1} }],
            renderAnim: function(char, t) { if (char === '|') return { char: t===0 ? '|' : '!', color: '#ffeb3b' }; if (char === 'O') return { char: t===0 ? 'O' : 'o', color: '#00bcd4' }; return null; }
        },
        'machine_electrolyzer': {
            id: 'machine_electrolyzer', name: 'Electrolyzer', color: '#00bcd4',
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "+W-", "\\O/"], outX: 1, outY: 3, out2X: 3, out2Y: 1 }),
            energy: { type: 'electric', usage: 10 }, processTime: 2.0, recipes: [], // handled via override
            recipes: [
                { in: {'water': 1}, out: {'oxygen': 1}, out2: {'hydrogen': 2} },
                { in: {'brine': 1}, out: {'chlorine': 1}, out2: {'hydrogen': 1} },
        { in: {'heavy_water': 1}, out: {'oxygen': 1}, out2: {'deuterium': 2} }
            ],
            updateOverride: function(m, r, dt) {
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
            isWorking: function(m) { return (m.energy >= 10 && ((m.inv['water'] || 0) >= 1 || (m.inv['brine'] || 0) >= 1 || (m.inv['heavy_water'] || 0) >= 1)); },
            renderAnim: function(char, t) {
                if (char === '+') return { char: t===0 ? '+' : '*', color: '#ff9800' };
                if (char === '-') return { char: t===0 ? '-' : '~', color: '#03a9f4' }; return null;
            }
        },
        'machine_arc_oxygen_furnace': {
            id: 'machine_arc_oxygen_furnace', name: 'Arc Oxygen Furnace', color: '#0288d1',
            rotations: genRot4({ w: 9, h: 8, art: ["/-------\\", "|  +++  |", "| +O=O+ |", "| +===+ |", "| +===+ |", "|  +++  |", "|       |", "\\---v---/"], outX: 4, outY: 8 }, { w: 8, h: 9, art: ["/------\\", "|  ++  |", "| +==+ |", "< O==+ |", "| O==+ |", "| +==+ |", "|  ++  |", "|      |", "\\------/"], outX: -1, outY: 3 }),
            energy: { type: 'electric', usage: 50 }, processTime: 4.0,
            recipes: [{ in: {'iron_ingot': 3, 'coke': 2, 'oxygen': 1}, out: {'steel_ingot': 3} }],
            renderAnim: Anim.wave('=', '#81d4fa')
        },
        'machine_tar_mixer': { 
            id: 'machine_tar_mixer', name: 'Tar Mixer', color: '#424242', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|T|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 3.0, 
            recipes: [{ in: {'coal_tar': 1, 'coke': 1}, out: {'tarred_coke': 1} }],
            renderAnim: Anim.spin('T')
        },
        'machine_baking_oven': { 
            id: 'machine_baking_oven', name: 'Baking Oven', color: '#ff5722', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|BB|", "|BB|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 4.0, 
            recipes: [{ in: {'tarred_coke': 1}, out: {'baked_carbon': 1} }],
            renderAnim: Anim.glow('B', 'b', '#ff5722')
        },
        'machine_graphitizer': { 
            id: 'machine_graphitizer', name: 'Graphitizer', color: '#d84315', 
            rotations: genRot4({ w: 5, h: 4, art: ["/---\\", "|~G~|", "|~~~|", "\\-v-/"], outX: 2, outY: 4 }, { w: 4, h: 5, art: ["/--\\", "<~~|", "|~G|", "|~~|", "\\--/"], outX: -1, outY: 2 }), 
            energy: { type: 'fluid', fuel: 'lava', usage: 2 }, processTime: 5.0, 
            recipes: [{ in: {'baked_carbon': 1}, out: {'raw_graphite': 1} }],
            renderAnim: Anim.glow('G', 'g', '#ff5722')
        },
        'machine_acid_bath': { 
            id: 'machine_acid_bath', name: 'Acid Wash Bath', color: '#00897b', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|WW|", "|WW|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 3.0, 
            recipes: [{ in: {'raw_graphite': 1, 'sulfuric_acid': 1}, out: {'washed_carbon': 1} }],
            renderAnim: Anim.wave('W', '#00bcd4')
        },
        'machine_vacuum_calciner': { 
            id: 'machine_vacuum_calciner', name: 'Vacuum Calciner', color: '#455a64', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|VV|", "|VV|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'electric', usage: 15 }, processTime: 4.0, 
            recipes: [{ in: {'washed_carbon': 1}, out: {'high_purity_carbon': 1} }],
            renderAnim: Anim.glow('V', 'v', '#ff9800')
        },
        'machine_sulfuric_scrubber': {
            id: 'machine_sulfuric_scrubber', name: 'Sulfuric Scrubber', color: '#ffeb3b',
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|SS|", "|SS|", "\\-v/"], outX: 2, outY: 4 }),
            energy: { type: 'none' }, processTime: 4.0,
            recipes: [{ in: {'coke': 4}, out: {'sulfur': 1} }],
            renderAnim: Anim.wave('S', '#ffeb3b')
        },
        'machine_chemical_mixer': {
            id: 'machine_chemical_mixer', name: 'Chemical Mixer', color: '#4db6ac',
            rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|C=C|", "|C=C|", "|C=C|", "\\-v-/"], outX: 2, outY: 5 }),
            energy: { type: 'electric', usage: 5 }, processTime: 3.0,
            recipes: [
                { in: {'sulfur': 1, 'hydrogen': 1, 'oxygen': 1}, out: {'sulfuric_acid': 1} },
                { in: {'water': 1, 'salt': 1}, out: {'brine': 2} }
            ],
            renderAnim: Anim.wave('=', '#b2ebf2')
        },
        'machine_catalytic_reactor': {
            id: 'machine_catalytic_reactor', name: 'Catalytic Reactor', color: '#ff9800',
            rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|CR|", "|~~|", "|CR|", "\\-v/"], outX: 2, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "<C~C|", "|R~R|", "\\---/"], outX: -1, outY: 1 }),
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0,
            recipes: [{ in: {'sulfur_dioxide': 2, 'oxygen': 1, 'water': 1}, out: {'sulfuric_acid': 2} }],
            renderAnim: function(char, t) { if (char === '~') return { char: t===0 ? '-' : '~', color: '#ffb74d' }; return null; }
        },
        'machine_desalinator': {
            id: 'machine_desalinator', name: 'Desalinator', color: '#00838f',
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|D|", "\\v/"], outX: 1, outY: 3 }),
            energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 3.0,
            recipes: [{ in: {'water': 1}, out: {'salt': 1} }],
            renderAnim: Anim.glow('D', 'd', '#00bcd4')
        },
        'machine_pumpjack': { 
            id: 'machine_pumpjack', name: 'Pumpjack', color: '#212121', 
            rotations: genRot4({ w: 5, h: 3, art: ["/---\\", "| P |", "\\-v-/"], outX: 2, outY: 3 }, { w: 3, h: 5, art: ["/-\\", "< |", "|P|", "| |", "\\-/"], outX: -1, outY: 2 }), 
            energy: { type: 'electric', usage: 10 }, processTime: 2.0, 
            updateOverride: function(m, r, dt) {
                m.energy = m.energy || 0;
                if (m.energy >= 10 && m.oreType === 'crude_oil' && m.timer >= 2.0) { 
                    m.timer = 0; m.energy -= 10; m.outBuffer['crude_oil'] = (m.outBuffer['crude_oil'] || 0) + 1; 
                }
            },
            renderAnim: function(char, t) { 
                if (char === 'P') return { char: t===0 ? 'P' : 'p', color: '#ff9800' }; 
                if (char === '-') return { char: t===0 ? '-' : '_', color: '#e65100' };
                if (char === 'v' || char === '^' || char === '<' || char === '>') return { char: t===0 ? char : '*', color: '#ff9800' };
                return null; 
            },
            isWorking: function(m) { return m.oreType === 'crude_oil' && m.energy >= 10; }
        },
        'machine_heavy_tower': {
            id: 'machine_heavy_tower', name: 'Heavy Distillation Tower', color: '#546e7a',
            rotations: genRot4({ w: 7, h: 9, art: ["/-----\\", "|  H  |", "| === |", "| === |", "| === |", "| === |", "| === |", "|  H  |", "\\--v-v/"], outX: 3, outY: 9, out2X: 5, out2Y: 9 }, { w: 9, h: 7, art: ["/-------\\", "| H===H |", "< ===== |", "| ===== |", "< ===== |", "| H===H |", "\\-------/"], outX: -1, outY: 2, out2X: -1, out2Y: 4 }),
            energy: { type: 'electric', usage: 30 }, processTime: 5.0,
            recipes: [{ in: {'crude_oil': 3}, out: {'semi_refined_oil': 2}, out2: {'heavy_oil': 1, 'sour_water': 1} }],
            renderAnim: Anim.wave('=', '#212121')
        },
        'machine_light_tower': {
            id: 'machine_light_tower', name: 'Light Distillation Tower', color: '#78909c',
            rotations: genRot4({ w: 6, h: 8, art: ["/----\\", "| LL |", "| == |", "| == |", "| == |", "| == |", "| LL |", "\\-v-v/"], outX: 2, outY: 8, out2X: 4, out2Y: 8 }, { w: 8, h: 6, art: ["/------\\", "| L==L |", "< ==== |", "< ==== |", "| L==L |", "\\------/"], outX: -1, outY: 2, out2X: -1, out2Y: 3 }),
            energy: { type: 'electric', usage: 25 }, processTime: 4.0,
            recipes: [{ in: {'semi_refined_oil': 3}, out: {'light_oil': 2}, out2: {'unrefined_gas': 1} }],
            renderAnim: Anim.wave('=', '#ffb300')
        },
        'machine_gas_tower': {
            id: 'machine_gas_tower', name: 'Gas Distillation Tower', color: '#b0bec5',
            rotations: genRot4({ w: 4, h: 6, art: ["/--\\", "|GG|", "|==|", "|==|", "|GG|", "\\-v/"], outX: 2, outY: 6 }, { w: 6, h: 4, art: ["/----\\", "<G==G|", "|G==G|", "\\----/"], outX: -1, outY: 1 }),
            energy: { type: 'electric', usage: 20 }, processTime: 3.0,
            recipes: [{ in: {'unrefined_gas': 2}, out: {'petroleum_gas': 2} }],
            renderAnim: Anim.wave('=', '#e0f7fa')
        },
        'machine_centrifuge_oil': { 
            id: 'machine_centrifuge_oil', name: 'Sour Water Centrifuge', color: '#cddc39', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|@@|", "|@@|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'electric', usage: 10 }, processTime: 2.5, 
            recipes: [{ in: {'sour_water': 2}, out: {'sulfur': 1} }],
            renderAnim: Anim.spin('@')
        },
        'machine_asphalt_mixer': { 
            id: 'machine_asphalt_mixer', name: 'Asphalt Mixer', color: '#424242', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|AM|", "|~~|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'electric', usage: 15 }, processTime: 3.0, 
            recipes: [{ in: {'heavy_oil': 1, 'gravel': 2, 'sand': 1}, out: {'asphalt': 2} }],
            renderAnim: Anim.wave('~', '#212121')
        },
        'machine_gas_generator': { 
            id: 'machine_gas_generator', name: 'Gas Generator', color: '#00acc1', 
            rotations: [{ w: 5, h: 5, art: ["/GGG\\", "|~~~|", "|~~~|", "|~~~|", "\\GGG/"], outX:null, outY:null }], 
            energy: { type: 'none' }, 
            updateOverride: function(m, r, dt) { 
                m.inv = m.inv || {}; m.energy = m.energy || 0; 
                if (m.energy < 100000 && m.timer >= 1.0) { 
                    if (m.inv['petroleum_gas'] > 0) { m.timer = 0; m.inv['petroleum_gas']--; m.energy = Math.min(100000, m.energy + 2500); } 
                    else if (m.inv['hydrogen'] > 0) { m.timer = 0; m.inv['hydrogen']--; m.energy = Math.min(100000, m.energy + 20); }
                } 
            },
            renderAnim: function(char, t) { 
                if (char === '~') return { char: t===0 ? '^' : '*', color: '#81d4fa' }; 
                if (char === 'G') return { char: t===0 ? 'G' : '9', color: '#00e5ff' }; // Spinning Cyan G's
                return null; 
            },
            isWorking: function(m) { return m.inv && ((m.inv['petroleum_gas'] > 0) || (m.inv['hydrogen'] > 0)) && (m.energy || 0) < 100000; }
        },
        'machine_naphtha_cracker': {
            id: 'machine_naphtha_cracker', name: 'Naphtha Cracker', color: '#ffb300',
            rotations: genRot4({ w: 4, h: 5, art: ["/--\\", "|NC|", "|==|", "|==|", "\\-v/"], outX: 2, outY: 5 }, { w: 5, h: 4, art: ["/---\\", "<N==|", "|C==|", "\\---/"], outX: -1, outY: 1 }),
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0,
            recipes: [{ in: {'light_oil': 2}, out: {'naphtha': 2} }],
            renderAnim: Anim.wave('=', '#ffcc80')
        },
        'machine_polymerizer': {
            id: 'machine_polymerizer', name: 'Polymerizer', color: '#78909c', // Changed to Darker Grey-Blue
            rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| PP|", "| ==|", "| PP|", "\\-v-/"], outX: 2, outY: 5 }),
            energy: { type: 'electric', usage: 20 }, processTime: 3.5,
            recipes: [{ in: {'naphtha': 1, 'chlorine': 1}, out: {'liquid_plastic': 1} }],
            renderAnim: Anim.wave('=', '#546e7a')
        },
        'machine_pellet_extruder': {
            id: 'machine_pellet_extruder', name: 'Pellet Extruder', color: '#90a4ae', // Changed to Slate Grey
            rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|PE|", "\\-v/"], outX: 2, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "<P|", "|E|", "\\-/"], outX: -1, outY: 1 }),
            energy: { type: 'electric', usage: 10 }, processTime: 2.0,
            recipes: [{ in: {'liquid_plastic': 1}, out: {'plastic_pellet': 2} }],
            renderAnim: Anim.glow('E', 'e', '#90a4ae')
        },
        // --- SAND TO SILICA PIPELINE (7 Stages) ---
        'machine_sand_washer': { id: 'machine_sand_washer', name: 'Sand Washer', color: '#03a9f4', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|W|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'none' }, processTime: 2.0, recipes: [{ in: {'sand': 1, 'water': 1}, out: {'washed_sand': 1} }], renderAnim: Anim.wave('W', '#03a9f4') },
        'machine_thermal_desorber': { id: 'machine_thermal_desorber', name: 'Thermal Desorber', color: '#ff5722', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|T|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'burner', fuel: 'coal', usage: 1 }, processTime: 3.0, recipes: [{ in: {'washed_sand': 1}, out: {'dry_sand': 1} }], renderAnim: Anim.fire('T') },
        'machine_magnetic_separator': { id: 'machine_magnetic_separator', name: 'Magnetic Separator', color: '#795548', 
            rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|M |", "\\v-/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "< |", "|M|", "\\-/"], outX: -1, outY: 1 }), 
            energy: { type: 'electric', usage: 15 }, processTime: 2.5, recipes: [{ in: {'dry_sand': 1}, out: {'non_magnetic_sand': 1}, chanceOut: {item: 'bimetal_dust', chance: 0.2} }], renderAnim: Anim.glow('M', 'm', '#e91e63') },
        'machine_acid_leaching_vat': { id: 'machine_acid_leaching_vat', name: 'Acid Leaching Vat', color: '#cddc39', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|AL|", "|AL|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'fluid', fuel: 'steam', usage: 2 }, processTime: 4.0, recipes: [{ in: {'non_magnetic_sand': 1, 'sulfuric_acid': 1}, out: {'leached_sand': 1} }], renderAnim: Anim.wave('L', '#cddc39') },
        'machine_flotation_cell': { id: 'machine_flotation_cell', name: 'Flotation Cell', color: '#00bcd4', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|FC|", "|FC|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'electric', usage: 20 }, processTime: 3.5, recipes: [{ in: {'leached_sand': 1, 'water': 1}, out: {'high_grade_silica': 1} }], renderAnim: Anim.wave('C', '#00bcd4') },
        'machine_calcination_kiln': { id: 'machine_calcination_kiln', name: 'Calcination Kiln', color: '#d84315', 
            rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "| C |", "| C |", "| C |", "\\-v-/"], outX: 2, outY: 5 }), 
            energy: { type: 'burner', fuel: 'coke', usage: 1 }, processTime: 5.0, recipes: [{ in: {'high_grade_silica': 1}, out: {'quartz_sand': 1} }], renderAnim: Anim.fire('C') },
        'machine_arc_purifier': { id: 'machine_arc_purifier', name: 'Arc Purifier', color: '#00838f', 
            rotations: genRot4({ w: 5, h: 5, art: ["/---\\", "|+++|", "|+P+|", "|+++|", "\\-v-/"], outX: 2, outY: 5 }), 
            energy: { type: 'electric', usage: 100 }, processTime: 6.0, recipes: [{ in: {'quartz_sand': 2}, out: {'pure_silica': 1} }], renderAnim: Anim.glow('+', '*', '#00ffff') },

        // --- SILICON WAFER PIPELINE (3 Stages) ---
        'machine_czochralski_puller': { 
            id: 'machine_czochralski_puller', name: 'Czochralski Puller', color: '#455a64', 
            rotations: genRot4({ w: 4, h: 6, art: ["/--\\", "|CZ|", "|CZ|", "|CZ|", "|CZ|", "\\-v/"], outX: 2, outY: 6 }, { w: 6, h: 4, art: ["/----\\", "<CCCC|", "|ZZZZ|", "\\----/"], outX: -1, outY: 1 }), 
            energy: { type: 'electric', usage: 150 }, processTime: 10.0, 
            recipes: [{ in: {'pure_silica': 4}, out: {'silicon_ingot': 1} }],
            isWorking: function(m) { return m.hasHepa && ((m.energy || 0) >= 150) && ((m.inv['pure_silica'] || 0) >= 4); },
            updateOverride: function(m, r, dt) { 
                if (!m.hasHepa) return; 
                
                if (m.timer >= 10.0 && m.energy >= 150 && m.inv['pure_silica'] >= 4) {
                    m.timer = 0; m.energy -= 150; m.inv['pure_silica'] -= 4; m.outBuffer['silicon_ingot'] = (m.outBuffer['silicon_ingot']||0)+1;
                }
            },
            renderAnim: Anim.glow('Z', 'z', '#00bcd4')
        },
        'machine_wafer_saw': { id: 'machine_wafer_saw', name: 'Wafer Saw', color: '#37474f', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|S|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'electric', usage: 50 }, processTime: 4.0, recipes: [{ in: {'silicon_ingot': 1}, out: {'raw_silicon_wafer': 4} }], renderAnim: Anim.spin('S') },
        'machine_wafer_polisher': { id: 'machine_wafer_polisher', name: 'Wafer Polisher', color: '#37474f', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|WP|", "|WP|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'electric', usage: 40 }, processTime: 3.0, recipes: [{ in: {'raw_silicon_wafer': 1}, out: {'polished_silicon_wafer': 1} }], renderAnim: Anim.spin('P') },

        // --- CRYSTAL LENS PIPELINE (2 Stages) ---
        'machine_lens_caster': { id: 'machine_lens_caster', name: 'Lens Caster', color: '#b3e5fc', 
            rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|L|", "\\v/"], outX: 1, outY: 3 }), 
            energy: { type: 'electric', usage: 30 }, processTime: 5.0, recipes: [{ in: {'pure_silica': 2}, out: {'rough_lens': 1} }], renderAnim: Anim.glow('L', 'l', '#b3e5fc') },
        'machine_optical_grinder': { id: 'machine_optical_grinder', name: 'Optical Grinder', color: '#00b0ff', 
            rotations: genRot4({ w: 4, h: 3, art: ["/--\\", "|OG|", "\\v-/"], outX: 1, outY: 3 }, { w: 3, h: 4, art: ["/-\\", "<O|", "|G|", "\\-/"], outX: -1, outY: 1 }), 
            energy: { type: 'electric', usage: 40 }, processTime: 4.0, recipes: [{ in: {'rough_lens': 1}, out: {'crystal_lens': 1} }], renderAnim: Anim.spin('G') },

        // --- MASKS, LITHOGRAPHY, AND COMPUTE ---
        'machine_stencil_press': { 
            id: 'machine_stencil_press', name: 'Stencil Press', color: '#607d8b', 
            rotations: genRot4({ w: 4, h: 4, art: ["/--\\", "|SP|", "|SP|", "\\-v/"], outX: 2, outY: 4 }), 
            energy: { type: 'electric', usage: 20 }, processTime: 4.0, 
            renderAnim: Anim.glow('P', 'p', '#607d8b'),
            // DUMMY RECIPES FOR AUTO-WIKI (Game loop ignores this due to updateOverride)
            recipes: [
                { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'cpu_mask': 1} }, { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'gpu_mask': 1} },
                { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'rom_mask': 1} }, { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'ram_mask': 1} },
                { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'ssd_mask': 1} }, { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'power_mask': 1} },
                { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'clock_mask': 1} }, { in: {'lead_plate': 1, 'steel_plate': 1}, out: {'io_mask': 1} }
            ],
            updateOverride: function(m, r, dt) {
                
                if (m.timer >= 4.0 && m.energy >= 20 && m.inv['lead_plate'] >= 1 && m.inv['steel_plate'] >= 1) {
                    let targetMask = m.filters?.out1?.[0]; 
                    const validMasks = ['cpu_mask','gpu_mask','rom_mask','ram_mask','ssd_mask','power_mask','clock_mask','io_mask'];
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
                { in: {'polished_silicon_wafer': 1, 'cpu_mask': 1}, out: {'cpu_ic': 1} }, { in: {'polished_silicon_wafer': 1, 'gpu_mask': 1}, out: {'gpu_ic': 1} },
                { in: {'polished_silicon_wafer': 1, 'rom_mask': 1}, out: {'rom_ic': 1} }, { in: {'polished_silicon_wafer': 1, 'ram_mask': 1}, out: {'ram_ic': 1} },
                { in: {'polished_silicon_wafer': 1, 'ssd_mask': 1}, out: {'ssd_ic': 1} }, { in: {'polished_silicon_wafer': 1, 'power_mask': 1}, out: {'power_ic': 1} },
                { in: {'polished_silicon_wafer': 1, 'clock_mask': 1}, out: {'clock_ic': 1} }, { in: {'polished_silicon_wafer': 1, 'io_mask': 1}, out: {'io_ic': 1} }
            ],
            isWorking: function(m) { 
                if (!m.hasHepa || (m.energy || 0) < 500 || (m.inv['polished_silicon_wafer']||0) < 1) return false;
                const maskToIC = { 'cpu_mask':'cpu_ic', 'gpu_mask':'gpu_ic', 'rom_mask':'rom_ic', 'ram_mask':'ram_ic', 'ssd_mask':'ssd_ic', 'power_mask':'power_ic', 'clock_mask':'clock_ic', 'io_mask':'io_ic' };
                return Object.keys(maskToIC).some(k => (m.inv[k]||0) >= 1);
            },
            updateOverride: function(m, r, dt) {
                if (!m.hasHepa) return; 
                
                if (m.timer >= 8.0 && m.energy >= 500 && m.inv['polished_silicon_wafer'] >= 1) {
                    const maskToIC = { 'cpu_mask':'cpu_ic', 'gpu_mask':'gpu_ic', 'rom_mask':'rom_ic', 'ram_mask':'ram_ic', 'ssd_mask':'ssd_ic', 'power_mask':'power_ic', 'clock_mask':'clock_ic', 'io_mask':'io_ic' };
                    let usedMask = Object.keys(maskToIC).find(k => m.inv[k] >= 1);
                    if (usedMask) {
                        m.timer = 0; m.energy -= 500; m.inv['polished_silicon_wafer']--; 
                        m.outBuffer[maskToIC[usedMask]] = (m.outBuffer[maskToIC[usedMask]]||0)+1;
                    }
                }
            }
        },
        'machine_hepa_purifier': { 
            id: 'machine_hepa_purifier', name: 'HEPA Air Purifier', color: '#00695c', 
            rotations: genRot4({ w: 2, h: 2, art: ["HA", "PH"], outX: null, outY: null }), 
            energy: { type: 'electric', usage: 50 }, processTime: 1.0, 
            renderAnim: Anim.wave('H', '#00bcd4'),
            isWorking: function(m) { return (m.energy || 0) >= 50; },
            updateOverride: function(m, r, dt) { if(m.timer>=1){ m.timer=0; if(m.energy>=50) m.energy-=50; } }
        },
        'machine_cdh': {
            id: 'machine_cdh', name: 'Central Digital Hub', color: '#00e5ff',
            rotations:[ { w: 4, h: 4, art: ["/--\\", "|CD|", "|CD|", "\\--/"], outX: null, outY: null } ],
            energy: { type: 'electric', usage: 20 }, maxEnergy: 10000,
            renderAnim: Anim.glow('C', 'c', '#00e5ff'),
            isWorking: function(m) { return (m.energy || 0) >= 20 && m.dataGrid; },
            updateOverride: function(m, r, dt) {
    if (m.timer >= 1.0) {
        m.timer = 0;
        
        if (m.energy >= 20 && m.dataGrid) {
            m.energy -= 20; // Consume base operating power
            
            const digiStorage =[];
            const digiItems   = {};
            
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
            
            m.digiStorage  = digiStorage;
            m.digiItems    = digiItems;
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
                    const targets = node.filters?.out1 ||[];
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
            m.jobs = (m.jobs ||[]).filter(j => !j.isRequesterJob);
            for (const node of m.dataGrid.machines) {
                if (!node || node.type !== 'machine_digital_requester') continue;
                const tItem = (node.reqItem || '').trim();
                const tQty  = node.reqQty || 0;
                
                if (!tItem || tQty <= 0) continue;

                const inDisk   = digiItems[tItem] || 0;
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
            let machines = [], defenseNodes =[];
            let activeRadar = m.dataGrid.machines.some(rm => rm && rm.type === 'machine_defense_radar' && rm.def.isWorking(rm));
            
            for (let nm of m.dataGrid.machines) {
                if (['machine_slug_turret', 'machine_chain_gunner', 'machine_defense_radar', 'machine_defense_node'].includes(nm.type)) defenseNodes.push(nm);
                else machines.push(nm);
            }

            let currentItems = {}, powerDemand = 0, powerStored = 0;
            let idleMachines = 0, workingMachines = 0, bottlePower = 0, bottleInput = 0, bottleOutput = 0, bottleneckDetails = {};

            for (let nm of machines) {
                let buffers =[nm.inv || {}, nm.outBuffer || {}, nm.out2Buffer || {}];
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
            for(let itm in currentItems) { 
                let diff = currentItems[itm] - (m.cdhHistory[itm] || 0); 
                if (diff !== 0) m.cdhRates[itm] = diff; 
            }
            for(let itm in m.cdhHistory) {
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
        renderAnim: function(char, t) {
            return { color: t === 0 ? '#4527a0' : '#5e35b1' };
        }
    },
'machine_pellet_grinder': {
    id: 'machine_pellet_grinder', name: 'Pellet Grinder', color: '#607d8b',
    rotations: genRot4({ w: 3, h: 3, art: ["/-\\", "|#|", "\\v/"], outX: 1, outY: 3 }),
    energy: { type: 'fluid', fuel: 'steam', usage: 1 }, processTime: 2.0,
    recipes: [{ in: {'stone': 1}, out: {'rock_pellet': 4} }, { in: {'iron_ingot': 1}, out: {'iron_pellet': 8} }],
    renderAnim: Anim.spin('#')
},
'machine_slug_turret': {
    id: 'machine_slug_turret', name: 'Steam Slug Turret', color: '#5d4037',
    rotations: genRot4({ w: 2, h: 2, art: ["TT", "[]"], outX: null, outY: null }),
    energy: { type: 'fluid', fuel: 'steam', usage: 0 }, // Consumes steam only when firing
    maxStack: 200,
    updateOverride: function(m, r, dt) {
        
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
            isWorking: function(m) { return (m.energy || 0) >= 10; }, // FIX 2: Added a dedicated status check
            updateOverride: function(m, r, dt) {
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
            rotations:[ { w: 2, h: 2, art: ["!!", "##"], outX: null, outY: null } ],
            energy: { type: 'electric', usage: 20 },
            updateOverride: function(m, r, dt) {
                if (m.timer >= 0.2 && (m.energy||0) >= 5 && m.inv['iron_pellet'] >= 1) {
                     // FIX 1: Safely ask the radar if it's working using isWorking()
                     let radarActive = m.dataGrid && m.dataGrid.machines.some(rm => rm && rm.type === 'machine_defense_radar' && rm.def.isWorking(rm));
                     
                     if (radarActive) {
                         let target = findNearestMonster(m.x, m.y, 25); 
                         if (target) { m.timer = 0; m.energy -= 5; m.inv['iron_pellet']--; fireProjectile(m.x + 0.5, m.y + 0.5, target, 15, 40, '#ffd700'); }
                     }
                }
            }
        },
    };
    MACHINE_DEFS['machine_acid_leaching_vat'].recipes.push({ 
        in: {'pulverized_stone': 2, 'sulfuric_acid': 1}, 
        out: {'uranium_rich_slurry': 2} 
    });
    // Inject the missing Step 4 into the Vacuum Calciner
    MACHINE_DEFS['machine_vacuum_calciner'].recipes.push({ 
        in: {'toxic_filter_cake': 1}, 
        out: {'dry_uranic_crust': 1} 
    });

    // Auto-generate Ore Tripling Recipes
    for(let o of ORES) {
        MACHINE_DEFS['machine_bronze_crusher'].recipes.push({ in: {[`${o}_ore`]: 1}, out: {[`ore_piece_${o}`]: 3}, chanceOut: {item:`ore_piece_${o}`, chance:0.15} });
        MACHINE_DEFS['machine_bronze_mill'].recipes.push({ in: {[`ore_piece_${o}`]: 1}, out: {[`dirty_dust_${o}`]: 1} });
        MACHINE_DEFS['machine_bronze_washer'].recipes.push({ in: {[`dirty_dust_${o}`]: 1, 'water': 1}, out: {[`clean_dust_${o}`]: 1} });
        // Roaster outputs pure dust AND SO2 Gas
        MACHINE_DEFS['machine_bronze_roaster'].recipes.push({ in: {[`clean_dust_${o}`]: 1}, out: {[`pure_dust_${o}`]: 1}, out2: {'sulfur_dioxide': 1} });
        MACHINE_DEFS['machine_bronze_furnace'].recipes.push({ in: {[`pure_dust_${o}`]: 1}, out: {[`${o}_ingot`]: 1} });
    }
    MACHINE_DEFS['machine_bronze_crusher'].recipes.push({ in: {'stone': 1}, out: {'gravel': 2} });
    MACHINE_DEFS['machine_bronze_crusher'].recipes.push({ in: {'gravel': 1}, out: {'sand': 2} });
    MACHINE_DEFS['machine_furnace_coal'].recipes.push({ in: {'sand': 1}, out: {'glass': 1} });
    MACHINE_DEFS['machine_furnace_electric'].recipes.push({ in: {'sand': 1}, out: {'glass': 1} });
    MACHINE_DEFS['machine_bronze_furnace'].recipes.push({ in: {'sand': 1}, out: {'glass': 1} });
    
export const recipes = [
        { name: "Wooden Pickaxe", env: "hand", output: { id: "wood_pickaxe", amount: 1 }, input: { "wood": 5 } },
        { name: "Stone Pickaxe", env: "hand", output: { id: "stone_pickaxe", amount: 1 }, input: { "stone": 5 } },
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
{ name: "Chain Gunner", env: "table", output: { id: "machine_chain_gunner", amount: 1 }, input: { "steel_plate": 50, "motor": 10, "cpu_ic": 2 } }
    
    
    
    
    
    ];




