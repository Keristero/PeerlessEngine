const system = {
    name: "physicsSystem",
    category: "physics",
    dependencies: ["relativeToSystem"],
    run: function (engine, world) {
        const { query, asBuffer, Not } = engine.bitecs
        const { Position2d, Velocity2d } = engine.mods.twodee.components
        const Destroyed = engine.mods.collision_response?.components?.Destroyed
        const not_destroyed = Destroyed ? [Not(Destroyed)] : []

        const twodee = engine.mods.twodee
        const physics = twodee.systems.physicsSystem
        physics.moved_eids.clear()

        const moving = query(world, [Position2d, Velocity2d, ...not_destroyed], asBuffer)
        for (let i = 0; i < moving.length; i++) {
            const eid = moving[i]
            const vx = Velocity2d.x[eid]
            const vy = Velocity2d.y[eid]
            if (vx === 0 && vy === 0) continue
            Position2d.x[eid] += vx
            Position2d.y[eid] += vy
            physics.moved_eids.add(eid)
            physics.move_dx[eid] = vx
            physics.move_dy[eid] = vy
        }
    }
}

export default system
