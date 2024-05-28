import {
    Types,
    defineComponent,
} from '../kerenginebitecs.mjs'

const Vector2 = { x: Types.f32, y: Types.f32}
const RGB = { r: Types.ui8, g: Types.ui8, b: Types.ui8 }

//Engine components
export const Variety = defineComponent({vid:Types.i16})
export const InputAnalog = defineComponent(Vector2)
export const FrameCounter = defineComponent({frame:Types.i32})
export const InputMouseCursor = defineComponent(
    {
        x:Types.i16,
        y:Types.i16,
        left_click:Types.ui8,
        right_click:Types.ui8,
        left_click_down:Types.ui8,
        left_click_up:Types.ui8,
        right_click_down:Types.ui8,
        right_click_up:Types.ui8,
    }
)
export const Node = defineComponent({
    parent_eid:Types.ui32,
    depth:Types.ui8,
    use_parent_position:Types.ui8
})
export const Clickable = defineComponent()
export const Hidden = defineComponent()

//Basic components
//Resources
export const Sprite = defineComponent({rid:Types.ui32})
export const Animation = defineComponent({
    state:Types.ui8,
    frame:Types.ui8,
    is_looping:Types.ui8,
    rid:Types.ui32
})

//Complex types
export const Text = defineComponent({
    ctid:Types.ui16,
    font_size:Types.ui8
})

//Other
export const Rectangle = defineComponent({
    width:Types.ui16,
    height:Types.ui16
})
export const Position = defineComponent(Vector2)
export const RelativePosition = defineComponent(Vector2)
export const Velocity = defineComponent(Vector2)
export const Interpolate = defineComponent()
export const RGBColor = defineComponent(RGB)
export const Animated = defineComponent({
    speed:Types.f32,
    frame_elapsed:Types.f32,
    is_looping:Types.ui8,
    is_paused:Types.ui8
})
export const Rotation = defineComponent({radians:Types.f32})