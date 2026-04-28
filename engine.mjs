import * as bitecs from './node_modules/bitecs/dist/core/index.mjs'

const {addComponent,addEntity} = bitecs

const engine = {
    bitecs:bitecs,
    world:bitecs.createWorld(),
    mods:{}
}

// Get complete list of files with a certain extension in a folder and its subfolders
engine.recursive_directory_scan = async function (folder_path,file_extension,allowed_depth){
    let files = []
    let stack = [{path:folder_path,depth:0}]
    let visited = []
    while(stack.length > 0){
        let current = stack.pop()
        let current_path = current.path
        let current_depth = current.depth
        console.log("current path",current_path,"visted:",visited)
        if(current_depth > allowed_depth){
            continue
        }
        if(visited.includes(current_path)){
            continue
        }
        let dir = await fetch(current_path).then(res => res.text())
        let dom = new DOMParser().parseFromString(dir, "text/html")
        let links = dom.querySelectorAll("a")
        for(let link of links){
            let href = link.getAttribute("href")
            console.log(href)
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
    console.log(files)
    return files
}

//load all mods from a folder path
engine.find_and_load_mods = async function(folder_path){
    let mods = await engine.recursive_directory_scan(folder_path, ".mjs",1)
    console.log('mods',mods)
    for(let mod_path of mods){
        let mod = await import(mod_path)
        await engine.activate_mod(mod)
    }
}

engine.activate_mod = async function(mod){
    if(mod.default && mod.default.name && mod.default.activate){
        await mod.default.activate(engine, engine.world)
        engine.mods[mod.default.name] = mod.default
        console.log("Activated mod",mod.default.name)
    }else{
        console.warn("Mod",mod,"is missing a name or activate function and will be skipped.")
    }
}

await engine.find_and_load_mods("./mods/")

const e1 = addEntity(engine.world)
addComponent(engine.world, e1, engine.mods.canvas.components.Canvas)


export default engine