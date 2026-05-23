import inputSystem from "./systems/input_system.mjs"

const mod = {
    name: "input",
    dependencies: [],
    systems: { inputSystem },
    // Initialized here so they exist even if activate is not called (e.g. in tests)
    devices: {},
    mappings: [],
    restrictions: [],
}

mod.activate = function (engine, world) {
    mod.devices = {}
    mod.mappings = []
    mod.restrictions = []
}

mod.register_device = function (alias, buffer) {
    mod.devices[alias] = buffer
}

mod.add_mapping = function (mapping) {
    mod.mappings.push(mapping)
}

mod.add_restriction = function (restriction) {
    mod.restrictions.push(restriction)
}

export { mod }
