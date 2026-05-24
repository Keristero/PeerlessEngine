import pool_return_system from './systems/pool_return_system.mjs'
import pool_prune_system  from './systems/pool_prune_system.mjs'
import { PoolMember }     from './components/pool_components.mjs'

export const mod = {
    name: 'pool',
    dependencies: [],
    components: { PoolMember },
    systems: { pool_return_system, pool_prune_system },

    activate: async function (engine, world) {
        const { registerComponent } = engine.bitecs
        registerComponent(world, PoolMember)

        mod._pools = new Map()
        mod._next_pool_id = 0

        // Called by other mods in their own activate() to register a factory.
        // Patches factory.spawn onto the factory object and returns it.
        //
        //   factory    : object with create(engine, eid) and reuse(engine, eid)
        //   pool_config: optional pool options (see defaults below)
        mod.register_factory = function (engine, factory, pool_config = {}) {
            const config = {
                min_size:              0,
                max_size:              Infinity,
                allow_overflowing:     true,
                auto_prune_to_min_size: false,
                ...pool_config,
            }
            const pool_id = mod._next_pool_id++
            mod._pools.set(pool_id, { config, factory, items: [] })

            factory.spawn = function (engine) {
                return mod._spawn(engine, pool_id)
            }

            return factory.spawn
        }
    },

    // Called for every mod after all mods are activated and systems are sorted,
    // but before the first game tick.  Pre-fills min_size pools here so that
    // factory.create() can safely reference other mods' components.
    load: async function (engine, world) {
        const { addEntity, addComponent } = engine.bitecs
        const { Destroyed } = engine.mods.collision_response.components

        for (const [pool_id, pool] of mod._pools) {
            for (let i = 0; i < pool.config.min_size; i++) {
                const eid = addEntity(world)
                pool.factory.create(engine, eid)
                addComponent(world, eid, PoolMember)
                PoolMember.pool_id[eid] = pool_id
                // Mark inactive so regular systems (which query Not(Destroyed)) ignore them.
                addComponent(world, eid, Destroyed)
                pool.items.push(eid)
            }
        }
    },
}

// Separated from the mod object so it can reference mod._pools without circular issues.
mod._spawn = function (engine, pool_id) {
    const pool = mod._pools.get(pool_id)
    if (!pool) return null

    const { addEntity, addComponent, removeComponent, hasComponent } = engine.bitecs
    const { Destroyed } = engine.mods.collision_response.components

    if (pool.items.length > 0) {
        const eid = pool.items.pop()
        if (hasComponent(engine.world, eid, Destroyed)) {
            removeComponent(engine.world, eid, Destroyed)
        }
        pool.factory.reuse(engine, eid)
        return eid
    }

    if (!pool.config.allow_overflowing) {
        return null
    }

    const eid = addEntity(engine.world)
    addComponent(engine.world, eid, PoolMember)
    PoolMember.pool_id[eid] = pool_id
    pool.factory.create(engine, eid)
    pool.factory.reuse(engine, eid)
    return eid
}
