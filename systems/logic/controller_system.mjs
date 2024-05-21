import {
    defineQuery
} from '../../kerenginebitecs.mjs'
import { InputAnalog } from '../../components/components.mjs';


const movementQuery = defineQuery([InputAnalog])

const keyboard_keys = {}
window.addEventListener('keyup', (e) => {
    console.log(e.key)
    keyboard_keys[e.key] = false
});
window.addEventListener('keydown', (e) => keyboard_keys[e.key] = true);

const system = world => {
    let x = 0
    let y = 0
    if(keyboard_keys['a']){
        x = -1
    }
    if(keyboard_keys['d']){
        x = 1
    }
    if(keyboard_keys['w']){
        y = -1
    }
    if(keyboard_keys['s']){
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