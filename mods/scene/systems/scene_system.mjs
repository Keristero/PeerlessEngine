// Runs at the end of every tick (category: "scene").
// Processes one pending scene transition: calls cleanup on the current scene,
// then create (first visit) or reuse (subsequent visit) on the target scene.

const system = {
    name: "sceneSystem",
    category: "scene",
    dependencies: [],
    run: function(engine, world) {
        const scene = engine.mods.scene
        if (!scene._pending) return

        const { name, data } = scene._pending
        scene._pending = null

        const descriptor = scene._scenes.get(name)
        if (!descriptor) {
            console.warn(`[scene] Transition to unknown scene "${name}" ignored.`)
            return
        }

        // Let the current scene clean up before leaving
        if (scene._current_scene !== null) {
            const current = scene._scenes.get(scene._current_scene)
            if (current) current.cleanup(engine, world)
        }

        if (scene._created_scenes.has(name)) {
            descriptor.reuse(engine, world, data)
        } else {
            descriptor.create(engine, world, data)
            scene._created_scenes.add(name)
        }

        scene._current_scene = name
    }
}

export default system
