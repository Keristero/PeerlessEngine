// Routes entities tagged with both Destroyed and PoolMember into their pool's
// item buffer rather than letting destructionSystem remove them.
//
// If the pool buffer is already at max_size the PoolMember component is removed
// so destructionSystem will destroy the entity normally.

const system = {
    name: 'poolReturnSystem',
    category: 'physics',
    dependencies: ['collisionResponseSystem'],
    run(engine, world) {
        const { query, removeComponent } = engine.bitecs
        const { PoolMember } = engine.mods.pool.components
        const { Destroyed } = engine.mods.collision_response.components
        const pools = engine.mods.pool._pools

        for (const eid of query(world, [Destroyed, PoolMember])) {
            const pool = pools.get(PoolMember.pool_id[eid])
            if (!pool) continue
            if (pool.items.length < pool.config.max_size) {
                pool.items.push(eid)
            } else {
                // Pool buffer full — drop PoolMember so destructionSystem destroys the entity.
                removeComponent(world, eid, PoolMember)
            }
        }
    },
}

export default system
