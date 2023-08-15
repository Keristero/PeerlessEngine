class Component{
    /**
     * 
     * @param {*} definition object with keys for each value you want to store in this component
     */
    constructor(definition){
        this.is_a_component = true
        this.definition = definition
        this.entity_count = 0
        this.first_value_name = null
        for(let value_name in definition){
            let collection_definition = definition[value_name]
            if(this.first_value_name === null){
                this.first_value_name = value_name
            }
            if(collection_definition.default === undefined){
                throw(`(${value_name}) has no default value provided in definition for (${this.constructor.name})`)
            }
            //create collections for each value
            this[value_name] = []
        }
        console.log(`registered new component ${this.constructor.name}`)
    }
    Get(entity_id){
        let gotten_values = {}
        for(let value_name in this.definition){
            gotten_values[value_name] = this[value_name][entity_id]
        }
        return gotten_values
    }
    Has(entity_id){
        return this[first_value_name][entity_id] !== undefined
    }
    Add(entity_id,initial_values){
        for(let value_name in initial_values){
            if(!this.definition[value_name]){
                throw(`initial value (${value_name}) is not in the component definition for (${this.constructor.name})`)
            }
        }
        for(let value_name in this.definition){
            let collection = this[value_name]
            let starting_value = initial_values[value_name] || this.definition[value_name].default
            collection[entity_id] = starting_value
        }
        this.entity_count++
    }
    Remove(entity_id){
        for(let value_name in this.definition){
            let collection = this[value_name]
            delete collection[entity_id]
        }
        this.entity_count--
    }
}

export default Component