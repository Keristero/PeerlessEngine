import assert from 'node:assert/strict'
import collisionResponseSystem from '../systems/collision_response_system.mjs'

// Activate collision_response and its full dependency chain (twodee, collision).
// The mod runner will call collision_response.activate(), which registers all
// components, so no manual setup is needed.
export const dependencies = ["collision_response"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function make_ball(engine, world, {
    x = 400, y = 300, vx = 0, vy = -4, r = 6,
    speed_factor = 1, max_speed = 0,
    separate = false,
} = {}) {
    const { addEntity, addComponent } = engine.bitecs
    const { Position2d, Velocity2d, Circle } = engine.mods.twodee.components
    const { ColliderResponseBounce, ColliderResponseSeparate } = engine.mods.collision_response.components
    const eid = addEntity(world)
    addComponent(world, eid, Position2d)
    Position2d.x[eid] = x
    Position2d.y[eid] = y
    addComponent(world, eid, Velocity2d)
    Velocity2d.x[eid] = vx
    Velocity2d.y[eid] = vy
    addComponent(world, eid, Circle)
    Circle.radius[eid] = r
    addComponent(world, eid, ColliderResponseBounce)
    ColliderResponseBounce.speed_factor[eid] = speed_factor
    ColliderResponseBounce.max_speed[eid] = max_speed
    if (separate) addComponent(world, eid, ColliderResponseSeparate)
    return eid
}

function make_wall(engine, world, { x, y, w, h }) {
    const { addEntity, addComponent } = engine.bitecs
    const { Position2d, Rectangle } = engine.mods.twodee.components
    const eid = addEntity(world)
    addComponent(world, eid, Position2d)
    Position2d.x[eid] = x
    Position2d.y[eid] = y
    addComponent(world, eid, Rectangle)
    Rectangle.width[eid] = w
    Rectangle.height[eid] = h
    return eid
}

function make_block(engine, world, opts) {
    const { addComponent } = engine.bitecs
    const { CollideeResponseDestroy } = engine.mods.collision_response.components
    const eid = make_wall(engine, world, opts)
    addComponent(world, eid, CollideeResponseDestroy)
    return eid
}

function make_bat(engine, world, { x, y, w = 100, h = 15 }) {
    const { addComponent } = engine.bitecs
    const { CollideeResponseAngledBounce } = engine.mods.collision_response.components
    const eid = make_wall(engine, world, { x, y, w, h })
    addComponent(world, eid, CollideeResponseAngledBounce)
    CollideeResponseAngledBounce.spread[eid] = 4
    return eid
}

function set_collision(engine, a, b) {
    engine.mods.collision.active_collisions = [[a, b]]
}

function run(engine, world) {
    collisionResponseSystem.run(engine, world)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export const tests = {

    // ── Axis detection ──────────────────────────────────────────────────────

    'ball bounces Y off a horizontal surface (wall on top)': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(Velocity2d.y[ball] > 0, `expected vy > 0, got ${Velocity2d.y[ball]}`)
        assert.equal(Velocity2d.x[ball], 0, 'vx should be unchanged')
    },

    'ball bounces X off a vertical surface (wall on right)': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 802, y: 300, vx: 4, vy: 0 })
        const wall = make_wall(engine, world, { x: 800, y: -20, w: 20, h: 640 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(Velocity2d.x[ball] < 0, `expected vx < 0, got ${Velocity2d.x[ball]}`)
        assert.equal(Velocity2d.y[ball], 0, 'vy should be unchanged')
    },

    'ball bounces X off a vertical surface (wall on left)': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: -2, y: 300, vx: -4, vy: 0 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 20, h: 640 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(Velocity2d.x[ball] > 0, `expected vx > 0, got ${Velocity2d.x[ball]}`)
        assert.equal(Velocity2d.y[ball], 0, 'vy should be unchanged')
    },

    // ── Degenerate case ─────────────────────────────────────────────────────

    'degenerate: ball on top-wall bottom edge bounces Y not X': (engine, world) => {
        const { addComponent } = engine.bitecs
        const { Velocity2d, Moved } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 0, vx: 0, vy: -4 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        addComponent(world, ball, Moved)
        Moved.dx[ball] = 0
        Moved.dy[ball] = -4
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(Velocity2d.y[ball] > 0, `expected vy > 0 (y-flip), got ${Velocity2d.y[ball]}`)
        assert.equal(Velocity2d.x[ball], 0, 'vx must not be flipped')
    },

    'degenerate: ball on left-wall right edge bounces X not Y': (engine, world) => {
        const { addComponent } = engine.bitecs
        const { Velocity2d, Moved } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 0, y: 100, vx: -4, vy: 0 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 20, h: 640 })
        addComponent(world, ball, Moved)
        Moved.dx[ball] = -4
        Moved.dy[ball] = 0
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(Velocity2d.x[ball] > 0, `expected vx > 0 (x-flip), got ${Velocity2d.x[ball]}`)
        assert.equal(Velocity2d.y[ball], 0, 'vy must not be flipped')
    },

    // ── CollideeResponseAngledBounce (paddle) ────────────────────────────────

    'bat: ball left of centre gets negative vx': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const bat  = make_bat(engine, world, { x: 350, y: 550, w: 100, h: 15 })
        const ball = make_ball(engine, world, { x: 360, y: 545, vx: 1, vy: 4 })
        set_collision(engine, ball, bat)
        run(engine, world)
        assert.ok(Velocity2d.x[ball] < 0, `expected vx < 0, got ${Velocity2d.x[ball]}`)
        assert.ok(Velocity2d.y[ball] < 0, 'ball should bounce upward off bat')
    },

    'bat: ball right of centre gets positive vx': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const bat  = make_bat(engine, world, { x: 350, y: 550, w: 100, h: 15 })
        const ball = make_ball(engine, world, { x: 440, y: 545, vx: -1, vy: 4 })
        set_collision(engine, ball, bat)
        run(engine, world)
        assert.ok(Velocity2d.x[ball] > 0, `expected vx > 0, got ${Velocity2d.x[ball]}`)
        assert.ok(Velocity2d.y[ball] < 0, 'ball should bounce upward off bat')
    },

    'bat: ball at bat centre gets vx = 0': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const bat  = make_bat(engine, world, { x: 350, y: 550, w: 100, h: 15 })
        const ball = make_ball(engine, world, { x: 400, y: 545, vx: 1, vy: 4 })
        set_collision(engine, ball, bat)
        run(engine, world)
        assert.equal(Velocity2d.x[ball], 0, 'centre hit should produce vx = 0')
        assert.ok(Velocity2d.y[ball] < 0)
    },

    // ── speed_factor ────────────────────────────────────────────────────────

    'speed_factor amplifies velocity magnitude on bounce': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4, speed_factor: 2 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.equal(Velocity2d.y[ball], 8)
    },

    'speed_factor = 1 leaves speed unchanged': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4, speed_factor: 1 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.equal(Velocity2d.y[ball], 4)
    },

    // ── max_speed ───────────────────────────────────────────────────────────

    'max_speed caps total speed after bounce': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4, speed_factor: 10, max_speed: 5 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        const speed = Math.hypot(Velocity2d.x[ball], Velocity2d.y[ball])
        assert.ok(speed <= 5 + 1e-9, `speed ${speed} exceeds max_speed 5`)
    },

    'max_speed = 0 means unlimited': (engine, world) => {
        const { Velocity2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4, speed_factor: 3, max_speed: 0 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.equal(Velocity2d.y[ball], 12)
    },

    // ── CollideeResponseDestroy ─────────────────────────────────────────────

    'block is marked Destroyed on collision': (engine, world) => {
        const { hasComponent } = engine.bitecs
        const { Destroyed } = engine.mods.collision_response.components
        const ball  = make_ball(engine, world, { x: 200, y: 105, vx: 0, vy: -4 })
        const block = make_block(engine, world, { x: 168, y: 80, w: 64, h: 20 })
        set_collision(engine, ball, block)
        run(engine, world)
        assert.ok(hasComponent(world, block, Destroyed), 'block should have Destroyed component')
    },

    'wall without CollideeResponseDestroy is not destroyed': (engine, world) => {
        const { hasComponent } = engine.bitecs
        const { Destroyed } = engine.mods.collision_response.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(!hasComponent(world, wall, Destroyed), 'wall must not be destroyed')
    },

    // ── No ColliderResponseBounce ───────────────────────────────────────────

    'ball without ColliderResponseBounce passes through (velocity unchanged)': (engine, world) => {
        const { addEntity, addComponent } = engine.bitecs
        const { Position2d, Velocity2d, Circle } = engine.mods.twodee.components
        const ball = addEntity(world)
        addComponent(world, ball, Position2d)
        Position2d.x[ball] = 400
        Position2d.y[ball] = 5
        addComponent(world, ball, Velocity2d)
        Velocity2d.x[ball] = 0
        Velocity2d.y[ball] = -4
        addComponent(world, ball, Circle)
        Circle.radius[ball] = 6
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.equal(Velocity2d.x[ball], 0)
        assert.equal(Velocity2d.y[ball], -4, 'velocity must be unchanged without bounce component')
    },

    // ── CollideeResponseVelocityTransfer ────────────────────────────────────

    'CollideeResponseVelocityTransfer adds fraction of ball velocity to other entity': (engine, world) => {
        const { addComponent } = engine.bitecs
        const { Velocity2d } = engine.mods.twodee.components
        const { CollideeResponseVelocityTransfer } = engine.mods.collision_response.components
        const ball   = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4 })
        const target = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        addComponent(world, target, Velocity2d)
        Velocity2d.x[target] = 0
        Velocity2d.y[target] = 0
        addComponent(world, target, CollideeResponseVelocityTransfer)
        CollideeResponseVelocityTransfer.amount[target] = 0.5
        set_collision(engine, ball, target)
        run(engine, world)
        // Ball bounces (vy flipped to +4), transfer: target.vy += 4 * 0.5 = 2
        assert.equal(Velocity2d.y[target], 2, `expected 2, got ${Velocity2d.y[target]}`)
    },

    // ── ColliderResponseSeparate ────────────────────────────────────────────

    'ColliderResponseSeparate pushes ball out of rectangle overlap': (engine, world) => {
        const { Position2d } = engine.mods.twodee.components
        // Ball centre at y=5, radius=6. Wall: y=-20 to y=0 (bottom edge at 0).
        // nearest_y = 0, dy = 5, dist = 5, penetration = 6-5 = 1 → pushed to y=6.
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4, r: 6, separate: true })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.ok(Position2d.y[ball] >= 6 - 1e-9, `expected y >= 6, got ${Position2d.y[ball]}`)
    },

    'ColliderResponseSeparate without the component leaves position unchanged': (engine, world) => {
        const { Position2d } = engine.mods.twodee.components
        const ball = make_ball(engine, world, { x: 400, y: 5, vx: 0, vy: -4, r: 6 })
        const wall = make_wall(engine, world, { x: -20, y: -20, w: 840, h: 20 })
        set_collision(engine, ball, wall)
        run(engine, world)
        assert.equal(Position2d.y[ball], 5, 'position must be unchanged without separate component')
    },
}
