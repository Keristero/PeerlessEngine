import collisionResponseSystem from "./systems/collision_response_system.mjs"
import destructionSystem from "./systems/destruction_system.mjs"
import * as components from "./components/collision_response_components.mjs"

const mod = {
    name: "collision_response",
    dependencies: ["twodee", "collision"],
    components,
    systems: { collisionResponseSystem, destructionSystem },
}

mod.activate = async function (engine, world, deps) {
    const { registerComponent } = engine.bitecs
    for (const comp of Object.values(components)) {
        registerComponent(world, comp)
    }
}

export { mod }
