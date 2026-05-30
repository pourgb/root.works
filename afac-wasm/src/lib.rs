use wasm_bindgen::prelude::*;
use js_sys::Math;
use serde::{Deserialize, Serialize};
use std::collections::{HashSet, HashMap};

const WORLD_SIZE: usize = 1500;
const MAP_LEN: usize = WORLD_SIZE * WORLD_SIZE;

#[derive(Serialize)]
pub struct PowerGridResult { pub net_type: u8, pub generators: Vec<usize>, pub consumers: Vec<usize>, pub storage: Vec<usize> }

#[derive(Serialize)]
pub struct DataGridResult { pub machines: Vec<usize>, pub has_radar: bool, pub has_cdh: bool }

#[derive(Deserialize)]
pub struct MachineDataInfo {
    pub id: usize, pub x: usize, pub y: usize, pub w: usize, pub h: usize,
    pub m_type: u8, pub link_x: i32, pub link_y: i32,
}

// Tile-based belt item: position is always an exact tile, no sub-tile progress.
#[derive(Clone)]
pub struct BeltItem { pub item_id: u16, pub amount: u16, pub route_id: usize, pub route_idx: usize, pub x: u16, pub y: u16 }

#[derive(Clone)]
pub struct Route { pub path: Vec<(u16, u16)> }

#[derive(Clone)]
pub struct Monster { pub x: f32, pub y: f32, pub hp: f32, pub speed: f32, pub m_type: u8, pub move_timer: f32 }
#[derive(Clone)]
pub struct Projectile { pub x: f32, pub y: f32, pub vx: f32, pub vy: f32, pub life: f32, pub dmg: f32, pub color_idx: f32 }

#[derive(Clone, Default)]
pub struct FastRecipe {
    pub in_items: Vec<(u16, u32)>,
    pub out_items: Vec<(u16, u32)>,
    pub out2_items: Vec<(u16, u32)>,
    pub chance_item: u16,
    pub chance_val: f32,
}

#[derive(Clone, Default)]
pub struct RustMachine {
    pub active_id: usize,
    pub x: u16, pub y: u16,
    pub process_time: f32,
    pub is_electric: bool,
    pub is_burner: bool,
    pub energy_fuel: u16,
    pub energy_usage: f32,
    pub max_energy: f32,

    pub timer: f32,
    pub energy: f32,

    pub inv: Vec<(u16, u32)>,
    pub out_buffer: Vec<(u16, u32)>,
    pub out2_buffer: Vec<(u16, u32)>,

    pub recipes: Vec<FastRecipe>,
    pub out_ports: Vec<(u16, u16)>,
    pub out2_ports: Vec<(u16, u16)>,
}

pub struct RustWorld {
    pub world_map: Vec<u16>, moisture_map: Vec<u8>, crop_progress: Vec<u8>,
    pub wire_map: Vec<u8>, hyper_wire_map: Vec<u8>, quartz_map: Vec<u8>,
    pub iron_map: Vec<u8>, copper_map: Vec<u8>, brass_map: Vec<u8>, gas_map: Vec<u8>, acid_map: Vec<u8>, steel_map: Vec<u8>,
    pub silver_map: Vec<u8>, insulated_map: Vec<u8>, sicu_map: Vec<u8>, plasmatic_map: Vec<u8>,
    pub analog_map: Vec<u8>,
    pub machines: Vec<Option<RustMachine>>,
    pub belt_items: Vec<BeltItem>, routes: Vec<Route>,
    pub monsters: Vec<Monster>, projectiles: Vec<Projectile>,
    pub belt_render_buffer: Vec<f32>, pub belt_finished_buffer: Vec<u32>,
    pub monster_buffer: Vec<f32>, pub projectile_buffer: Vec<f32>,
    pub machine_output_requests: Vec<u32>,
    pub monster_flow_field: Vec<u16>,
    pub combat_render_buffer: Vec<f32>,
    pub combat_hits_buffer: Vec<f32>,
    pub dead_monsters: Vec<u8>,
    // Scratch buffers to avoid per-loop Vec allocations in grid rebuilds
    pub scratch_queue: Vec<usize>,
    pub scratch_generators: Vec<usize>,
    pub scratch_consumers: Vec<usize>,
    pub scratch_storage: Vec<usize>,
    pub scratch_m_queue: Vec<usize>,
    pub scratch_cable_queue: Vec<usize>,
    pub scratch_grid_machines: Vec<usize>,
}

impl RustWorld {
    pub fn new() -> Self {
        Self {
            world_map: vec![0; MAP_LEN], moisture_map: vec![0; MAP_LEN], crop_progress: vec![0; MAP_LEN],
            wire_map: vec![0; MAP_LEN], hyper_wire_map: vec![0; MAP_LEN], quartz_map: vec![0; MAP_LEN],
            iron_map: vec![0; MAP_LEN], copper_map: vec![0; MAP_LEN], brass_map: vec![0; MAP_LEN], gas_map: vec![0; MAP_LEN], acid_map: vec![0; MAP_LEN], steel_map: vec![0; MAP_LEN],
            silver_map: vec![0; MAP_LEN], insulated_map: vec![0; MAP_LEN], sicu_map: vec![0; MAP_LEN], plasmatic_map: vec![0; MAP_LEN],
            analog_map: vec![0; MAP_LEN],
            machines: Vec::new(), belt_items: Vec::new(), routes: Vec::new(),
            monsters: Vec::new(), projectiles: Vec::new(),
            belt_render_buffer: Vec::new(), belt_finished_buffer: Vec::new(),
            monster_buffer: Vec::new(), projectile_buffer: Vec::new(),
            machine_output_requests: Vec::new(),
            monster_flow_field: vec![u16::MAX; MAP_LEN],
            combat_render_buffer: Vec::new(),
            combat_hits_buffer: Vec::new(),
            dead_monsters: Vec::new(),
            scratch_queue: Vec::new(),
            scratch_generators: Vec::new(),
            scratch_consumers: Vec::new(),
            scratch_storage: Vec::new(),
            scratch_m_queue: Vec::new(),
            scratch_cable_queue: Vec::new(),
            scratch_grid_machines: Vec::new(),
        }
    }
}

