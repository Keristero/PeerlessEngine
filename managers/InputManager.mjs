import RollbackQueue from "./RollbackQueue.mjs"

class InputManager{
    constructor(){
        this.mouse = {
            x:0,
            y:0,
            left_click:false,
            right_click:false,
            left_click_up:false,
            right_click_up:false 
        }
        this.keyboard = {

        }
        this.latest_state = {}
        this.keyboard_bindings = {
            w:"up",
            s:"down",
            a:"left",
            d:"right"
        }
        this.mouse_bindings = {
            left_click:"mouse_left_click",
            right_click:"mouse_right_click",
            left_click_up:"mouse_left_click_up",
            right_click_up:"mouse_right_click_up",
            x:"mouse_x",
            y:"mouse_y"
        }
        this.add_mouse_listeners()
        this.add_keyboard_listeners()
    }
    add_keyboard_listeners(){
        window.addEventListener('keyup', (e) => {
            console.log(e.key)
            this.keyboard[e.key] = false
        });
        window.addEventListener('keydown', (e) => this.keyboard[e.key] = true);
    }
    add_mouse_listeners(){
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.pageX
            this.mouse.y = e.pageY
        });
        window.addEventListener('mousedown', (e) => {
            if(e.button == 0){
                this.mouse.left_click = true
            }
            if(e.button == 2){
                this.mouse.right_click = true
            }
        });
        window.addEventListener('mouseup', (e) => {
            if(e.button == 0){
                this.mouse.left_click = false
                this.mouse.left_click_up = true
            }
            if(e.button == 2){
                this.mouse.right_click = false
                this.mouse.right_click_up = true
            }
        });
        window.addEventListener('contextmenu', event => {
            event.preventDefault();
        });

    }
    late_poll_state(){
        let state = {}
        for(let mapped_from in this.mouse_bindings){
            let value = this.mouse[mapped_from] || false
            let mapped_to = this.mouse_bindings[mapped_from]
            state[mapped_to] = value
        }
        for(let mapped_from in this.keyboard_bindings){
            let value = this.keyboard[mapped_from] || false
            let mapped_to = this.keyboard_bindings[mapped_from]
            state[mapped_to] = value
        }
        this.mouse.left_click_up = false
        this.mouse.right_click_up = false
        return state
    }
}

const input_manager = new InputManager()

export default input_manager