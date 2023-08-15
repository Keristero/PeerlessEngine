

class Kerengine{
    constructor(){
        this.next_id = 0
    }
    get_next_id(){
        return this.next_id++
    }
    /**
     * this function gives you an array of entities that have all of the listed components
     * @param {Array} components array of components
     */
    get_entities(components){
        //sort the components by least to most entities
        components.sort((a,b)=>{return a.entity_count - b.entity_count})
        let entities = []
        //start with the component with the least as our main collection
        let first_component = components[0]
        //check if the entities exist in all the other components, skip early if they dont
        for(let entity_id in first_component[first_component.first_value_name]){
            for(let i = 1; i < components.length; i++){
                let component = components[i]
                if(component[component.first_value_name][entity_id] === undefined){
                    continue
                }
            }
            //add the entities that exist in all components to our return array
            entities.push(entity_id)
        }
        return entities
    }
}


export default new Kerengine()