#[wasm_bindgen]
pub struct GameState {
    worlds: Vec<RustWorld>,
    active_world_idx: usize,
    tick_counter: u32,
    machine_timer: f32,
}

impl RustMachine {
    pub fn get_inv(&self, item_id: u16) -> u32 {
        self.inv.iter().find(|s| s.0 == item_id).map(|s| s.1).unwrap_or(0)
    }
    pub fn add_inv(&mut self, item_id: u16, amt: u32) {
        if let Some(slot) = self.inv.iter_mut().find(|s| s.0 == item_id) {
            slot.1 += amt;
        } else {
            self.inv.push((item_id, amt));
        }
    }
    pub fn sub_inv(&mut self, item_id: u16, amt: u32) {
        if let Some(slot) = self.inv.iter_mut().find(|s| s.0 == item_id) {
            slot.1 = slot.1.saturating_sub(amt);
        }
    }
    pub fn add_out(&mut self, item_id: u16, amt: u32) {
        if let Some(slot) = self.out_buffer.iter_mut().find(|s| s.0 == item_id) {
            slot.1 += amt;
        } else {
            self.out_buffer.push((item_id, amt));
        }
    }
    pub fn add_out2(&mut self, item_id: u16, amt: u32) {
        if let Some(slot) = self.out2_buffer.iter_mut().find(|s| s.0 == item_id) {
            slot.1 += amt;
        } else {
            self.out2_buffer.push((item_id, amt));
        }
    }
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GameState {
        GameState {
            worlds: vec![RustWorld::new()],
            active_world_idx: 0,
            tick_counter: 0,
            machine_timer: 0.0,
        }
    }

    pub fn set_active_world(&mut self, idx: usize) {
        if idx < self.worlds.len() { self.active_world_idx = idx; }
    }

    pub fn initialize_world(&mut self) -> usize {
        let idx = self.worlds.len();
        self.worlds.push(RustWorld::new());
        idx
    }

    fn active(&self) -> &RustWorld { &self.worlds[self.active_world_idx] }
    fn active_mut(&mut self) -> &mut RustWorld { &mut self.worlds[self.active_world_idx] }

    pub fn get_world_map_ptr(&self) -> *const u16 { self.active().world_map.as_ptr() }
    pub fn get_moisture_map_ptr(&self) -> *const u8 { self.active().moisture_map.as_ptr() }
    pub fn get_crop_progress_ptr(&self) -> *const u8 { self.active().crop_progress.as_ptr() }
    pub fn get_wire_map_ptr(&self) -> *const u8 { self.active().wire_map.as_ptr() }
    pub fn get_hyper_wire_map_ptr(&self) -> *const u8 { self.active().hyper_wire_map.as_ptr() }
    pub fn get_plasmatic_map_ptr(&self) -> *const u8 { self.active().plasmatic_map.as_ptr() }
    pub fn get_analog_map_ptr(&self) -> *const u8 { self.active().analog_map.as_ptr() }
    pub fn get_quartz_map_ptr(&self) -> *const u8 { self.active().quartz_map.as_ptr() }
    pub fn get_silver_map_ptr(&self) -> *const u8 { self.active().silver_map.as_ptr() }
    pub fn get_insulated_map_ptr(&self) -> *const u8 { self.active().insulated_map.as_ptr() }
    pub fn get_sicu_map_ptr(&self) -> *const u8 { self.active().sicu_map.as_ptr() }

    pub fn get_belt_render_ptr(&self) -> *const f32 { self.active().belt_render_buffer.as_ptr() }
    pub fn get_belt_render_len(&self) -> usize { self.active().belt_render_buffer.len() }
    pub fn get_belt_finished_ptr(&self) -> *const u32 { self.active().belt_finished_buffer.as_ptr() }
    pub fn get_belt_finished_len(&self) -> usize { self.active().belt_finished_buffer.len() }
    pub fn get_combat_render_ptr(&self) -> *const f32 { self.active().combat_render_buffer.as_ptr() }
    pub fn get_combat_render_len(&self) -> usize { self.active().combat_render_buffer.len() }
    pub fn get_combat_hits_ptr(&self) -> *const f32 { self.active().combat_hits_buffer.as_ptr() }
    pub fn get_combat_hits_len(&self) -> usize { self.active().combat_hits_buffer.len() }
    pub fn get_dead_monsters_ptr(&self) -> *const u8 { self.active().dead_monsters.as_ptr() }
    pub fn get_dead_monsters_len(&self) -> usize { self.active().dead_monsters.len() }
    pub fn clear_combat_events(&mut self) { 
        let mut aw = self.active_mut();
        aw.combat_hits_buffer.clear(); aw.dead_monsters.clear(); 
    }

