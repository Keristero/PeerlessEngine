// Removes every entity that has been tagged with the Destroyed component.
// Runs after collisionResponseSystem so all destruction decisions have been made.

const system = {
    name: "destructionSystem",
    category: "physics",
    dependencies: ["collisionResponseSystem"],
    run: function (engine, world) {
        const { query, removeEntity, removeQuery, Wildcard, hasComponent } = engine.bitecs
        const { Destroyed } = engine.mods.collision_response.components
        const PoolMember = engine.mods.pool?.components?.PoolMember
        for (const eid of query(world, [Destroyed])) {
            // Pool members are managed by poolReturnSystem — skip them here.
            if (PoolMember && hasComponent(world, eid, PoolMember)) continue
            removeEntity(world, eid)
            removeQuery(world, [Wildcard(eid)])
        }
    }
}

export default system
