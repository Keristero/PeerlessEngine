import * as components from "./components/twodee_components.mjs"
import physicsSystem from "./systems/physics_system.mjs"

const mod = {
    name: "twodee",
    dependencies: [],
    components: components,
    relationships: {},
    systems: { physicsSystem },
}

mod.activate = async function(engine,world){
    let {observe,onAdd,onSet,onRemove,registerComponent, addComponent, createRelation, makeExclusive} = engine.bitecs

    let { Circle, Position2d, Velocity2d, Rectangle, Moved } = components
    //register components
    registerComponent(world, Position2d)
    registerComponent(world, Velocity2d)
    registerComponent(world, Circle)
    registerComponent(world, Rectangle)
    registerComponent(world, Moved)
}

export {mod}