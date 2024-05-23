import {
    defineQuery
} from '../../kerenginebitecs.mjs'
import { InputAnalog } from '../../components/components.mjs';
import RollbackQueue from '../../managers/RollbackQueue.mjs'


const movementQuery = defineQuery([InputAnalog])

const system = world => {
    let state = RollbackQueue.read_present_predicted_state()
    let x = 0
    let y = 0
    if(state['left']){
        x = -1
    }
    if(state['right']){
        x = 1
    }
    if(state['up']){
        y = -1
    }
    if(state['down']){
        y = 1
    }
    const ents = movementQuery(world)
    for (let i = 0; i < ents.length; i++) {
        const eid = ents[i]
        InputAnalog.x[eid] = x
        InputAnalog.y[eid] = y
    }
    return world
}

export default system