import clickableSystem from "./systems/clickable_system.mjs"
import { Clickable } from "./components/clickable_components.mjs"

const mod = {
    name: "clickable",
    dependencies: ["events", "twodee", "mouse"],
    components: { Clickable },
    systems: { clickableSystem },
}

mod.activate = function(engine, world) {
    const { registerComponent } = engine.bitecs
    registerComponent(world, Clickable)
}

export { mod }
