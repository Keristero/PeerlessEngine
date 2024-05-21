import {
    defineQuery
} from '../../kerenginebitecs.mjs'
import { InputMouseCursor } from '../../components/components.mjs';


//disable context menu
window.addEventListener('contextmenu', event => {
    event.preventDefault();
});

const movementQuery = defineQuery([InputMouseCursor])

const mouse = {
    x:0,
    y:0,
    left_click:0,
    right_click:0
}

//record inputs
window.addEventListener('mousemove', (e) => {
    mouse.x = e.pageX
    mouse.y = e.pageY
});

window.addEventListener('mousedown', (e) => {
    if(e.button == 0){
        mouse.left_click = true
        mouse.left_click_down = true
    }
    if(e.button == 2){
        mouse.right_click = true
        mouse.right_click_down = true
    }
});

window.addEventListener('mouseup', (e) => {
    if(e.button == 0){
        mouse.left_click = false
        mouse.left_click_up = true
    }
    if(e.button == 2){
        mouse.right_click = false
        mouse.right_click_up = true
    }
});

const system = world => {
    const ents = movementQuery(world)
    for (let i = 0; i < ents.length; i++) {
        const eid = ents[i]

        //now update values
        InputMouseCursor.x[eid] = mouse.x
        InputMouseCursor.y[eid] = mouse.y
        InputMouseCursor.left_click[eid] = mouse.left_click
        InputMouseCursor.right_click[eid] = mouse.right_click
        InputMouseCursor.left_click_down[eid] = mouse.left_click_down
        InputMouseCursor.left_click_up[eid] = mouse.left_click_up
        InputMouseCursor.right_click_down[eid] = mouse.right_click_down
        InputMouseCursor.right_click_up[eid] = mouse.right_click_up
    }
    //then reset button changes
    mouse.left_click_down = false
    mouse.left_click_up = false
    mouse.right_click_down = false
    mouse.right_click_up = false
    return world
}

export default system