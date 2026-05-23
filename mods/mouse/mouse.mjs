const mod = {
    name: "mouse",
    dependencies: [],
    device: {},
}

mod.activate = function (engine, world) {
    if (typeof window === "undefined") throw new Error("mouse mod requires a browser environment (window is not defined)")

    let _x = 0, _y = 0
    let _x_delta = 0, _y_delta = 0
    const btn_state = {}    // button0/1/2 → 0|1 current held state
    const btn_pressed = {}  // set on initial mousedown; cleared by flush()
    const btn_released = {} // set on mouseup; cleared by flush()

    mod.device = {
        read(key) {
            if (key === "x") return _x
            if (key === "y") return _y
            if (key === "x_delta") return _x_delta
            if (key === "y_delta") return _y_delta
            return btn_state[key] ?? 0
        },
        read_pressed:  (key) => btn_pressed[key]  ?? 0,
        read_released: (key) => btn_released[key] ?? 0,
        flush() {
            _x_delta = 0
            _y_delta = 0
            for (const k in btn_pressed)  btn_pressed[k]  = 0
            for (const k in btn_released) btn_released[k] = 0
        },
    }

    window.addEventListener("mousemove", e => {
        _x = e.clientX
        _y = e.clientY
        _x_delta += e.movementX
        _y_delta += e.movementY
    })

    window.addEventListener("mousedown", e => {
        const btn = `button${e.button}`
        if (btn_state[btn] !== 1) btn_pressed[btn] = 1
        btn_state[btn] = 1
    })

    window.addEventListener("mouseup", e => {
        const btn = `button${e.button}`
        btn_state[btn] = 0
        btn_released[btn] = 1
    })
}

export { mod }
