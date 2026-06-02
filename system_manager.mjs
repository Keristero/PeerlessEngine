// System lifecycle: validation, category sorting, and per-tick execution.

export function setup_system_manager(engine) {

    // Collect all systems from loaded mods, validate categories and cross-category
    // dependencies, then:
    //   1. Sort always-on systems (not owned by any scene) into engine.sorted_systems.
    //   2. For each registered scene, build a complete sorted execution plan
    //      (always-on + that scene's systems) stored in scene._sorted_systems[name].
    engine.sort_systems = function() {
        const all_systems = []
        for (const mod_name in engine.mods) {
            const mod = engine.mods[mod_name]
            for (const system_key in (mod.systems || {})) {
                all_systems.push(mod.systems[system_key])
            }
        }

        const by_name = {}
        for (const system of all_systems) by_name[system.name] = system

        for (const system of all_systems) {
            if (!system.category) {
                throw new Error(`System "${system.name}" is missing a required "category" field.`)
            }
            for (const dep_name of (system.dependencies || [])) {
                const dep = by_name[dep_name]
                if (dep && dep.category !== system.category) {
                    throw new Error(
                        `System "${system.name}" (category: "${system.category}") cannot depend on "${dep_name}" ` +
                        `(category: "${dep.category}"). Cross-category dependencies are not allowed — systems in ` +
                        `different categories run on independent schedules.`
                    )
                }
            }
        }

        // Collect the names of all systems owned by at least one scene.
        const scene_mod = engine.mods.scene
        const scene_owned = new Set()
        if (scene_mod) {
            for (const [, descriptor] of scene_mod._scenes) {
                for (const name of descriptor.systems) scene_owned.add(name)
            }
        }

        // Always-on systems: not owned by any scene.
        const always_on_by_category = {}
        for (const system of all_systems) {
            if (!scene_owned.has(system.name)) {
                if (!always_on_by_category[system.category]) always_on_by_category[system.category] = []
                always_on_by_category[system.category].push(system)
            }
        }

        // engine.sorted_systems holds the always-on lists (used when no scene is active).
        engine.sorted_systems = {}
        for (const category in always_on_by_category) {
            engine.sorted_systems[category] = engine.topological_sort(always_on_by_category[category])
        }

        // Per-scene sorted graphs: always-on systems merged with each scene's own systems,
        // topologically sorted per category so dependencies are respected across both sets.
        // Stored on engine (not on the scene mod) since this is execution infrastructure.
        engine._scene_graphs = {}
        if (scene_mod) {
            for (const [scene_name, descriptor] of scene_mod._scenes) {
                const by_category = {}

                // Seed with always-on systems.
                for (const category in always_on_by_category) {
                    by_category[category] = [...always_on_by_category[category]]
                }
                // Append scene-specific systems.
                for (const system of all_systems) {
                    if (descriptor.systems.has(system.name)) {
                        if (!by_category[system.category]) by_category[system.category] = []
                        by_category[system.category].push(system)
                    }
                }

                engine._scene_graphs[scene_name] = {}
                for (const category in by_category) {
                    engine._scene_graphs[scene_name][category] =
                        engine.topological_sort(by_category[category])
                }
            }
        }

    }

    // Run all systems for a category.
    // When a scene is active its pre-sorted graph (always-on + scene systems) is used,
    // so every category tick executes exactly the right set in the right order.
    engine.update_systems = function(category) {
        const scene_mod = engine.mods.scene
        const current_scene = scene_mod?._current_scene
        const systems =
            (current_scene && engine._scene_graphs?.[current_scene]?.[category])
                ? engine._scene_graphs[current_scene][category]
                : (engine.sorted_systems[category] || [])

        for (const system of systems) {
            system.run(engine, engine.world)
        }
    }
}
