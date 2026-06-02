const system = {
    name: "keyboardRawInputSystem",
    category: "input",
    dependencies: [],
    run: function(engine, world) {
        const device = engine.mods.keyboard?.device
        if (!device) return
        const events = engine.mods.events
        device.each_pressed(code  => events.fire("key_down", { code }))
        device.each_released(code => events.fire("key_up",   { code }))
    }
}

export default system
