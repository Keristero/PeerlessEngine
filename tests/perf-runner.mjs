// Single-scenario performance runner.
//
// Spawned by perf-suite.mjs (or run directly) with env vars:
//   PERFORMANCE_INSTRUMENTATION=true
//   EXIT_AFTER_X_UPDATES=<n>   (default 120)
//   SPAWN_RATE=<n>             (default 40)  balls spawned per tick
//   USE_ENGINE_POOL=true       recycle with engine pool mod instead of removeEntity
//
// Two modes:
//   default         — balls tagged Destroyed when OOB; destructionSystem removes them
//   USE_ENGINE_POOL — balls returned to pool buffer; factory.spawn() reuses them
//
// Does NOT use find_and_load_mods (browser-only) — activates mods manually.

import engine from '../engine.mjs'
import { mod as twodee_mod }            from '../mods/2d/twodee.mjs'
import { mod as collision_mod }         from '../mods/collision/collision.mjs'
import { mod as collision_response_mod} from '../mods/collision_response/collision_response.mjs'
import { mod as pool_mod }              from '../mods/pool/pool.mjs'
import { mod as perf_mod }              from '../mods/perf/perf.mjs'

const SPAWN_RATE      = parseInt(process.env.SPAWN_RATE           ?? '40')
const UPDATES         = parseInt(process.env.EXIT_AFTER_X_UPDATES ?? '120')
const USE_ENGINE_POOL = process.env.USE_ENGINE_POOL === 'true'

// populated after world setup so system closures can reference them
let _layer_id, _BALL, _WORLD

// ── Ball factory ──────────────────────────────────────────────────────────────
// create(): adds all components and sets initial values — used for fresh entities
//           and as the overflow path when the pool is empty.
// reuse():  resets position + velocity only; all other components persist.
// spawn:    patched by pool_mod.register_factory() when USE_ENGINE_POOL.

const ball_factory = {
    create(eng, eid) {
        const { addComponent } = eng.bitecs
        const { Position2d, Circle, Velocity2d } = eng.mods.twodee.components
        const { Collision } = eng.mods.collision.components
        const { ColliderResponseBounce, ColliderResponseSeparate } = eng.mods.collision_response.components
        addComponent(eng.world, eid, Position2d)
        addComponent(eng.world, eid, Velocity2d)
        addComponent(eng.world, eid, Circle)
        Circle.radius[eid] = 4
        addComponent(eng.world, eid, Collision)
        Collision.layer_id[eid] = _layer_id
        Collision.category[eid] = _BALL
        Collision.mask[eid]     = _WORLD
        addComponent(eng.world, eid, ColliderResponseBounce)
        ColliderResponseBounce.speed_factor[eid] = 1.0
        addComponent(eng.world, eid, ColliderResponseSeparate)
        ball_factory.reuse(eng, eid)
    },
    reuse(eng, eid) {
        const { Position2d, Velocity2d } = eng.mods.twodee.components
        const angle = Math.random() * 2 * Math.PI
        Position2d.x[eid] = 20 + Math.random() * 760
        Position2d.y[eid] = 20 + Math.random() * 560
        Velocity2d.x[eid] = Math.cos(angle) * 40
        Velocity2d.y[eid] = Math.sin(angle) * 40
    },
    spawn: null,  // patched by pool_mod.register_factory
}

// ── outOfBoundsSystem ─────────────────────────────────────────────────────────
// Tags OOB balls with Destroyed.  In destroy mode, destructionSystem removes
// them next tick.  In engine pool mode, poolReturnSystem intercepts them first.

const outOfBoundsSystem = {
    name: 'outOfBoundsSystem',
    category: 'physics',
    dependencies: ['destructionSystem'],
    run(eng, world) {
        const { query, addComponent } = eng.bitecs
        const { Position2d, Circle, Velocity2d } = eng.mods.twodee.components
        const { Destroyed }                       = eng.mods.collision_response.components
        for (const eid of query(world, [Position2d, Circle, Velocity2d])) {
            const x = Position2d.x[eid], y = Position2d.y[eid]
            if (x < -50 || x > 850 || y < -50 || y > 650) {
                addComponent(world, eid, Destroyed)
            }
        }
    },
}

