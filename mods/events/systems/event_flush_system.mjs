// Clears all event queues at the end of each tick, after all other scene-category
// systems have had a chance to read events.
const system = {
    name: "eventFlushSystem",
    category: "scene",
    dependencies: ["sceneSystem"],
    run: function(engine, world) {
        engine.mods.events._flush()
    }
}

export default system
