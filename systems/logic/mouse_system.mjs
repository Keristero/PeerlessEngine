import {
    defineQuery
} from '../../kerenginebitecs.mjs'
import { InputMouseCursor } from '../../components/components.mjs';
import RollbackQueue from '../../managers/RollbackQueue.mjs';

const movementQuery = defineQuery([InputMouseCursor])

const system = world => {
    let state = RollbackQueue.read_present_predicted_state()
    const ents = movementQuery(world)
    for (let i = 0; i < ents.length; i++) {
        const eid = ents[i]

        //now update values
        InputMouseCursor.x[eid] = state.mouse_x
        InputMouseCursor.y[eid] = state.mouse_y
        InputMouseCursor.left_click[eid] = state.mouse_left_click
        InputMouseCursor.right_click[eid] = state.mouse_right_click
        InputMouseCursor.left_click_up[eid] = state.mouse_left_click_up
        InputMouseCursor.right_click_up[eid] = state.mouse_right_click_up
    }
    return world
}

export default system