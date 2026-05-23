// Topological sort (Kahn's algorithm)
// Items with no local dependencies come first.
// Items involved in a cycle or with missing deps are appended with a warning.

export function setup_topological_sort(engine) {
    engine.topological_sort = function(mods) {
        const by_name = {}
        for (const mod of mods) by_name[mod.name] = mod

        const in_degree = {}
        for (const mod of mods) {
            in_degree[mod.name] = (mod.dependencies || []).filter(d => d in by_name).length
        }

        const dependents = {}
        for (const mod of mods) dependents[mod.name] = []
        for (const mod of mods) {
            for (const dep of (mod.dependencies || [])) {
                if (dep in dependents) dependents[dep].push(mod.name)
            }
        }

        const queue = mods.filter(m => in_degree[m.name] === 0).map(m => m.name)
        const result = []
        while (queue.length > 0) {
            const name = queue.shift()
            result.push(by_name[name])
            for (const dependent_name of dependents[name]) {
                if (--in_degree[dependent_name] === 0) queue.push(dependent_name)
            }
        }

        if (result.length !== mods.length) {
            const unresolved = mods.filter(m => !result.includes(m))
            console.warn("Circular or missing dependency detected among mods:", unresolved.map(m => m.name))
            result.push(...unresolved)
        }

        return result
    }
}
