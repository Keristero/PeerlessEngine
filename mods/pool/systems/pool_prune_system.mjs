// Gradually destroys excess pool entities for pools configured with
// auto_prune_to_min_size = true, keeping per-tick work bounded.
//
// Pools are processed in order of highest fill ratio (items.length / max_size)
// so the most oversized pools drain first. At most MAX_PRUNE_PER_UPDATE
// entities are removed across all pools per tick.

const MAX_PRUNE_PER_UPDATE = 20

const system = {
    name: 'poolPruneSystem',
    category: 'physics',
    dependencies: ['poolReturnSystem'],
    run(engine, world) {
        const { removeEntity, removeQuery, Wildcard } = engine.bitecs
        const pools = engine.mods.pool._pools

        // Collect pools that need pruning
        const to_prune = []
        for (const pool of pools.values()) {
            if (!pool.config.auto_prune_to_min_size) continue
            if (pool.items.length <= pool.config.min_size) continue
            const ratio = pool.config.max_size === Infinity
                ? pool.items.length
                : pool.items.length / pool.config.max_size
            to_prune.push({ pool, ratio })
        }

        // Most oversized pools get budget first
        to_prune.sort((a, b) => b.ratio - a.ratio)

        let budget = MAX_PRUNE_PER_UPDATE
        for (const { pool } of to_prune) {
            while (budget > 0 && pool.items.length > pool.config.min_size) {
                const eid = pool.items.pop()
                removeEntity(world, eid)
                removeQuery(world, [Wildcard(eid)])
                budget--
            }
            if (budget <= 0) break
        }
    },
}

export default system
