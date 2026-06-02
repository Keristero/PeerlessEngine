const system = {
    name: "mouseRawInputSystem",
    category: "input",
    dependencies: [],
    run: function(engine, world) {
        const device = engine.mods.mouse?.device
        if (!device) return
        const events = engine.mods.events
        const x = device.read("x")
        const y = device.read("y")
        device.each_pressed(btn  => events.fire("mouse_button_down", { button: btn, x, y }))
        device.each_released(btn => events.fire("mouse_button_up",   { button: btn, x, y }))
    }
}

export default system
