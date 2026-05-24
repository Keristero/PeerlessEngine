import assert from 'node:assert/strict'
import { rect_rect, circle_circle, circle_rect, cells_for_rect, cells_for_circle } from '../systems/collision_system.mjs'

export const dependencies = ["collision"]

export async function setup(engine, world) {}

// --- Helper to build a collidable entity ---
function make_circle(engine, world, x, y, r, layer_id) {
    const { addEntity, addComponent } = engine.bitecs
    const { Position2d, Circle } = engine.mods.twodee.components
    const { Collision } = engine.mods.collision.components
    const eid = addEntity(world)
    addComponent(world, eid, Position2d)
    Position2d.x[eid] = x
    Position2d.y[eid] = y
    addComponent(world, eid, Circle)
    Circle.radius[eid] = r
    addComponent(world, eid, Collision)
    Collision.layer_id[eid] = layer_id
    engine.mods.twodee.systems.physicsSystem.moved_eids.add(eid)
    return eid
}

function make_rect(engine, world, x, y, w, h, layer_id) {
    const { addEntity, addComponent } = engine.bitecs
    const { Position2d, Rectangle } = engine.mods.twodee.components
    const { Collision } = engine.mods.collision.components
    const eid = addEntity(world)
    addComponent(world, eid, Position2d)
    Position2d.x[eid] = x
    Position2d.y[eid] = y
    addComponent(world, eid, Rectangle)
    Rectangle.width[eid] = w
    Rectangle.height[eid] = h
    addComponent(world, eid, Collision)
    Collision.layer_id[eid] = layer_id
    return eid
}

export const tests = {
    // --- Pure math ---

    'rect_rect: overlapping': () => {
        assert.ok(rect_rect(0, 0, 10, 10, 5, 5, 10, 10))
    },

    'rect_rect: touching edges are not overlapping': () => {
        assert.ok(!rect_rect(0, 0, 10, 10, 10, 0, 10, 10))
    },

    'rect_rect: separated': () => {
        assert.ok(!rect_rect(0, 0, 10, 10, 20, 20, 10, 10))
    },

    'circle_circle: overlapping': () => {
        assert.ok(circle_circle(0, 0, 10, 5, 0, 10))
    },

    'circle_circle: touching is not overlapping': () => {
        assert.ok(!circle_circle(0, 0, 5, 10, 0, 5))
    },

    'circle_circle: separated': () => {
        assert.ok(!circle_circle(0, 0, 5, 20, 0, 5))
    },

    'circle_rect: overlap': () => {
        assert.ok(circle_rect(5, 5, 10, 0, 0, 20, 20))
    },

    'circle_rect: circle near corner': () => {
        assert.ok(circle_rect(22, 22, 5, 0, 0, 20, 20))
    },

    'circle_rect: separated': () => {
        assert.ok(!circle_rect(100, 100, 5, 0, 0, 20, 20))
    },

    // --- Grid cell helpers ---

    'cells_for_rect: entity placed in correct cells': () => {
        const cells = cells_for_rect(0, 0, 64, 64, 64)
        assert.deepEqual(cells.sort(), ['0,0', '0,1', '1,0', '1,1'].sort())
    },

    'cells_for_circle: AABB used for cell mapping': () => {
        // circle at (32,32) r=32 → AABB (0,0,64,64) → same as above
        const cells = cells_for_circle(32, 32, 32, 64)
        assert.deepEqual(cells.sort(), ['0,0', '0,1', '1,0', '1,1'].sort())
    },

    // --- System integration ---

    'collision pair recorded when shapes overlap': (engine, world) => {
        const { collisionSystem } = engine.mods.collision.systems
        const layer_id = engine.mods.collision.register_layer("test_overlap", { cell_size: 64 })

        const a = make_circle(engine, world, 0, 0, 10, layer_id)
        const b = make_circle(engine, world, 5, 0, 10, layer_id) // overlapping

        collisionSystem.run(engine, world)

        const { active_collisions } = engine.mods.collision
        const found = active_collisions.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
        assert.ok(found, "a and b should appear as a collision pair")
    },

    'collision pair cleared at start of next tick': (engine, world) => {
        const { Position2d } = engine.mods.twodee.components
        const { collisionSystem } = engine.mods.collision.systems
        const layer_id = engine.mods.collision.register_layer("test_remove", { cell_size: 64 })

        const a = make_circle(engine, world, 0, 0, 10, layer_id)
        const b = make_circle(engine, world, 5, 0, 10, layer_id)

        collisionSystem.run(engine, world)

        // Move b away so they no longer overlap — re-check with only a moving
        Position2d.x[b] = 200
        engine.mods.twodee.systems.physicsSystem.moved_eids.clear()
        engine.mods.twodee.systems.physicsSystem.moved_eids.add(a)

        collisionSystem.run(engine, world)

        const { active_collisions } = engine.mods.collision
        const found = active_collisions.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
        assert.ok(!found, "a and b should no longer appear as a collision pair after separation")
    },

    'moved_eids is not cleared by the collision system': (engine, world) => {
        const { Collision } = engine.mods.collision.components
        const { collisionSystem } = engine.mods.collision.systems
        const layer_id = engine.mods.collision.register_layer("test_moved", { cell_size: 64 })

        const a = make_circle(engine, world, 0, 0, 5, layer_id)
        // make_circle already adds a to moved_eids

        collisionSystem.run(engine, world)

        assert.ok(engine.mods.twodee.systems.physicsSystem.moved_eids.has(a), "collision system should not clear moved_eids — that is physics_system's responsibility")
    },

    'static entity is found as collision candidate but never as source': (engine, world) => {
        const { collisionSystem } = engine.mods.collision.systems
        const layer_id = engine.mods.collision.register_layer("test_static", { cell_size: 64 })

        // b is a static rect (no Moved)
        const b = make_rect(engine, world, 0, 0, 20, 20, layer_id)
        // a is a moving circle that hits b
        const a = make_circle(engine, world, 10, 10, 5, layer_id)

        collisionSystem.run(engine, world)

        const { active_collisions } = engine.mods.collision
        const found = active_collisions.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
        assert.ok(found, "a (moved) should be found colliding with static b")
    },
}
