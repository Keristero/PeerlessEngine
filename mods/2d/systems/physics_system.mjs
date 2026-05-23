const system = {
    name: "physicsSystem",
    category: "physics",
    dependencies: [],
    writes: ["Position2d", "Velocity2d", "Moved"],
    run: function (engine, world) {
        const { query, addComponent, removeComponent } = engine.bitecs
        const { Position2d, Velocity2d, Moved } = engine.mods.twodee.components
        // Clear last tick's Moved tags before updating positions
        for (const eid of query(world, [Moved])) {
            removeComponent(world, eid, Moved)
        }
        for (const eid of query(world, [Position2d, Velocity2d])) {
            if (Velocity2d.x[eid] === 0 && Velocity2d.y[eid] === 0) continue
            const vx = Velocity2d.x[eid]
            const vy = Velocity2d.y[eid]
            Position2d.x[eid] += vx
            Position2d.y[eid] += vy
            addComponent(world, eid, Moved)
            Moved.dx[eid] = vx
            Moved.dy[eid] = vy
        }
    }
}

export default system
