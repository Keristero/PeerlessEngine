class Listener{
    constructor(){
        this.children=[]
        this.callback;
    }
    on(callback){
        //add a callback which can handle the event, returns a child listener
        let child_listener = new Listener()
        child_listener.callback = callback
        this.children.push(child_listener)
        return child_listener
    }
    fire(event_data){
        for(let listener of this.children){
            if(!listener.callback || listener.callback(event_data)){
                //if listner has no callback, or the callback returns truthy, fire all its children too
                listener.fire(event_data)
            }
        }
    }
}

const event_manager = new Listener()
export default event_manager