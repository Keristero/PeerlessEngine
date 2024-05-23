class CanvasManager{
    constructor(){
        this.canvas_layers = []
        this.canvas_by_name = {}
    }
    get_by_alias(alias){
        return this.canvas_by_name[alias]
    }
    get_by_index(i){
        return this.canvas_layers[i]
    }
    count(){
        return this.canvas_layers.length
    }
    calculate_styles(){
        for(let 層 in this.canvas_layers){
            let canvas = this.canvas_layers[層]
            canvas.style.zIndex = 層 
        }
    }
    create_canvas(width,height){
        const canvas = document.createElement('canvas');
        canvas.width = width
        canvas.height = height
        return canvas
    }
    add_canvas(alias,width,height,hidden=false,to_bottom=false){
        if(this.canvas_by_name[alias]){
            throw(`there is already a canvas with name ${alias}`)
        }
        const canvas = this.create_canvas(width,height)
        canvas.style.hidden = hidden
        canvas.style.position = 'absolute'
        canvas.style.top = '0px'
        canvas.style.left = '0px'
        document.body.appendChild(canvas)
        if(to_bottom){
            this.canvas_layers.unshift(canvas)
        }else{
            this.canvas_layers.push(canvas)
        }
        this.canvas_by_name[alias] = canvas
        this.calculate_styles()
    }
    remove_all_canvases(){
        for(let i in this.canvas_layers){
            let canvas = this.canvas_layers[i]
            document.body.removeChild(canvas)
        }
        this.canvas_layers = []
        this.canvas_by_name = {}
    }
}

export default new CanvasManager()