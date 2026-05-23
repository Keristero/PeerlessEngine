// Removes every entity that has been tagged with the Destroyed component.
// Runs after collisionResponseSystem so all destruction decisions have been made.

const system = {
    name: "destructionSystem",
    category: "physics",
    dependencies: ["collisionResponseSystem"],
    run: function (engine, world) {
        const { query, removeEntity } = engine.bitecs
        const { Destroyed } = engine.mods.collision_response.components
        for (const eid of query(world, [Destroyed])) {
            removeEntity(world, eid)
        }
    }
}

export default system
