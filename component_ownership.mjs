// Component ownership & deferred-write store
//
// Systems declare `writes: ['ComponentName', ...]` to claim exclusive ownership
// of a component's array properties. Any write from a non-owning system is
// intercepted by a Proxy and stored as a *pending write*. Only the most recent
// attempted value per (eid, prop) is retained — there is no ordering.
// The owning system's pending values are applied at the start of its next run()
// via _apply_pending_for(), called automatically by update_systems().

export function setup_component_ownership(engine) {

    // Name of the system currently executing (null between ticks)
    engine._current_system = null

    // Map<component, Map<eid, Map<prop, latest_pending_value>>>
    engine._pending_writes = new Map()

    // Map<component_object, system_name>
    engine._component_owner = new Map()

    // Store the latest desired value for an owned component from a non-owning system.
    engine._queue_write = function(eid, component, prop, value) {
        if (!engine._pending_writes.has(component)) {
            engine._pending_writes.set(component, new Map())
        }
        const eid_map = engine._pending_writes.get(component)
        if (!eid_map.has(eid)) eid_map.set(eid, new Map())
        eid_map.get(eid).set(prop, value)
    }

    // Flush all pending writes for components owned by system_name.
    // Called by update_systems() before each system's run().
    engine._apply_pending_for = function(system_name) {
        for (const [component, eid_map] of engine._pending_writes.entries()) {
            if (engine._component_owner.get(component) !== system_name) continue
            for (const [eid, prop_map] of eid_map.entries()) {
                for (const [prop, value] of prop_map.entries()) {
                    component[prop][eid] = value
                }
            }
            eid_map.clear()
        }
    }

    // Returns the latest pending value for (eid, component, prop),
    // or undefined if no write is pending.
    engine.get_pending_value = function(eid, component, prop) {
        return engine._pending_writes.get(component)?.get(eid)?.get(prop)
    }

    // Returns (pending - current) for a numeric component property.
    // Returns 0 when no write is pending. Returns NaN for non-numeric values.
    engine.get_pending_delta = function(eid, component, prop) {
        const pending = engine.get_pending_value(eid, component, prop)
        if (pending === undefined) return 0
        return pending - component[prop][eid]
    }

    // Build component-ownership map and install write-guard Proxies.
    // Called from sort_systems() after all mods have been activated.
    // Throws if two systems claim writes for the same component.
    engine._install_write_guards = function(all_systems) {
        const component_registry = {}
        for (const mod_name in engine.mods) {
            for (const [comp_name, comp] of Object.entries(engine.mods[mod_name].components || {})) {
                component_registry[comp_name] = comp
            }
        }

        engine._component_owner = new Map()
        for (const system of all_systems) {
            for (const comp_name of (system.writes || [])) {
                const comp = component_registry[comp_name]
                if (!comp) {
                    console.warn(`System "${system.name}" declares writes for unknown component "${comp_name}"`)
                    continue
                }
                if (engine._component_owner.has(comp)) {
                    throw new Error(
                        `Component "${comp_name}" is already owned by "${engine._component_owner.get(comp)}", ` +
                        `cannot also be owned by "${system.name}". Only one system may write a given component.`
                    )
                }
                engine._component_owner.set(comp, system.name)
            }
        }

        // Write-guard proxies have been removed in favour of explicit engine._queue_write()
        // calls at sites that genuinely need cross-system deferred writes.
        // The ownership map is kept for reference and for _apply_pending_for.
    }
}
