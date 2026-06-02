const system = {
    name: "inputSystem",
    category: "input",
    dependencies: ["mouseRawInputSystem", "keyboardRawInputSystem"],
    run: function (engine, world) {
        const mod = engine.mods.input
        if (!mod.mappings.length) return
        const { query } = engine.bitecs

        // Collect unique (component, property) pairs to reset before accumulating
        const to_reset = new Map()
        for (const mapping of mod.mappings) {
            if (!to_reset.has(mapping.component)) to_reset.set(mapping.component, new Set())
            to_reset.get(mapping.component).add(mapping.target_component_property)
        }

        for (const [component, properties] of to_reset) {
            for (const eid of query(world, [component])) {
                for (const prop of properties) {
                    component[prop][eid] = 0
                }
            }
        }

        // Accumulate values from devices into component properties.
        // input_mode selects which read method is used (default: "state").
        for (const mapping of mod.mappings) {
            const device = mod.devices[mapping.input_device_alias]
            if (!device) continue
            const mode = mapping.input_mode ?? "state"
            const raw = mode === "pressed"
                ? device.read_pressed(mapping.input_device_input_name)
                : mode === "released"
                    ? device.read_released(mapping.input_device_input_name)
                    : device.read(mapping.input_device_input_name)
            if (!raw) continue
            const value = raw * (mapping.target_value_multiplier ?? 1)
            for (const eid of query(world, [mapping.component])) {
                mapping.component[mapping.target_component_property][eid] += value
            }
        }

        // Flush every device — resets pressed/released flags and delta accumulators.
        // This must happen after all mappings have been read for this tick.
        for (const device of Object.values(mod.devices)) {
            device.flush()
        }

        // Clamp properties that have restrictions declared
        for (const r of mod.restrictions) {
            const min = r.min_value ?? -Infinity
            const max = r.max_value ?? Infinity
            for (const eid of query(world, [r.component])) {
                r.component[r.target_component_property][eid] = Math.max(
                    min,
                    Math.min(max, r.component[r.target_component_property][eid])
                )
            }
        }
    }
}

export default system
