import {
    defineQuery,
    Changed
} from '../../kerenginebitecs.mjs'
import { Clickable, InputMouseCursor, Position, Rectangle } from '../../components/components.mjs';
import {point_rectangle_overlap} from '../../utilities/geometry.mjs'
import EventManager from '../../managers/EventManager.mjs';
import { EVENTS } from '../../engine_constants.mjs';



const mouseCursorQuery = defineQuery([Changed(InputMouseCursor)])
const clickableQuery = defineQuery([Clickable,Position,Rectangle])

const system = world => {
    const mouse_ents = mouseCursorQuery(world)
    for (let i = 0; i < mouse_ents.length; i++) {
        const eid = mouse_ents[i]
        var mouse_x = InputMouseCursor.x[eid]
        var mouse_y = InputMouseCursor.y[eid]
        var left_click_released = InputMouseCursor.left_click_up[eid]
    }
    const clickables = clickableQuery(world)
    for (let i = 0; i < clickables.length; i++) {
        const eid = clickables[i]
        const rect_x = Position.x[eid]
        const rect_y = Position.y[eid]
        const rect_w = Rectangle.width[eid]
        const rect_h = Rectangle.height[eid]
        if(point_rectangle_overlap(rect_x,rect_y,rect_w,rect_h,mouse_x,mouse_y) && left_click_released){
            EventManager.fire({
                type:EVENTS.EID_CLICKED,
                eid:eid
            })
        }
    }
    return world
}

export default system