    pub fn pickup_belt_item(&mut self, x: f32, y: f32) -> u32 {
        let mut aw = self.active_mut();
        let px = x.floor() as u16;
        let py = y.floor() as u16;
        for i in 0..aw.belt_items.len() {
            if aw.belt_items[i].x == px && aw.belt_items[i].y == py {
                let id = aw.belt_items[i].item_id as u32;
                let amount = aw.belt_items[i].amount as u32;
                aw.belt_items.remove(i);
                return (amount << 16) | id;
            }
        }
        u32::MAX
    }

    pub fn clear_belt_items_in_radius(&mut self, cx: f32, cy: f32, radius: f32) {
        let r_sq = radius * radius;
        self.active_mut().belt_items.retain(|i| {
            let dx = i.x as f32 - cx;
            let dy = i.y as f32 - cy;
            (dx * dx + dy * dy) > r_sq
        });
    }

    pub fn rebuild_monster_paths(&mut self, px: f32, py: f32) {
        let mut aw = self.active_mut();
        aw.monster_flow_field.fill(u16::MAX);
        let px = px as usize;
        let py = py as usize;
        if px == 0 || px >= WORLD_SIZE || py == 0 || py >= WORLD_SIZE { return; }

        let mut queue = std::collections::VecDeque::new();
        let start_idx = py * WORLD_SIZE + px;
        aw.monster_flow_field[start_idx] = 0;
        queue.push_back(start_idx);

        while let Some(curr) = queue.pop_front() {
            let cx = curr % WORLD_SIZE;
            let cy = curr / WORLD_SIZE;
            let c_dist = aw.monster_flow_field[curr];
            if c_dist > 60 { continue; }
            for (dx, dy) in &[(1,0), (-1,0), (0,1), (0,-1)] {
                let nx = (cx as i32 + dx) as usize;
                let ny = (cy as i32 + dy) as usize;
                if nx > 0 && nx < WORLD_SIZE - 1 && ny > 0 && ny < WORLD_SIZE - 1 {
                    let nidx = ny * WORLD_SIZE + nx;
                    if aw.world_map[nidx] < 50000 && aw.monster_flow_field[nidx] == u16::MAX {
                        aw.monster_flow_field[nidx] = c_dist + 1;
                        queue.push_back(nidx);
                    }
                }
            }
        }
    }

    pub fn process_crop_ticks(&mut self, iterations: usize) {
        let mut aw = self.active_mut();
        for _ in 0..iterations {
            let tx = (Math::random() * (WORLD_SIZE as f64 - 2.0)) as usize + 1;
            let ty = (Math::random() * (WORLD_SIZE as f64 - 2.0)) as usize + 1;
            let idx = ty * WORLD_SIZE + tx; let id = aw.world_map[idx];
            if id == 45 || id == 46 { aw.world_map[idx] = if aw.moisture_map[idx] > 0 { 46 } else { 45 }; }
            else if id == 47 {
                aw.crop_progress[idx] += 1;
                if aw.crop_progress[idx] >= if aw.moisture_map[idx] > 0 { 14 } else { 48 } {
                    aw.world_map[idx] = 48; aw.crop_progress[idx] = 0;
                }
            }
        }
    }

    pub fn remove_machine(&mut self, id: usize) {
        let mut aw = self.active_mut();
        if let Some(pos) = aw.machines.iter().flatten().position(|m| m.active_id == id) {
            aw.machines.remove(pos);
        }
    }

    pub fn clear_machines(&mut self) {
        let mut aw = self.active_mut();
        aw.machines.clear();
        aw.machine_output_requests.clear();
    }

    pub fn register_standard_machine(
        &mut self,
        id: usize, x: u16, y: u16,
        process_time: f32, is_electric: bool, is_burner: bool, energy_fuel: u16, energy_usage: f32, max_energy: f32,
        flat_recipes: &[f32], flat_ports: &[u16], flat_out2: &[u16]
    ) {
        self.remove_machine(id);
        let mut recipes = Vec::new(); let mut ptr = 0;
        while ptr < flat_recipes.len() {
            let in_len = flat_recipes[ptr] as usize; ptr += 1;
            let mut in_items = Vec::new();
            for _ in 0..in_len { in_items.push((flat_recipes[ptr] as u16, flat_recipes[ptr+1] as u32)); ptr += 2; }
            let out_len = flat_recipes[ptr] as usize; ptr += 1;
            let mut out_items = Vec::new();
            for _ in 0..out_len { out_items.push((flat_recipes[ptr] as u16, flat_recipes[ptr+1] as u32)); ptr += 2; }
            let out2_len = flat_recipes[ptr] as usize; ptr += 1;
            let mut out2_items = Vec::new();
            for _ in 0..out2_len { out2_items.push((flat_recipes[ptr] as u16, flat_recipes[ptr+1] as u32)); ptr += 2; }
            let chance_item = flat_recipes[ptr] as u16; ptr += 1;
            let chance_val = flat_recipes[ptr]; ptr += 1;
            recipes.push(FastRecipe { in_items, out_items, out2_items, chance_item, chance_val });
        }
        let mut out_ports = Vec::new();
        for i in (0..flat_ports.len()).step_by(2) { out_ports.push((flat_ports[i], flat_ports[i+1])); }
        let mut out2_ports = Vec::new();
        for i in (0..flat_out2.len()).step_by(2) { out2_ports.push((flat_out2[i], flat_out2[i+1])); }
        
        self.active_mut().machines.push(Some(RustMachine { active_id: id, x, y, process_time, is_electric, is_burner, energy_fuel, energy_usage, max_energy, timer: 0.0, energy: 0.0, inv: Vec::new(), out_buffer: Vec::new(), out2_buffer: Vec::new(), recipes, out_ports, out2_ports }));
    }

