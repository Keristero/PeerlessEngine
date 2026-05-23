// System lifecycle: validation, category sorting, and per-tick execution.

export function setup_system_manager(engine) {

    // Collect all systems from loaded mods, validate categories and cross-category
    // dependencies, sort each category topologically, then install write guards.
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

        const by_category = {}
        for (const system of all_systems) {
            if (!by_category[system.category]) by_category[system.category] = []
            by_category[system.category].push(system)
        }

        engine.sorted_systems = {}
        for (const category in by_category) {
            engine.sorted_systems[category] = engine.topological_sort(by_category[category])
        }

        engine._install_write_guards(all_systems)
    }

    // Run all systems for a category in sorted order.
    // Each system's owned component pending-writes are applied before its run().
    engine.update_systems = function(category) {
        const systems = engine.sorted_systems[category] || []
        for (const system of systems) {
            engine._current_system = system.name
            engine._apply_pending_for(system.name)
            system.run(engine, engine.world)
            engine._current_system = null
        }
    }
}
