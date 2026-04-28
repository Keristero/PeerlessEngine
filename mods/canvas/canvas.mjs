import { Canvas } from "./components/canvas_components.mjs"

const mod = {
    name:"canvas",
    components:{Canvas}
}

mod.activate = async function(engine,world){
    let {observe,onAdd,onRemove,registerComponent} = engine.bitecs

    console.log("Activating canvas mod")
    registerComponent(world,Canvas)

    observe(world,onAdd(Canvas),(eid)=>{
        console.log("Creating canvas for entity",eid)
        let canvas = document.createElement("canvas")
        canvas.width = Canvas.width[eid]
        canvas.height = Canvas.height[eid]
        canvas.style.position = "absolute"
        canvas.style.left = Canvas.page_x[eid] + "px"
        canvas.style.top = Canvas.page_y[eid] + "px"
        canvas.style.zIndex = Canvas.z_index[eid]

        //store reference to the canvas element
        Canvas.dom_id[eid] = canvas.id = "canvas_" + eid

        document.body.appendChild(canvas)
    })

    observe(world,onRemove(Canvas),(eid)=>{
        let canvas = document.getElementById(Canvas.dom_id[eid])
        if (canvas) {
            document.body.removeChild(canvas)
        }
    })
}

export default mod