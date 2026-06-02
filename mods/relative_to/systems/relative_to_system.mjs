// Runs in the physics category before physicsSystem.
// For every entity with PositionRelativeTo(parent),
// sets Position2d to parent.Position2d + PositionRelativeTo store offsets.
// Entities are sorted by chain depth so parents are always resolved before children.

const system = {
    name: "relativeToSystem",
    category: "physics",
    dependencies: [],
    run: function(engine, world) {
        const { query, Wildcard, getRelationTargets } = engine.bitecs
        const { Position2d } = engine.mods.twodee.components
        const { PositionRelativeTo } = engine.mods.relative_to.relationships

        const entities = query(world, [PositionRelativeTo(Wildcard), Position2d])

        function get_depth(eid) {
            let depth = 0
            let current = eid
            while (depth < 64) {
                const targets = getRelationTargets(world, current, PositionRelativeTo)
                if (!targets || targets.length === 0) break
                depth++
                current = targets[0]
            }
            return depth
        }

        const sorted = [...entities].sort((a, b) => get_depth(a) - get_depth(b))

        for (const eid of sorted) {
            const [parent] = getRelationTargets(world, eid, PositionRelativeTo)
            if (parent === undefined) continue
            Position2d.x[eid] = Position2d.x[parent] + PositionRelativeTo(parent).x[eid]
            Position2d.y[eid] = Position2d.y[parent] + PositionRelativeTo(parent).y[eid]
        }
    }
}

export default system
