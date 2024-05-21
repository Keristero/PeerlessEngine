import CanvasManager from '../../managers/CanvasManager.mjs'
import PerformanceManager from '../../managers/PerformanceManager.mjs'
const fps_ctx = create_graph_ctx(50,0,300,100)
const ups_ctx = create_graph_ctx(350,0,300,100)

let update_deltas = []
let frame_deltas = []

let debug_tic = 0
let wrapped_debug_tic = 0
let average_limit = 100
let history_limit = 1000

function update(array,time_obj,x,y,label,color){
    let canvas = CanvasManager.get_by_alias('game')
    let ctx = canvas.getContext('2d')
    //console.log(time_obj)
    array.push(time_obj.delta)
    const sum = array.reduce((acc, num) => acc + num, 0);
    const average = sum / array.length;
    const average_per_second = Math.round(1000/average)

    if(array.length == average_limit){
        array.shift()
    }

    ctx.font = "20px arial";
    ctx.fillStyle = color
    ctx.fillText(`${label}:${average_per_second}`,x,y)
}

function create_graph_ctx(x,y,width,height){
    const canvas = CanvasManager.create_canvas(width,height)
    document.body.appendChild(canvas)
    canvas.style.position = 'absolute'
    canvas.style.top=y
    canvas.style.left=x
    canvas.style.zIndex = 10
    const ctx = canvas.getContext('2d')
    return ctx
}

function draw_graph(ctx,array,width,height,color){
    if(wrapped_debug_tic == 0){
        ctx.clearRect(0,0,width,height)
    }
    let min = Math.min(...array)
    let max = Math.max(...array)
    let x_dist = width/history_limit
    let y_dist = height/max
    ctx.fillStyle = color

    var x_offset = wrapped_debug_tic*x_dist
    var y_offset = height-(array[array.length-1]*y_dist)
    ctx.fillRect(x_offset,y_offset,2,2)
}

const system = world => {
    let text_x = 5
    let ups_color = 'rgba(255,255,0,0.5)'
    let fps_color = 'rgba(255,200,0,0.5)'
    let graph_width = 300
    debug_tic++
    wrapped_debug_tic = debug_tic%history_limit
    update(update_deltas,PerformanceManager.game_time,text_x,25,'UPS',ups_color)
    update(frame_deltas,PerformanceManager.render_time,text_x,50,'FPS',fps_color)
    draw_graph(ups_ctx,update_deltas,graph_width,100,ups_color)
    draw_graph(fps_ctx,frame_deltas,graph_width,100,fps_color)
    //standard draw
    return world
}

export default system