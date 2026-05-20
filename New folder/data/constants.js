export const ORTHO_DIRS =[{x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];
export const NETWORKS =['item', 'wire', 'iron', 'copper', 'brass', 'gas', 'acid', 'steel', 'drone_farm', 'drone_carry','quartz', 'hyper_wire', 'defense_signal', 'waste', 'item_heavy', 'brass_heavy', 'silver', 'insulated', 'sicu', 'plasmatic'];
export const TILE_DEFS_RAW = [
        [0, ' ', 'transparent'], [1, ' ', 'atransparent'],
        [2, '^', '#2e7d32'], [3, '|', '#5d4037'],
        [4, '&', '#1b5e20'], [5, '#', '#2e7d32'],
        [6, '/', '#616161'], [7, '\\', '#616161'], [8, '_', '#616161'],
        [10, '%', '#1565c0'], [11, '*', '#1565c0'], [12, 'x', '#1565c0'],
        [13, 'c', '#e65100'], [14, '+', '#e65100'], [15, 'o', '#e65100'],
        [16, '@', '#212121'], [17, '#', '#212121'], [18, '&', '#212121'],
        [20, '%', '#ffd700'], [21, '*', '#ffd700'], [22, 'x', '#ffd700'],
        [23, '%', '#c0c0c0'], [24, '*', '#c0c0c0'], [25, 'x', '#c0c0c0'],
        [26, '%', '#78909c'], [27, '*', '#78909c'], [28, 'x', '#78909c'],
        [29, '%', '#a1887f'], [30, '*', '#a1887f'], [31, 'x', '#a1887f'],
        [32, '~', '#1e88e5'], // Water Pond
        [33, '%', '#b2ebf2'], [34, '*', '#b2ebf2'], [35, 'x', '#b2ebf2'],
        [36, '%', '#eceff1'], [37, '*', '#eceff1'], [38, 'x', '#eceff1'],
        [39, '%', '#5c5c77'], [40, '*', '#5c5c77'], [41, 'x', '#5c5c77'],
        [42, '~', '#212121'], // Oil Puddle
        [43, '=', '#424242']  // Asphalt Paving
    ];
export const TILE_DEFS = TILE_DEFS_RAW.map(t => ({ id: t[0], char: t[1], color: t[2] }));
export const ORES = ['iron', 'copper', 'gold', 'silver', 'nickel', 'zinc', 'aluminium', 'lead'];
