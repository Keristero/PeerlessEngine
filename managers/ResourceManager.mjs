import ParseONBAnimation from "../libraries/ONBAnimationParse.mjs";

/*
    TODO: the resource manager should return deterministic GIDs for each loaded resource, currently the id is psudo random subject to load order
*/
class ResourceManager{
    constructor(){
        this.resources = {}
        this.resource_list = []
        this.loaded = 0
        this.loading = 0
    }
    async all_loaded(){
        while(this.loading > 0){
            await(sleep(10))
            console.log(`loading ${this.loading} resources (loaded: ${this.loaded})`)
        }
        console.log('all loaded')
    }
    sleep(sleep_ms){
        return new Promise((resolve,reject)=>{
            setTimeout(resolve,sleep_ms)
        })
    }
    parse_path(path) {
        // Regex to match the path components
        const regex = /^(.*\/)?([^/]*?)(\.[^.]*?)?$/;
        const result = path.match(regex);
    
        // Extract the folder, file_name, and file_extension
        const folder = result[1] || ""; // Folder path, including trailing slash
        const file_name = result[2] || ""; // File name without extension
        const file_extension = result[3] ? result[3].slice(1) : ""; // File extension without leading dot
    
        return {
            folder:folder,
            file_name,
            file_extension,
        };
    }
    load_image(src) {
        return new Promise((resolve, reject) => {
           const img = new Image();
           img.onload = () => resolve(img);
           img.onerror = reject;
           img.src = src;
        });
    }
    get(resource_index){
        return this.resource_list[resource_index]
    }
    async load(path){
        this.loading++
        let {folder,file_name,file_extension} = this.parse_path(path)
        let file_name_upper = file_name.toUpperCase()
        let file_extension_upper = file_extension.toUpperCase()
        let loaded_resource
        let resource_index
        if(file_extension_upper == "PNG"){
            loaded_resource = await this.load_image(path)
        }
        if(file_extension_upper == "ANIMATION"){
            let text = await(await fetch(path)).text()
            loaded_resource = ParseONBAnimation(text)
        }

        //save 
        if(!this.resources[file_extension_upper]){
            this.resources[file_extension_upper] = {}
        }
        if(!this.resources[file_extension_upper][file_name_upper]){
            resource_index = this.resource_list.push(loaded_resource)-1
            this.resources[file_extension_upper][file_name_upper] = resource_index
            this.loaded++
        }else{
            resource_index = this.resources[file_extension_upper][file_name_upper]
            console.warn(`resource ${file_name_upper} is already loaded, skipped`)
        }
        this.loading--
        return resource_index
    }
}

export default new ResourceManager()