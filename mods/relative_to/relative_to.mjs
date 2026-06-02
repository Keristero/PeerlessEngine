import relativeToSystem from "./systems/relative_to_system.mjs"

const mod = {
    name: "relative_to",
    dependencies: ["twodee"],
    components: {},
    relationships: {},
    systems: { relativeToSystem },
}

mod.activate = function(engine, world) {
    const { createRelation, makeExclusive, withStore } = engine.bitecs
    mod.relationships.PositionRelativeTo = createRelation(
        makeExclusive,
        withStore(() => ({ x: [], y: [] }))
    )
}

export { mod }
