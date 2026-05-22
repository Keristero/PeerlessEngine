export function setup_mod_loader(engine){

    // Get complete list of files with a certain extension in a folder and its subfolders
    engine.recursive_directory_scan = async function (folder_path,file_extension,allowed_depth){
        console.log("Scanning folder",folder_path,"for files with extension",file_extension)
        let files = []
        let stack = [{path:folder_path,depth:0}]
        let visited = []
        while(stack.length > 0){
            let current = stack.pop()
            let current_path = current.path
            let current_depth = current.depth
            if(current_depth > allowed_depth){
                continue
            }
            if(visited.includes(current_path)){
                continue
            }
            let dir = await fetch(current_path).then(res => res.text())
            let dom = new DOMParser().parseFromString(dir, "text/html")
            let errors = dom.querySelectorAll("pre")
            if(errors.length > 0){
                console.error("recursive_directory_scan failed",current_path,errors[0].textContent)
            }
            let links = dom.querySelectorAll("a")
            for(let link of links){
                let href = link.getAttribute("href")
                if(href.endsWith(file_extension)){
                    files.push(href)
                }else{
                    //if there is no file extension, assume it's a folder and add it to the stack
                    if(!href.includes(".")){
                        stack.push({path: href, depth: current_depth + 1})
                    }
                }
            }
            visited.push(current_path)
        }
        return files
    }

    //load all mods from a folder path
    engine.find_and_load_mods = async function(folder_path){
        let mod_paths = await engine.recursive_directory_scan(folder_path, ".mjs",1)

        // First pass: import all mods to read their metadata
        const unordered = []
        for(let mod_path of mod_paths){
            console.log(`importing ${mod_path}`)
            let imported = await import(mod_path)
            if(imported.mod){
                unordered.push(imported.mod)
            }
        }

        // Sort by dependencies before activating
        const sorted = engine.topological_sort(unordered)
        for(const mod of sorted){
            await engine.activate_mod(mod)
        }

        // Re-sort all systems across all loaded mods
        engine.sort_systems()
    }

    // Collect all systems from every loaded mod, validate categories, and sort each category
    engine.sort_systems = function(){
        const all_systems = []
        for(const mod_name in engine.mods){
            const mod = engine.mods[mod_name]
            for(const system_key in (mod.systems || {})){
                all_systems.push(mod.systems[system_key])
            }
        }

        // Build name -> system map for validation
        const by_name = {}
        for(const system of all_systems) by_name[system.name] = system

        // Validate: every system must have a category, and no cross-category dependencies
        for(const system of all_systems){
            if(!system.category){
                throw new Error(`System "${system.name}" is missing a required "category" field.`)
            }
            for(const dep_name of (system.dependencies || [])){
                const dep = by_name[dep_name]
                if(dep && dep.category !== system.category){
                    throw new Error(
                        `System "${system.name}" (category: "${system.category}") cannot depend on "${dep_name}" (category: "${dep.category}"). Cross-category dependencies are not allowed — systems in different categories run on independent schedules.`
                    )
                }
            }
        }

        // Group by category, then topologically sort each group independently
        const by_category = {}
        for(const system of all_systems){
            if(!by_category[system.category]) by_category[system.category] = []
            by_category[system.category].push(system)
        }

        engine.sorted_systems = {}
        for(const category in by_category){
            engine.sorted_systems[category] = engine.topological_sort(by_category[category])
        }
    }

    engine.update_systems = function(category){
        const systems = engine.sorted_systems[category] || []
        for(const system of systems){
            system.run(engine, engine.world)
        }
    }

    // Topological sort (Kahn's algorithm) — mods with no deps load first
    engine.topological_sort = function(mods){
        const by_name = {}
        for(const mod of mods) by_name[mod.name] = mod

        // Count unresolved local dependencies per mod
        const in_degree = {}
        for(const mod of mods){
            in_degree[mod.name] = (mod.dependencies || []).filter(d => d in by_name).length
        }

        // Build map: dependency -> mods that depend on it
        const dependents = {}
        for(const mod of mods) dependents[mod.name] = []
        for(const mod of mods){
            for(const dep of (mod.dependencies || [])){
                if(dep in dependents) dependents[dep].push(mod.name)
            }
        }

        const queue = mods.filter(m => in_degree[m.name] === 0).map(m => m.name)
        const result = []
        while(queue.length > 0){
            const name = queue.shift()
            result.push(by_name[name])
            for(const dependent_name of dependents[name]){
                if(--in_degree[dependent_name] === 0) queue.push(dependent_name)
            }
        }

        if(result.length !== mods.length){
            const unresolved = mods.filter(m => !result.includes(m))
            console.warn("Circular or missing dependency detected among mods:", unresolved.map(m => m.name))
            result.push(...unresolved)
        }

        return result
    }

    engine.activate_mod = async function(mod){
        if(mod.name && mod.activate){
            console.log("activating mod",mod.name)
            const deps = {}
            for(const dep_name of (mod.dependencies || [])){
                if(!engine.mods[dep_name]){
                    console.warn(`Mod "${mod.name}" depends on "${dep_name}" which is not loaded yet.`)
                } else {
                    deps[dep_name] = engine.mods[dep_name]
                }
            }
            await mod.activate(engine, engine.world, deps)
            engine.mods[mod.name] = mod
            console.log("Activated mod",mod.name)
        }else{
            console.warn("Mod",mod,"is missing a name or activate function and will be skipped.")
        }
    }
}
