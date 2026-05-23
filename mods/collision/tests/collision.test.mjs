import assert from 'node:assert/strict'
import { rect_rect, circle_circle, circle_rect, cells_for_rect, cells_for_circle } from '../systems/collision_system.mjs'

export const dependencies = ["collision"]

export async function setup(engine, world) {}

// --- Helper to build a collidable entity ---
function make_circle(engine, world, x, y, r, layer_id) {
    const { addEntity, addComponent } = engine.bitecs
    const { Position2d, Circle, Moved } = engine.mods.twodee.components
    const { Collision } = engine.mods.collision.components
    const eid = addEntity(world)
    addComponent(world, eid, Position2d)
    Position2d.x[eid] = x
    Position2d.y[eid] = y
    addComponent(world, eid, Circle)
    Circle.radius[eid] = r
    addComponent(world, eid, Collision)
    Collision.layer_id[eid] = layer_id
    addComponent(world, eid, Moved)
    return eid
}

function make_rect(engine, world, x, y, w, h, layer_id) {
    const { addEntity, addComponent } = engine.bitecs
    const { Position2d, Rectangle, Moved } = engine.mods.twodee.components
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

    'Colliding relationship added when shapes overlap': (engine, world) => {
        const { query } = engine.bitecs
        const { collisionSystem } = engine.mods.collision.systems
        const { Colliding } = engine.mods.collision
        const layer_id = engine.mods.collision.register_layer("test_overlap", { cell_size: 64 })

        const a = make_circle(engine, world, 0, 0, 10, layer_id)
        const b = make_circle(engine, world, 5, 0, 10, layer_id) // overlapping

        collisionSystem.run(engine, world)

        const colliding_with_a = [...query(world, [Colliding(a)])]
        assert.ok(colliding_with_a.includes(b), "b should be Colliding(a)")
    },

    'Colliding relationship removed at start of next tick': (engine, world) => {
        const { query } = engine.bitecs
        const { Position2d, Moved } = engine.mods.twodee.components
        const { collisionSystem } = engine.mods.collision.systems
        const { Colliding } = engine.mods.collision
        const layer_id = engine.mods.collision.register_layer("test_remove", { cell_size: 64 })

        const a = make_circle(engine, world, 0, 0, 10, layer_id)
        const b = make_circle(engine, world, 5, 0, 10, layer_id)

        collisionSystem.run(engine, world)

        // Move b away so they no longer overlap — but don't add Moved to b (b is static now)
        // Add Moved to a to trigger re-check
        const { addComponent } = engine.bitecs
        Position2d.x[b] = 200
        addComponent(world, a, Moved)

        collisionSystem.run(engine, world)

        const colliding_with_a = [...query(world, [Colliding(a)])]
        assert.ok(!colliding_with_a.includes(b), "b should no longer be Colliding(a) after separation")
    },

    'Moved tag is not removed by the collision system': (engine, world) => {
        const { query, addComponent } = engine.bitecs
        const { Moved } = engine.mods.twodee.components
        const { Collision } = engine.mods.collision.components
        const { collisionSystem } = engine.mods.collision.systems
        const layer_id = engine.mods.collision.register_layer("test_moved", { cell_size: 64 })

        const a = make_circle(engine, world, 0, 0, 5, layer_id)
        addComponent(world, a, Moved)

        collisionSystem.run(engine, world)

        const still_moved = [...query(world, [Moved])]
        assert.ok(still_moved.includes(a), "collision system should not strip Moved — that is physics_system's responsibility")
    },

    'static entity is found as collision candidate but never as source': (engine, world) => {
        const { query } = engine.bitecs
        const { Colliding } = engine.mods.collision
        const { collisionSystem } = engine.mods.collision.systems
        const layer_id = engine.mods.collision.register_layer("test_static", { cell_size: 64 })

        // b is a static rect (no Moved)
        const b = make_rect(engine, world, 0, 0, 20, 20, layer_id)
        // a is a moving circle that hits b
        const a = make_circle(engine, world, 10, 10, 5, layer_id)

        collisionSystem.run(engine, world)

        const colliding_with_b = [...query(world, [Colliding(b)])]
        assert.ok(colliding_with_b.includes(a), "a (moved) should be found colliding with static b")
    },
}
