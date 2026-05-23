const mod = {
    name: "keyboard",
    dependencies: [],
    device: {},
}

mod.activate = function (engine, world) {
    if (typeof window === "undefined") throw new Error("keyboard mod requires a browser environment (window is not defined)")

    const key_state = {}    // code → 0|1 current held state
    const key_pressed = {}  // set on initial keydown (not repeat); cleared by flush()
    const key_released = {} // set on keyup; cleared by flush()

    mod.device = {
        read:          (key) => key_state[key]  ?? 0,
        read_pressed:  (key) => key_pressed[key]  ?? 0,
        read_released: (key) => key_released[key] ?? 0,
        flush() {
            for (const k in key_pressed)  key_pressed[k]  = 0
            for (const k in key_released) key_released[k] = 0
        },
    }

    const prevent_keys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"])
    window.addEventListener("keydown", e => {
        if (key_state[e.code] !== 1) key_pressed[e.code] = 1  // ignore auto-repeat
        key_state[e.code] = 1
        if (prevent_keys.has(e.code)) e.preventDefault()
    })
    window.addEventListener("keyup", e => {
        key_state[e.code] = 0
        key_released[e.code] = 1
    })
}

export { mod }
