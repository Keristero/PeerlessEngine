import assert from "node:assert/strict"

// sort_systems must be called so update_systems("input") resolves to inputSystem
export const setup = async function (engine, world) {
    engine.sort_systems()
}

// Minimal device factory for tests — implements the input device interface
const make_device = (state = {}) => ({
    read:          (key) => state[key] ?? 0,
    read_pressed:  (_)   => 0,
    read_released: (_)   => 0,
    flush:         ()    => {},
    state,
})

export const tests = {
    "applies buffer value to component property": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        engine.mods.input.devices["t1"] = make_device({ "KEY_A": 1 })
        engine.mods.input.mappings.push({
            input_device_alias: "t1",
            input_device_input_name: "KEY_A",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 1,
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], 1)
    },

    "target_value_multiplier scales the result": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        engine.mods.input.devices["t2"] = make_device({ "KEY_B": 1 })
        engine.mods.input.mappings.push({
            input_device_alias: "t2",
            input_device_input_name: "KEY_B",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 3,
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], 3)
    },

    "negative multiplier gives negative value": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        engine.mods.input.devices["t3"] = make_device({ "KEY_C": 1 })
        engine.mods.input.mappings.push({
            input_device_alias: "t3",
            input_device_input_name: "KEY_C",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: -1,
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], -1)
    },

    "property resets to 0 on each tick": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        const device = make_device({ "KEY_D": 1 })
        engine.mods.input.devices["t4"] = device
        engine.mods.input.mappings.push({
            input_device_alias: "t4",
            input_device_input_name: "KEY_D",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 1,
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], 1)

        device.state["KEY_D"] = 0
        engine.update_systems("input")
        assert.equal(comp.value[eid], 0)
    },

    "two opposing mappings on the same property cancel out": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        engine.mods.input.devices["t5a"] = make_device({ "KEY_E": 1 })
        engine.mods.input.devices["t5b"] = make_device({ "KEY_F": 1 })
        engine.mods.input.mappings.push({
            input_device_alias: "t5a",
            input_device_input_name: "KEY_E",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 1,
        })
        engine.mods.input.mappings.push({
            input_device_alias: "t5b",
            input_device_input_name: "KEY_F",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: -1,
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], 0)
    },

    "missing device is handled gracefully": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        engine.mods.input.mappings.push({
            input_device_alias: "no_such_device",
            input_device_input_name: "KEY_G",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 1,
        })

        assert.doesNotThrow(() => engine.update_systems("input"))
        assert.equal(comp.value[eid], 0)
    },

    "only affects entities with the mapped component": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp_mapped = { value: [] }
        const comp_other = { value: [] }
        registerComponent(world, comp_mapped)
        registerComponent(world, comp_other)

        const eid_mapped = addEntity(world)
        addComponent(world, eid_mapped, comp_mapped)
        const eid_other = addEntity(world)
        addComponent(world, eid_other, comp_other)

        engine.mods.input.devices["t7"] = make_device({ "KEY_H": 1 })
        engine.mods.input.mappings.push({
            input_device_alias: "t7",
            input_device_input_name: "KEY_H",
            component: comp_mapped,
            target_component_property: "value",
            target_value_multiplier: 1,
        })

        engine.update_systems("input")
        assert.equal(comp_mapped.value[eid_mapped], 1)
        assert.equal(comp_other.value[eid_other] ?? 0, 0)
    },

    "min_value and max_value clamp the accumulated result": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        const device = make_device({ "KEY_I": 5 })
        engine.mods.input.devices["t8"] = device
        engine.mods.input.mappings.push({
            input_device_alias: "t8",
            input_device_input_name: "KEY_I",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 1,
        })
        engine.mods.input.restrictions.push({
            component: comp,
            target_component_property: "value",
            min_value: -1,
            max_value: 1,
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], 1, "positive overflow should clamp to max_value")

        device.state["KEY_I"] = -5
        engine.update_systems("input")
        assert.equal(comp.value[eid], -1, "negative overflow should clamp to min_value")
    },

    "input_mode: pressed fires once per press then clears after flush": function (engine, world) {
        const { addEntity, addComponent, registerComponent } = engine.bitecs
        const comp = { value: [] }
        registerComponent(world, comp)
        const eid = addEntity(world)
        addComponent(world, eid, comp)

        const pressed_state = { "FIRE": 1 }
        engine.mods.input.devices["t9"] = {
            read:          (_)   => 0,
            read_pressed:  (key) => pressed_state[key] ?? 0,
            read_released: (_)   => 0,
            flush:         ()    => { for (const k in pressed_state) pressed_state[k] = 0 },
        }
        engine.mods.input.mappings.push({
            input_device_alias: "t9",
            input_device_input_name: "FIRE",
            component: comp,
            target_component_property: "value",
            target_value_multiplier: 1,
            input_mode: "pressed",
        })

        engine.update_systems("input")
        assert.equal(comp.value[eid], 1, "pressed value should apply on the tick the key was pressed")

        engine.update_systems("input")
        assert.equal(comp.value[eid], 0, "flush should clear pressed flag so it does not fire again")
    },
}
