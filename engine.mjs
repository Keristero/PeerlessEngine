import * as bitecs from './node_modules/bitecs/dist/core/index.mjs'
import { setup_mod_loader } from './engine_mod_loader.mjs'

const {addComponent,addEntity} = bitecs

const engine = {
    bitecs:bitecs,
    world:undefined,
    mods:{},
    sorted_systems:[]
}

setup_mod_loader(engine)

engine.init = async function(engine_path="."){
    engine.world = bitecs.createWorld()
    let mods_path = engine_path + "/mods/"
    await engine.find_and_load_mods(mods_path)
}


export default engine