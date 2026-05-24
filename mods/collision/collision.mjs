import collisionSystem from "./systems/collision_system.mjs"
import * as components from "./components/collision_components.mjs"

const mod = {
    name: "collision",
    dependencies: ["twodee"],
    components: components,
    relationships: {},
    systems: { collisionSystem },
    layers: {},
    active_collisions: [],
}

mod.activate = async function (engine, world) {
    const { registerComponent } = engine.bitecs
    const { Collision } = components

    registerComponent(world, Collision)

    mod._next_layer_id = 1
    mod.layers = {}
    mod.active_collisions = []
    mod.colliding_with = new Map()
}

// Allocates a unique power-of-2 bit for each named group.
// Returns an object mapping each name to its bit value.
// Usage:
//   const { BALL, WORLD } = deps.collision.define_groups('BALL', 'WORLD')
//   Collision.category[ball_eid] = BALL;  Collision.mask[ball_eid] = WORLD
//   Collision.category[wall_eid] = WORLD; Collision.mask[wall_eid] = BALL
mod.define_groups = function(...names) {
    if (names.length > 31) throw new Error('Too many collision groups (max 31)')
    const result = {}
    for (let i = 0; i < names.length; i++) result[names[i]] = 1 << i
    return result
}

mod.register_layer = function (alias, { cell_size = 64 } = {}) {
    const id = mod._next_layer_id++
    mod.layers[alias] = { id, cell_size }
    return id
}

export { mod }
