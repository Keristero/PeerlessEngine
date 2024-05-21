class ReferenceTypeManager{
    constructor(){
        this.references = new Map()
        this.last_ctid = 0;
    }
    get(ctid){
        return this.references.get(ctid)
    }
    add(complex_type){
        let ctid = this.last_ctid++
        this.references.set(ctid,complex_type)
        return ctid
    }
}

export default new ReferenceTypeManager()