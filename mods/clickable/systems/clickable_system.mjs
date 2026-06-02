const system = {
    name: "clickableSystem",
    category: "input",
    dependencies: ["mouseRawInputSystem"],
    run: function(engine, world) {
        const { query } = engine.bitecs
        const { Position2d, Rectangle } = engine.mods.twodee.components
        const { Clickable } = engine.mods.clickable.components

        for (const event of engine.mods.events.get("mouse_button_up")) {
            if (event.button !== "button0") continue
            const { x: mx, y: my } = event
            for (const eid of query(world, [Clickable, Position2d, Rectangle])) {
                const x = Position2d.x[eid]
                const y = Position2d.y[eid]
                const w = Rectangle.width[eid]
                const h = Rectangle.height[eid]
                if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
                    engine.mods.events.fire("entity_clicked", { eid })
                }
            }
        }
    }
}

export default system
