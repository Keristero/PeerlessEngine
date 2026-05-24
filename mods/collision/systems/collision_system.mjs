// --- Shape helpers ---

export function cells_for_rect(x, y, w, h, cell_size) {
    const cells = []
    const min_cx = Math.floor(x / cell_size)
    const max_cx = Math.floor((x + w) / cell_size)
    const min_cy = Math.floor(y / cell_size)
    const max_cy = Math.floor((y + h) / cell_size)
    for (let cx = min_cx; cx <= max_cx; cx++) {
        for (let cy = min_cy; cy <= max_cy; cy++) {
            cells.push(`${cx},${cy}`)
        }
    }
    return cells
}

export function cells_for_circle(x, y, r, cell_size) {
    return cells_for_rect(x - r, y - r, r * 2, r * 2, cell_size)
}

// --- Collision detection ---

export function rect_rect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function circle_circle(ax, ay, ar, bx, by, br) {
    const dx = ax - bx
    const dy = ay - by
    const sum_r = ar + br
    return dx * dx + dy * dy < sum_r * sum_r
}

export function circle_rect(cx, cy, cr, rx, ry, rw, rh) {
    const nearest_x = Math.max(rx, Math.min(cx, rx + rw))
    const nearest_y = Math.max(ry, Math.min(cy, ry + rh))
    const dx = cx - nearest_x
    const dy = cy - nearest_y
    return dx * dx + dy * dy < cr * cr
}

// --- System ---
//
// The spatial grid is split by collision category so that candidate lookup
// for entity E only visits sub-grids where (cat & E.mask) !== 0.
// This eliminates O(n²) candidate enumeration between entities that can
// never collide (e.g. ball vs. ball when BALL and WORLD groups are used).
//
// Entities with no explicit category/mask (0) default to 0xFFFF, meaning
// they are stored in the "all" sub-grid and will pair with everything —
// preserving backward-compatible behavior.

const system = {
    name: "collisionSystem",
    category: "physics",
    dependencies: ["physicsSystem"],
    run: function (engine, world) {
        const { query, hasComponent, Not } = engine.bitecs
        const { Position2d, Circle, Rectangle } = engine.mods.twodee.components
        const { Collision } = engine.mods.collision.components
        const { active_collisions, layers } = engine.mods.collision

        const Destroyed = engine.mods.collision_response?.components?.Destroyed
        const not_destroyed = Destroyed ? [Not(Destroyed)] : []

        // Collect entities that moved this tick and have a Collision component.
        const { moved_eids: all_moved, move_dx, move_dy } = engine.mods.twodee.systems.physicsSystem
        const moved_eids = new Set()
        for (const eid of all_moved) {
            if (!hasComponent(world, eid, Collision)) continue
            if (Destroyed && hasComponent(world, eid, Destroyed)) continue
            moved_eids.add(eid)
        }

        engine.mods.collision.active_collisions = []
        engine.mods.collision.colliding_with = new Map()

        // Build shape-type sets once per tick
        const circle_eids = new Set(query(world, [Circle, Collision, ...not_destroyed]))
        const rect_eids   = new Set(query(world, [Rectangle, Collision, ...not_destroyed]))

        for (const layer of Object.values(layers)) {
            const { cell_size } = layer

            // Per-category grid: Map<category_int, Map<cell_string, Set<eid>>>
            const grid = new Map()

            for (const eid of query(world, [Collision, Position2d, ...not_destroyed])) {
                if (Collision.layer_id[eid] !== layer.id) continue
                const x = Position2d.x[eid]
                const y = Position2d.y[eid]
                let cells
                if (circle_eids.has(eid)) {
                    cells = cells_for_circle(x, y, Circle.radius[eid], cell_size)
                } else if (rect_eids.has(eid)) {
                    cells = cells_for_rect(x, y, Rectangle.width[eid], Rectangle.height[eid], cell_size)
                } else {
                    continue
                }
                // category 0 → treat as 0xFFFF so it pairs with every mask
                const cat = Collision.category[eid] || 0xFFFF
                if (!grid.has(cat)) grid.set(cat, new Map())
                const cat_grid = grid.get(cat)
                for (const cell of cells) {
                    if (!cat_grid.has(cell)) cat_grid.set(cell, new Set())
                    cat_grid.get(cell).add(eid)
                }
            }

            for (const eid of moved_eids) {
                if (Collision.layer_id[eid] !== layer.id) continue
                const x   = Position2d.x[eid]
                const y   = Position2d.y[eid]
                const mdx = move_dx[eid] ?? 0
                const mdy = move_dy[eid] ?? 0
                const eid_mask = Collision.mask[eid] || 0xFFFF

                let search_cells
                if (circle_eids.has(eid)) {
                    const r = Circle.radius[eid]
                    search_cells = cells_for_rect(
                        Math.min(x, x - mdx) - r,
                        Math.min(y, y - mdy) - r,
                        Math.abs(mdx) + r * 2,
                        Math.abs(mdy) + r * 2,
                        cell_size
                    )
                } else if (rect_eids.has(eid)) {
                    search_cells = cells_for_rect(
                        Math.min(x, x - mdx),
                        Math.min(y, y - mdy),
                        Math.abs(mdx) + Rectangle.width[eid],
                        Math.abs(mdy) + Rectangle.height[eid],
                        cell_size
                    )
                } else {
                    continue
                }

                // Only visit category sub-grids that this entity's mask allows.
                // For breakout with BALL(1)/WORLD(2): a ball (mask=2) skips the
                // BALL sub-grid entirely — zero ball-ball candidate pairs generated.
                const candidates = new Set()
                for (const [cat, cat_grid] of grid) {
                    if ((cat & eid_mask) === 0) continue
                    for (const cell of search_cells) {
                        const cell_eids = cat_grid.get(cell)
                        if (!cell_eids) continue
                        for (const ceid of cell_eids) {
                            if (ceid !== eid) candidates.add(ceid)
                        }
                    }
                }

                for (const other of candidates) {
                    if (shapes_overlap(eid, other, circle_eids, rect_eids, Position2d, Circle, Rectangle)) {
                        engine.mods.collision.active_collisions.push([eid, other])
                        const cw = engine.mods.collision.colliding_with
                        if (!cw.has(eid))   cw.set(eid,   new Set())
                        if (!cw.has(other)) cw.set(other, new Set())
                        cw.get(eid).add(other)
                        cw.get(other).add(eid)
                    }
                }
            }
        }
    }
}

function shapes_overlap(a, b, circle_eids, rect_eids, Position2d, Circle, Rectangle) {
    const ax = Position2d.x[a], ay = Position2d.y[a]
    const bx = Position2d.x[b], by = Position2d.y[b]
    const a_circle = circle_eids.has(a)
    const b_circle = circle_eids.has(b)

    if (a_circle && b_circle) {
        return circle_circle(ax, ay, Circle.radius[a], bx, by, Circle.radius[b])
    }
    if (a_circle && rect_eids.has(b)) {
        return circle_rect(ax, ay, Circle.radius[a], bx, by, Rectangle.width[b], Rectangle.height[b])
    }
    if (rect_eids.has(a) && b_circle) {
        return circle_rect(bx, by, Circle.radius[b], ax, ay, Rectangle.width[a], Rectangle.height[a])
    }
    if (rect_eids.has(a) && rect_eids.has(b)) {
        return rect_rect(ax, ay, Rectangle.width[a], Rectangle.height[a], bx, by, Rectangle.width[b], Rectangle.height[b])
    }
    return false
}

export default system
