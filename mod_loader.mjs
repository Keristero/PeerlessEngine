// Mod loading: activation, browser-based file discovery, and full load pipeline.

export function setup_mod_loader_core(engine) {

    // Activate a single mod: resolve declared dependencies, call mod.activate(),
    // then register the mod in engine.mods.
    engine.activate_mod = async function(mod) {
        if (mod.name && mod.activate) {
            const deps = {}
            for (const dep_name of (mod.dependencies || [])) {
                if (!engine.mods[dep_name]) {
                    console.warn(`Mod "${mod.name}" depends on "${dep_name}" which is not loaded yet.`)
                } else {
                    deps[dep_name] = engine.mods[dep_name]
                }
            }
            await mod.activate(engine, engine.world, deps)
            engine.mods[mod.name] = mod
        } else {
            console.warn("Mod", mod, "is missing a name or activate function and will be skipped.")
        }
    }

    // Recursively scan a URL-addressable directory for files with a given extension.
    // Browser-only: uses fetch() to read directory listings as HTML anchor tags.
    engine.recursive_directory_scan = async function(folder_path, file_extension, allowed_depth) {
        console.log("Scanning folder", folder_path, "for files with extension", file_extension)
        const files = []
        const stack = [{ path: folder_path, depth: 0 }]
        const visited = []
        while (stack.length > 0) {
            const { path: current_path, depth: current_depth } = stack.pop()
            if (current_depth > allowed_depth || visited.includes(current_path)) continue
            const dir = await fetch(current_path).then(res => res.text())
            const dom = new DOMParser().parseFromString(dir, "text/html")
            const errors = dom.querySelectorAll("pre")
            if (errors.length > 0) {
                console.error("recursive_directory_scan failed", current_path, errors[0].textContent)
            }
            for (const link of dom.querySelectorAll("a")) {
                const href = link.getAttribute("href")
                if (href.endsWith(file_extension)) {
                    files.push(href)
                } else if (!href.includes(".")) {
                    stack.push({ path: href, depth: current_depth + 1 })
                }
            }
            visited.push(current_path)
        }
        return files
    }

    // Call load() on every activated mod (if defined), in activation order.
    // Must be called after all activate_mod() calls and sort_systems(), and
    // before the first game tick.  The pool mod uses this to pre-fill pools.
    engine.load_mods = async function() {
        for (const mod of Object.values(engine.mods)) {
            if (typeof mod.load === 'function') {
                await mod.load(engine, engine.world)
            }
        }
    }

    // Import every .mjs file found in folder_path, sort by dependency order,
    // activate each mod, sort all systems, then call load() on each mod.
    engine.find_and_load_mods = async function(folder_path) {
        const mod_paths = await engine.recursive_directory_scan(folder_path, ".mjs", 1)
        const unordered = []
        for (const mod_path of mod_paths) {
            console.log(`importing ${mod_path}`)
            const imported = await import(mod_path)
            if (imported.mod) unordered.push(imported.mod)
        }
        const sorted = engine.topological_sort(unordered)
        for (const mod of sorted) {
            await engine.activate_mod(mod)
        }
        engine.sort_systems()
        await engine.load_mods()
    }
}