    pub fn set_machine_energy(&mut self, id: usize, energy: f32) {
        if let Some(m) = self.active_mut().machines.iter_mut().flatten().find(|m| m.active_id == id) { m.energy = energy; }
    }
    
    pub fn overwrite_machine_inv(&mut self, id: usize, flat_inv: &[u32]) {
        if let Some(m) = self.active_mut().machines.iter_mut().flatten().find(|m| m.active_id == id) {
            m.inv.clear();
            for i in (0..flat_inv.len()).step_by(2) { m.inv.push((flat_inv[i] as u16, flat_inv[i+1])); }
        }
    }
    pub fn overwrite_machine_out(&mut self, id: usize, flat_out: &[u32], is_out2: bool) {
        if let Some(m) = self.active_mut().machines.iter_mut().flatten().find(|m| m.active_id == id) {
            let target = if is_out2 { &mut m.out2_buffer } else { &mut m.out_buffer };
            target.clear();
            for i in (0..flat_out.len()).step_by(2) { target.push((flat_out[i] as u16, flat_out[i+1])); }
        }
    }

    pub fn insert_machine_item(&mut self, id: usize, item_id: u16, amt: u32) {
        if let Some(m) = self.active_mut().machines.iter_mut().flatten().find(|m| m.active_id == id) { m.add_inv(item_id, amt); }
    }

    pub fn get_machine_inv_flat(&self, id: usize) -> Vec<u32> {
        self.active().machines.iter().flatten().find(|m| m.active_id == id).map(|m| {
            let mut f = Vec::with_capacity(m.inv.len() * 2);
            for &(i, a) in &m.inv { if a > 0 { f.push(i as u32); f.push(a); }}
            f
        }).unwrap_or_default()
    }

    pub fn get_machine_out_flat(&self, id: usize, is_out2: bool) -> Vec<u32> {
        self.active().machines.iter().flatten().find(|m| m.active_id == id).map(|m| {
            let t = if is_out2 { &m.out2_buffer } else { &m.out_buffer };
            let mut f = Vec::with_capacity(t.len() * 2);
            for &(i, a) in t { if a > 0 { f.push(i as u32); f.push(a); }}
            f
        }).unwrap_or_default()
    }

    pub fn get_machine_energy(&self, id: usize) -> f32 { self.active().machines.iter().flatten().find(|m| m.active_id == id).map(|m| m.energy).unwrap_or(0.0) }

    /// Returns the normalised processing progress in [0.0, 1.0].
    /// Uses the WASM-authoritative timer so JS never needs a shadow copy.
    pub fn get_machine_timer(&self, id: usize) -> f32 {
        self.active().machines.iter().flatten().find(|m| m.active_id == id).map(|m| {
            if m.process_time <= 0.0 { return 0.0; }
            (m.timer / m.process_time).clamp(0.0, 1.0)
        }).unwrap_or(0.0)
    }
    
    pub fn dedupe_machine_out(&mut self, id: usize, item_id: u16, amt: u32, is_out2: bool) {
        if let Some(m) = self.active_mut().machines.iter_mut().flatten().find(|m| m.active_id == id) {
            if is_out2 { if let Some(s) = m.out2_buffer.iter_mut().find(|s| s.0 == item_id) { s.1 = s.1.saturating_sub(amt); } } 
            else { if let Some(s) = m.out_buffer.iter_mut().find(|s| s.0 == item_id) { s.1 = s.1.saturating_sub(amt); } }
        }
    }

    pub fn get_machine_output_requests_ptr(&self) -> *const u32 { self.active().machine_output_requests.as_ptr() }
    pub fn get_machine_output_requests_len(&self) -> usize { self.active().machine_output_requests.len() }