// ── ballSpawnSystem ───────────────────────────────────────────────────────────
// Spawns SPAWN_RATE balls per tick.  In engine pool mode, factory.spawn()
// recycles a pooled entity if available; otherwise creates a fresh one.

const ballSpawnSystem = USE_ENGINE_POOL ? {
    name: 'ballSpawnSystem',
    category: 'physics',
    dependencies: ['outOfBoundsSystem', 'poolReturnSystem'],
    run(eng, world) {
        for (let i = 0; i < SPAWN_RATE; i++) {
            ball_factory.spawn(eng)
        }
    },
} : {
    name: 'ballSpawnSystem',
    category: 'physics',
    dependencies: ['outOfBoundsSystem'],
    run(eng, world) {
        for (let i = 0; i < SPAWN_RATE; i++) {
            const eid = eng.bitecs.addEntity(world)
            ball_factory.create(eng, eid)
        }
    },
}

const suite_mod = {
    name: 'perf_suite',
    dependencies: USE_ENGINE_POOL
        ? ['twodee', 'collision_response', 'pool']
        : ['twodee', 'collision_response'],
    components: {},
    systems: { outOfBoundsSystem, ballSpawnSystem },
    activate: async function (engine) {
        if (USE_ENGINE_POOL) {
            engine.mods.pool.register_factory(engine, ball_factory)
        }
    },
}

// ── Engine initialisation ─────────────────────────────────────────────────────

engine.world            = engine.bitecs.createWorld()
engine.mods             = {}
engine.sorted_systems   = {}
engine._pending_writes  = new Map()
engine._component_owner = new Map()

// Activate mods in dependency order.
await engine.activate_mod(twodee_mod)
await engine.activate_mod(collision_mod)
await engine.activate_mod(collision_response_mod)
if (USE_ENGINE_POOL) await engine.activate_mod(pool_mod)
await engine.activate_mod(suite_mod)
await engine.activate_mod(perf_mod)   // wraps update_systems if PERFORMANCE_INSTRUMENTATION set

engine.sort_systems()
if (USE_ENGINE_POOL) await pool_mod.load(engine, engine.world)

// ── World setup ───────────────────────────────────────────────────────────────

const { addEntity, addComponent } = engine.bitecs
const { Position2d, Rectangle } = engine.mods.twodee.components
const { Collision }             = engine.mods.collision.components

const layer_id         = engine.mods.collision.register_layer('game', { cell_size: 64 })
const { BALL, WORLD }  = engine.mods.collision.define_groups('BALL', 'WORLD')
_layer_id = layer_id; _BALL = BALL; _WORLD = WORLD

// Three walls (left, right, top) — no bottom wall so balls escape downward.
for (const { x, y, w, h } of [
    { x: -20, y: -20, w: 20,  h: 640 },
    { x: 800, y: -20, w: 20,  h: 640 },
    { x: -20, y: -20, w: 840, h: 20  },
]) {
    const eid = addEntity(engine.world)
    addComponent(engine.world, eid, Position2d)
    Position2d.x[eid] = x
    Position2d.y[eid] = y
    addComponent(engine.world, eid, Rectangle)
    Rectangle.width[eid]  = w
    Rectangle.height[eid] = h
    addComponent(engine.world, eid, Collision)
    Collision.layer_id[eid]  = layer_id
    Collision.category[eid]  = WORLD
    Collision.mask[eid]      = BALL
}

// ── Simulation loop ───────────────────────────────────────────────────────────

for (let u = 0; u < UPDATES; u++) {
    engine.update_systems('physics')
}

// ── Report ────────────────────────────────────────────────────────────────────

perf_mod.report()
console.log('%%PERF_DATA%%')
console.log(JSON.stringify(perf_mod.raw_data()))
