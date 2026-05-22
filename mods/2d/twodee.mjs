import * as components from "./components/twodee_components.mjs"

const mod = {
    name:"twodee",
    dependencies:[],
    components:components,
    relationships:{}
}

mod.activate = async function(engine,world){
    let {observe,onAdd,onSet,onRemove,registerComponent, addComponent, createRelation, makeExclusive} = engine.bitecs

    let { Circle, Position2d, Velocity2d, Rectangle } = components
    //register components
    registerComponent(world,Position2d)
    registerComponent(world,Velocity2d)
    registerComponent(world,Circle)
    registerComponent(world,Rectangle)
}

export {mod}