    pub fn tick_machines(&mut self, dt: f32) {
        let mut aw = self.active_mut();
        aw.machine_output_requests.clear();
        for m_opt in aw.machines.iter_mut() {
            if let Some(m) = m_opt {
                m.timer += dt;
                let mut has_power = true;
                if m.is_electric {
                    if m.energy < m.energy_usage { has_power = false; }
                } else if m.is_burner {
                    if m.get_inv(m.energy_fuel) < m.energy_usage as u32 { has_power = false; }
                }

                if has_power && m.timer >= m.process_time {
                    let mut valid_idx = None;
                    for (r_idx, r) in m.recipes.iter().enumerate() {
                        let mut can_craft = true;
                        for &(req_item, req_amt) in &r.in_items {
                            if m.get_inv(req_item) < req_amt { can_craft = false; break; }
                        }
                        if can_craft { valid_idx = Some(r_idx); break; }
                    }
                    if let Some(r_idx) = valid_idx {
                        m.timer = 0.0;
                        if m.is_electric { m.energy -= m.energy_usage; }
                        else if m.is_burner {
                            let fuel = m.energy_fuel;
                            let usage = m.energy_usage as u32;
                            m.sub_inv(fuel, usage);
                        }

                        let r = m.recipes[r_idx].clone();
                        for &(req_item, req_amt) in &r.in_items { m.sub_inv(req_item, req_amt); }
                        for &(out_item, out_amt) in &r.out_items { m.add_out(out_item, out_amt); }
                        for &(out_item, out_amt) in &r.out2_items { m.add_out2(out_item, out_amt); }
                        if r.chance_item > 0 && Math::random() < (r.chance_val as f64) {
                            m.add_out(r.chance_item, 1);
                        }
                    }
                }
                let m_id = m.active_id as u32;
                if !m.out_ports.is_empty() {
                    for &(item_id, amt) in &m.out_buffer {
                        if amt > 0 {
                            for &(px, py) in &m.out_ports {
                                aw.machine_output_requests.push(m_id);
                                aw.machine_output_requests.push(0);
                                aw.machine_output_requests.push(item_id as u32);
                                aw.machine_output_requests.push(amt);
                                aw.machine_output_requests.push(px as u32);
                                aw.machine_output_requests.push(py as u32);
                            }
                        }
                    }
                }
                if !m.out2_ports.is_empty() {
                    for &(item_id, amt) in &m.out2_buffer {
                        if amt > 0 {
                            for &(px, py) in &m.out2_ports {
                                aw.machine_output_requests.push(m_id);
                                aw.machine_output_requests.push(1);
                                aw.machine_output_requests.push(item_id as u32);
                                aw.machine_output_requests.push(amt);
                                aw.machine_output_requests.push(px as u32);
                                aw.machine_output_requests.push(py as u32);
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn spawn_monster(&mut self, m_type: u8, x: f32, y: f32, hp: f32, speed: f32) {
        self.active_mut().monsters.push(Monster { x: x.floor(), y: y.floor(), hp, speed, m_type, move_timer: 0.0 });
    }

    pub fn spawn_projectile(&mut self, x: f32, y: f32, vx: f32, vy: f32, life: f32, dmg: f32, color_idx: f32) { 
        self.active_mut().projectiles.push(Projectile { x, y, vx, vy, life, dmg, color_idx }); 
    }

    pub fn rebuild_power_grids(&mut self, machine_types: &[u8]) -> JsValue {
        let mut grids = Vec::new();
        let mut visited = vec![false; MAP_LEN];
        let aw = self.active_mut();

        for i in 0..MAP_LEN {
            if visited[i] { continue; }
            let is_hyper = aw.hyper_wire_map[i] > 0;
            let is_sicu = aw.sicu_map[i] > 0;
            let is_plasma = aw.plasmatic_map[i] > 0;
            
            if aw.wire_map[i] == 0 && !is_hyper && !is_sicu && !is_plasma { continue; }

            let net_type = if is_plasma { 3 } else if is_sicu { 2 } else if is_hyper { 1 } else { 0 };
            
            aw.scratch_generators.clear();
            aw.scratch_consumers.clear();
            aw.scratch_storage.clear();
            aw.scratch_queue.clear();
            aw.scratch_queue.push(i);
            visited[i] = true;
            let mut visited_machines = HashSet::new();

            while let Some(curr) = aw.scratch_queue.pop() {
                let cx = (curr % WORLD_SIZE) as i32; let cy = (curr / WORLD_SIZE) as i32;
                for (dx, dy) in &[(1,0), (-1,0), (0,1), (0,-1)] {
                    let nx = cx + dx; let ny = cy + dy;
                    if nx < 0 || nx >= WORLD_SIZE as i32 || ny < 0 || ny >= WORLD_SIZE as i32 { continue; }
                    let nidx = (ny as usize) * WORLD_SIZE + (nx as usize);
                    
                    let has_wire = match net_type { 
                        3 => aw.plasmatic_map[nidx] > 0,
                        2 => aw.sicu_map[nidx] > 0, 
                        1 => aw.hyper_wire_map[nidx] > 0, 
                        _ => aw.wire_map[nidx] > 0 
                    };
                    
                    if has_wire && !visited[nidx] { visited[nidx] = true; aw.scratch_queue.push(nidx); }
                    if aw.world_map[nidx] >= 50000 {
                        let m_id = (aw.world_map[nidx] - 50000) as usize;
                        if m_id < machine_types.len() && visited_machines.insert(m_id) {
                            match machine_types[m_id] { 
                                1 => aw.scratch_generators.push(m_id), 
                                2 => aw.scratch_consumers.push(m_id), 
                                3 => aw.scratch_storage.push(m_id), 
                                4 => {
                                    if net_type == 2 { aw.scratch_consumers.push(m_id); } 
                                    else if net_type == 1 || net_type == 3 { aw.scratch_generators.push(m_id); } 
                                }, 
                                _ => {} 
                            }
                        }
                    }
                }
            }
            if !aw.scratch_generators.is_empty() || !aw.scratch_consumers.is_empty() || !aw.scratch_storage.is_empty() {
                grids.push(PowerGridResult {
                    net_type,
                    generators: std::mem::take(&mut aw.scratch_generators),
                    consumers: std::mem::take(&mut aw.scratch_consumers),
                    storage: std::mem::take(&mut aw.scratch_storage),
                });
            }
        }
        serde_wasm_bindgen::to_value(&grids).unwrap()
    }

    pub fn rebuild_data_grids(&mut self, js_machines: JsValue) -> JsValue {
        let machines: Vec<MachineDataInfo> = serde_wasm_bindgen::from_value(js_machines)
            .unwrap_or_default();
        let mut grids = Vec::new();
        let mut visited_tiles = vec![false; MAP_LEN];
        let mut visited_machines = HashSet::new();
        let mut m_map = HashMap::new();
        for m in &machines {
            m_map.insert(m.id, m);
        }

        let aw = self.active_mut();

        for m in &machines {
            if visited_machines.contains(&m.id) {
                continue;
            }
            aw.scratch_grid_machines.clear();
            aw.scratch_m_queue.clear();
            aw.scratch_cable_queue.clear();
            let mut has_radar = false;
            let mut has_cdh = false;

            aw.scratch_m_queue.push(m.id);
            visited_machines.insert(m.id);

            while let Some(m_id) = aw.scratch_m_queue.pop() {
                aw.scratch_grid_machines.push(m_id);
                if let Some(cur) = m_map.get(&m_id) {
                    if cur.m_type == 10 { // CDH m_type
                        has_cdh = true;
                    }
                    if cur.m_type == 11 { // Radar m_type
                        has_radar = true;
                    }

                    // Check all adjacent tiles of the machine for cables
                    for my in 0..cur.h {
                        for mx in 0..cur.w {
                            let tx = cur.x + mx;
                            let ty = cur.y + my;
                            for (dx, dy) in &[(1, 0), (-1, 0), (0, 1), (0, -1)] {
                                let nx = tx as i32 + dx;
                                let ny = ty as i32 + dy;
                                if nx >= 0 && nx < WORLD_SIZE as i32 && ny >= 0 && ny < WORLD_SIZE as i32 {
                                    let n_idx = (ny as usize) * WORLD_SIZE + (nx as usize);
                                    if aw.quartz_map[n_idx] > 0 && !visited_tiles[n_idx] {
                                        visited_tiles[n_idx] = true;
                                        aw.scratch_cable_queue.push(n_idx);
                                    }
                                }
                            }
                        }
                    }
                }

                // BFS through cables to find more machines or cables
                while let Some(c_idx) = aw.scratch_cable_queue.pop() {
                    let cx = (c_idx % WORLD_SIZE) as i32;
                    let cy = (c_idx / WORLD_SIZE) as i32;
                    for (dx, dy) in &[(1, 0), (-1, 0), (0, 1), (0, -1)] {
                        let nx = cx + dx;
                        let ny = cy + dy;
                        if nx < 0 || nx >= WORLD_SIZE as i32 || ny < 0 || ny >= WORLD_SIZE as i32 {
                            continue;
                        }
                        let n_idx = (ny as usize) * WORLD_SIZE + (nx as usize);

                        if aw.quartz_map[n_idx] > 0 && !visited_tiles[n_idx] {
                            visited_tiles[n_idx] = true;
                            aw.scratch_cable_queue.push(n_idx);
                        }

                        let tile_id = aw.world_map[n_idx];
                        if tile_id >= 50000 {
                            let hit_id = (tile_id - 50000) as usize;
                            if m_map.contains_key(&hit_id) && visited_machines.insert(hit_id) {
                                aw.scratch_m_queue.push(hit_id);
                            }
                        }
                    }
                }
            }
            if !aw.scratch_grid_machines.is_empty() {
                grids.push(DataGridResult {
                    machines: std::mem::take(&mut aw.scratch_grid_machines),
                    has_radar,
                    has_cdh,
                });
            }
        }
        serde_wasm_bindgen::to_value(&grids).unwrap()
    }

    pub fn rebuild_analog_grids(&mut self, js_machines: JsValue) -> JsValue {
        let machines: Vec<MachineDataInfo> = serde_wasm_bindgen::from_value(js_machines)
            .unwrap_or_default();
        let mut grids = Vec::new();
        let mut visited_tiles = vec![false; MAP_LEN];
        let mut visited_machines = HashSet::new();
        let mut m_map = HashMap::new();
        for m in &machines { m_map.insert(m.id, m); }

        let aw = self.active_mut();

        for m in &machines {
            if visited_machines.contains(&m.id) { continue; }
            aw.scratch_grid_machines.clear();
            aw.scratch_m_queue.clear();
            aw.scratch_cable_queue.clear();
            aw.scratch_m_queue.push(m.id);
            visited_machines.insert(m.id);

            while let Some(m_id) = aw.scratch_m_queue.pop() {
                aw.scratch_grid_machines.push(m_id);
                if let Some(cur) = m_map.get(&m_id) {
                    for my in 0..cur.h {
                        for mx in 0..cur.w {
                            let tx = cur.x + mx; let ty = cur.y + my;
                            for (dx, dy) in &[(1, 0), (-1, 0), (0, 1), (0, -1)] {
                                let nx = tx as i32 + dx; let ny = ty as i32 + dy;
                                if nx >= 0 && nx < WORLD_SIZE as i32 && ny >= 0 && ny < WORLD_SIZE as i32 {
                                    let n_idx = (ny as usize) * WORLD_SIZE + (nx as usize);
                                    if aw.analog_map[n_idx] > 0 && !visited_tiles[n_idx] {
                                        visited_tiles[n_idx] = true;
                                        aw.scratch_cable_queue.push(n_idx);
                                    }
                                }
                            }
                        }
                    }
                }

                while let Some(c_idx) = aw.scratch_cable_queue.pop() {
                    let cx = (c_idx % WORLD_SIZE) as i32; let cy = (c_idx / WORLD_SIZE) as i32;
                    for (dx, dy) in &[(1, 0), (-1, 0), (0, 1), (0, -1)] {
                        let nx = cx + dx; let ny = cy + dy;
                        if nx < 0 || nx >= WORLD_SIZE as i32 || ny < 0 || ny >= WORLD_SIZE as i32 { continue; }
                        let n_idx = (ny as usize) * WORLD_SIZE + (nx as usize);
                        if aw.analog_map[n_idx] > 0 && !visited_tiles[n_idx] {
                            visited_tiles[n_idx] = true;
                            aw.scratch_cable_queue.push(n_idx);
                        }
                        let tile_id = aw.world_map[n_idx];
                        if tile_id >= 50000 {
                            let hit_id = (tile_id - 50000) as usize;
                            if m_map.contains_key(&hit_id) && visited_machines.insert(hit_id) {
                                aw.scratch_m_queue.push(hit_id);
                            }
                        }
                    }
                }
            }
            if !aw.scratch_grid_machines.is_empty() {
                grids.push(DataGridResult { machines: std::mem::take(&mut aw.scratch_grid_machines), has_radar: false, has_cdh: false });
            }
        }
        serde_wasm_bindgen::to_value(&grids).unwrap()
    }

    pub fn is_belt_tile_open(&self, x: f32, y: f32) -> bool {
        let ix = x.floor() as u16;
        let iy = y.floor() as u16;
        !self.active().belt_items.iter().any(|item| item.x == ix && item.y == iy)
    }

    pub fn register_route(&mut self, flat_path: &[u16]) -> usize {
        let mut path = Vec::with_capacity(flat_path.len() / 2);
        for i in (0..flat_path.len()).step_by(2) { path.push((flat_path[i], flat_path[i+1])); }
        let mut aw = self.active_mut();
        let id = aw.routes.len();
        aw.routes.push(Route { path });
        id
    }

    pub fn clear_belts(&mut self) { self.active_mut().belt_items.clear(); self.active_mut().routes.clear(); }
    pub fn clear_belt_items(&mut self) {
        let mut aw = self.active_mut();
        aw.belt_items.clear();
        aw.routes.clear();
        aw.belt_render_buffer.clear();
        aw.belt_finished_buffer.clear();
    }
    pub fn spawn_belt_item(&mut self, item_id: u16, amount: u16, route_id: usize, route_idx: usize) {
        let mut aw = self.active_mut();
        if let Some(route) = aw.routes.get(route_id) {
            if route_idx < route.path.len() {
                let tile = route.path[route_idx];
                aw.belt_items.push(BeltItem { item_id, amount, route_id, route_idx, x: tile.0, y: tile.1 });
            }
        }
    }

    pub fn update_belts(&mut self, should_tick: bool) {
        let mut aw = self.active_mut();
        aw.belt_finished_buffer.clear();
        aw.belt_render_buffer.clear();

        if should_tick {
            let mut occupancy: HashSet<(u16, u16)> = HashSet::new();
            for item in &aw.belt_items { occupancy.insert((item.x, item.y)); }

            let n = aw.belt_items.len();
            let mut order: Vec<usize> = (0..n).collect();
            order.sort_unstable_by(|&a, &b| aw.belt_items[b].route_idx.cmp(&aw.belt_items[a].route_idx));

            let mut new_positions: Vec<Option<(u16, u16, usize)>> = vec![None; n];

            for &idx in &order {
                let item = &aw.belt_items[idx];
                if let Some(route) = aw.routes.get(item.route_id) {
                    if item.route_idx + 1 >= route.path.len() {
                        for (dx, dy) in &[(1i32, 0i32), (-1, 0), (0, 1), (0, -1)] {
                            let nx = item.x as i32 + dx; let ny = item.y as i32 + dy;
                            if nx >= 0 && nx < WORLD_SIZE as i32 && ny >= 0 && ny < WORLD_SIZE as i32 {
                                let n_idx = (ny as usize) * WORLD_SIZE + (nx as usize);
                                if aw.world_map[n_idx] >= 50000 {
                                    aw.belt_finished_buffer.push(item.item_id as u32);
                                    aw.belt_finished_buffer.push(item.amount as u32);
                                    aw.belt_finished_buffer.push(nx as u32);
                                    aw.belt_finished_buffer.push(ny as u32);
                                    aw.belt_finished_buffer.push(item.route_id as u32);
                                    aw.belt_finished_buffer.push(item.route_idx as u32);
                                    break;
                                }
                            }
                        }
                    } else {
                        let next = route.path[item.route_idx + 1];
                        if !occupancy.contains(&next) {
                            occupancy.remove(&(item.x, item.y));
                            occupancy.insert(next);
                            new_positions[idx] = Some((next.0, next.1, item.route_idx + 1));
                        }
                    }
                }
            }

            for (idx, opt) in new_positions.iter().enumerate() {
                if let Some((nx, ny, nri)) = opt {
                    aw.belt_items[idx].x = *nx;
                    aw.belt_items[idx].y = *ny;
                    aw.belt_items[idx].route_idx = *nri;
                }
            }
        }

        for item in &aw.belt_items {
            aw.belt_render_buffer.push(item.x as f32);
            aw.belt_render_buffer.push(item.y as f32);
            aw.belt_render_buffer.push(0.0);
            aw.belt_render_buffer.push(item.item_id as f32);
            aw.belt_render_buffer.push(item.amount as f32);
        }
    }

    pub fn remove_belt_item_at(&mut self, route_id: usize, route_idx: usize) -> bool {
        let mut aw = self.active_mut();
        if let Some(pos) = aw.belt_items.iter().position(|i| i.route_id == route_id && i.route_idx == route_idx) {
            aw.belt_items.remove(pos);
            return true;
        }
        false
    }

    pub fn set_belt_item_amount(&mut self, route_id: usize, route_idx: usize, new_amount: u16) {
        if let Some(item) = self.active_mut().belt_items.iter_mut().find(|i| i.route_id == route_id && i.route_idx == route_idx) {
            item.amount = new_amount;
        }
    }

    pub fn find_nearest_monster(&self, x: f32, y: f32, range: f32) -> Vec<f32> {
        let mut min_dist = range * range; let mut target = vec![-1.0, -1.0];
        let aw = self.active();
        for m in &aw.monsters { if m.hp > 0.0 { let d = (m.x - x)*(m.x - x) + (m.y - y)*(m.y - y); if d < min_dist { min_dist = d; target[0] = m.x; target[1] = m.y; } } }
        target
    }

    pub fn update_combat_multiplayer(&mut self, dt: f32, flat_players: &[f32], is_creative: bool) -> Vec<f32> {
        let mut aw = self.active_mut();
        aw.combat_render_buffer.clear(); 

        let mut updated_hps = Vec::new();
        for i in (0..flat_players.len()).step_by(3) { updated_hps.push(flat_players[i+2]); }

        let mut i = 0;
        while i < aw.monsters.len() {
            if aw.monsters[i].hp <= 0.0 { 
                aw.monsters.remove(i); 
                continue; 
            }

            let m = &mut aw.monsters[i];
            
            if is_creative {
                if m.move_timer <= 0.0 {
                    let random_angle_deg = (Math::random() * 360.0).floor() as f32;
                    let random_duration = 1.0 + (Math::random() * 2.0) as f32;
                    m.move_timer = random_angle_deg + random_duration;
                }
                let angle_deg = m.move_timer.floor();
                let mut time_left = m.move_timer - angle_deg;
                time_left -= dt;
                if time_left <= 0.0 {
                    m.move_timer = 0.0;
                } else {
                    m.move_timer = angle_deg + time_left;
                    let angle_rad = angle_deg * (std::f32::consts::PI / 180.0);
                    let dx = angle_rad.cos();
                    let dy = angle_rad.sin();
                    let speed = m.speed * 0.5; // wander slower
                    m.x += dx * speed * dt;
                    m.y += dy * speed * dt;
                    m.x = m.x.clamp(1.0, (WORLD_SIZE - 2) as f32);
                    m.y = m.y.clamp(1.0, (WORLD_SIZE - 2) as f32);
                }
            } else {
                let mut nearest_dist = f32::MAX;
                let mut target_px = m.x;
                let mut target_py = m.y;
                let mut target_p_idx = 0;

                for p_idx in 0..(flat_players.len() / 3) {
                    let px = flat_players[p_idx * 3];
                    let py = flat_players[p_idx * 3 + 1];
                    let pdx = px - m.x; let pdy = py - m.y;
                    let dist = pdx * pdx + pdy * pdy;
                    if dist < nearest_dist {
                        nearest_dist = dist;
                        target_px = px;
                        target_py = py;
                        target_p_idx = p_idx;
                    }
                }

                let dx = target_px - m.x; let dy = target_py - m.y;
                let len = (dx * dx + dy * dy).sqrt();
                if len > 0.1 {
                    let speed = m.speed;
                    m.x += (dx / len) * speed * dt;
                    m.y += (dy / len) * speed * dt;
                }

                if nearest_dist.sqrt() < 1.0 && updated_hps[target_p_idx] > 0.0 { 
                    updated_hps[target_p_idx] -= 10.0 * dt; 
                }
            }
            i += 1;
        }

        aw.combat_render_buffer.push(aw.monsters.len() as f32);
        aw.combat_render_buffer.push(aw.projectiles.len() as f32);
        for m in &aw.monsters { aw.combat_render_buffer.push(m.x); aw.combat_render_buffer.push(m.y); aw.combat_render_buffer.push(m.m_type as f32); }
        for p in &aw.projectiles { aw.combat_render_buffer.push(p.x); aw.combat_render_buffer.push(p.y); aw.combat_render_buffer.push(p.color_idx); }
        
        updated_hps
    }
}

use std::fmt::Write;

#[wasm_bindgen]
pub fn rle_encode_u16(arr: &[u16]) -> String {
    if arr.is_empty() { return String::new(); }
    let mut res = String::with_capacity(arr.len() / 10);
    let mut current = arr[0];
    let mut count = 1;
    for &val in arr.iter().skip(1) {
        if val == current { count += 1; }
        else {
            res.push_str(&current.to_string());
            res.push(':');
            res.push_str(&count.to_string());
            res.push(',');
            current = val;
            count = 1;
        }
    }
    res.push_str(&current.to_string());
    res.push(':');
    res.push_str(&count.to_string());
    res
}

#[wasm_bindgen]
pub fn rle_encode_u8(arr: &[u8]) -> String {
    if arr.is_empty() { return String::new(); }
    let mut res = String::with_capacity(arr.len() / 10);
    let mut current = arr[0];
    let mut count = 1;
    for &val in arr.iter().skip(1) {
        if val == current { count += 1; }
        else {
            res.push_str(&current.to_string());
            res.push(':');
            res.push_str(&count.to_string());
            res.push(',');
            current = val;
            count = 1;
        }
    }
    res.push_str(&current.to_string());
    res.push(':');
    res.push_str(&count.to_string());
    res
}

#[wasm_bindgen]
pub fn rle_decode_u16(s: &str, size: usize) -> Vec<u16> {
    let mut out = vec![0; size];
    let mut idx = 0;
    for part in s.split(',') {
        if let Some(colon_idx) = part.find(':') {
            if let (Ok(val), Ok(count)) = (part[..colon_idx].parse::<u16>(), part[colon_idx+1..].parse::<usize>()) {
                if idx + count <= size {
                    out[idx..idx+count].fill(val);
                    idx += count;
                }
            }
        }
    }
    out
}

#[wasm_bindgen]
pub fn rle_decode_u8(s: &str, size: usize) -> Vec<u8> {
    let mut out = vec![0; size];
    let mut idx = 0;
    for part in s.split(',') {
        if let Some(colon_idx) = part.find(':') {
            if let (Ok(val), Ok(count)) = (part[..colon_idx].parse::<u8>(), part[colon_idx+1..].parse::<usize>()) {
                if idx + count <= size {
                    out[idx..idx+count].fill(val);
                    idx += count;
                }
            }
        }
    }
    out
}