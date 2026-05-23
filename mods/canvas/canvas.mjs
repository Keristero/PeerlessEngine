import { Canvas, DomReference } from "./components/canvas_components.mjs"

const mod = {
    name:"canvas",
    dependencies:[],
    components:{Canvas,DomReference},
    relationships:{}
}

mod.activate = async function(engine,world){
    if (typeof window === "undefined") throw new Error("canvas mod requires a browser environment (window is not defined)")
    let {observe,onAdd,onSet,onRemove,registerComponent, addComponent, createRelation, makeExclusive} = engine.bitecs
    //register components
    registerComponent(world,Canvas)
    registerComponent(world,DomReference)

    //create relationships
    mod.relationships.DrawnTo = createRelation(makeExclusive)

    observe(world,onAdd(Canvas),(eid,params)=>{
        console.log("Canvas componnt added to entity",eid)
        Canvas.width[eid] = 800
        Canvas.height[eid] = 600
        Canvas.page_x[eid] = 0
        Canvas.page_y[eid] = 0
        Canvas.z_index[eid] = 0

        let canvas = document.createElement("canvas")
        canvas.width = Canvas.width[eid]
        canvas.height = Canvas.height[eid]
        canvas.style.position = "absolute"
        canvas.style.left = Canvas.page_x[eid] + "px"
        canvas.style.top = Canvas.page_y[eid] + "px"
        canvas.style.zIndex = Canvas.z_index[eid]

        addComponent(world,eid,DomReference)
        DomReference.dom_id[eid] = canvas.id = "canvas_" + eid

        document.body.appendChild(canvas)
    })

    observe(world,onSet(Canvas),(eid,params)=>{
        //Update the component
        for(let key in params){
            if(Canvas[key][eid] !== undefined){
                Canvas[key][eid] = params[key]
            }
        }
        mod.update_canvas_dom(eid)
    })

    observe(world,onRemove(Canvas),(eid)=>{
        let canvas = document.getElementById(DomReference.dom_id[eid])
        if (canvas) {
            document.body.removeChild(canvas)
        }
    })
}

mod.update_canvas_dom = function(eid){
    let canvas = document.getElementById(DomReference.dom_id[eid])
    canvas.width = Canvas.width[eid]
    canvas.height = Canvas.height[eid]
    canvas.style.position = "absolute"
    canvas.style.left = Canvas.page_x[eid] + "px"
    canvas.style.top = Canvas.page_y[eid] + "px"
    canvas.style.zIndex = Canvas.z_index[eid]
}

export {mod}