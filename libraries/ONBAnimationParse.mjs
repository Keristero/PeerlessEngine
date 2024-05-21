function ParseONBAnimation(animation_txt){
    let lines = animation_txt.split(`\n`)
    let project = {
        next_input_sheet_id:0,
        next_animation_state_id:0,
        animation_states:{},
        custom_points:{},
    }

    //arrgh, brain hurt oof
    let regx_imagepath = /imagePath="(?<image_path>.*)"/i
    let regx_state = /animation state="(?<state>.*)"/i
    let regx_frame = /frame duration="(?<duration>.*)" x="(?<x>.*)" y="(?<y>.*)" w="(?<w>.*)" h="(?<h>.*)" originx="(?<anchorx>.*)" originy="(?<anchory>\d*)"(( flipx="(?<flipx>\d*)")( flipy="(?<flipy>.*)")?)?/i
    let regx_point = /point label="(?<label>.*)" x="(?<x>.*)" y="(?<y>.*)"/i

    let linetypes = [{label:"frame",regex:regx_frame},{label:"point",regex:regx_point},{label:"state",regex:regx_state},{label:"image_path",regex:regx_imagepath}]
    let current_animation_state = null
    for(let line of lines){
        let result = ParseLine(line,linetypes)
        if(result?.label === "state"){
            new_animation_state(project,result.data)
            current_animation_state = project.animation_states[project.next_animation_state_id-1]
        }
        if(result?.label === "frame"){
            new_frame(current_animation_state,result.data)
            var current_frame = current_animation_state.frames[current_animation_state.frames.length-1]
        }
        if(result?.label === "point"){
            new_point(current_frame,result.data)
        }
        if(result?.label === "image_path"){
            project.name == result.data.image_path
        }
        
    }
    return project
}
function new_point(frame,{label,x,y}){
    frame.custom_points[label] = {x:frame.source_bounds.minX+parseInt(x),y:frame.source_bounds.minY+parseInt(y)}
}

function new_frame(animation_state,{duration,x,y,w,h,anchorx,anchory,flipx,flipy}){
    let global_x = parseInt(x)
    let global_y = parseInt(y)
    let width = parseInt(w)
    let height = parseInt(h)
    let anchor_x = parseInt(anchorx)
    let anchor_y = parseInt(anchory)
    animation_state.frames.push({
        sheet_id: 0,
        width:width,
        height:height,
        source_bounds: {
            "minX": global_x,
            "minY": global_y,
            "maxX": global_x+width,
            "maxY": global_y+height
        },
        anchor_pos: {
            "x": global_x+anchor_x,
            "y": global_y+anchor_y
        },
        "duration": parseFloat(duration)*1000,
        "flip_x": flipx? true : false,
        "flip_y": flipy? true : false,
        "custom_points":{}
    })
}

function new_animation_state(project,{state}){
    let new_id = project.next_animation_state_id++
    let animation_state = {
        id:new_id,
        state_name:state,
        frames:[],
    }
    project.animation_states[new_id] = animation_state
}
function ParseLine(line, linetypes){
    for(let type of linetypes){
        let result = ParseLineData(line,type.regex,type.label)
        if(result){
            return result
        }
    }
}
function ParseLineData(line,regex,type_label){
    let match = regex.exec(line)
    if(match){
        return {label:type_label,data:match.groups}
    }
    return null
}

export default ParseONBAnimation