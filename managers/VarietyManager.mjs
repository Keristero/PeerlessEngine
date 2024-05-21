class VarietyManager{
    constructor(){
        this.varieties = new Map()
        this.last_vid = 0;
    }
    get(vid){
        return this.varieties.get(vid)
    }
    add(variety){
        let vid = this.last_vid++
        this.varieties.set(vid,variety)
        return vid
    }
}

export default new VarietyManager()