class RollbackQueue{
    constructor(){
        this.frame_limits = {past:60}
        this.reset()
    }
    reset(){
        //clear everything
        this.present_frame = 0
        this.present_predictions = {}
        this.oldest_predictions = {}
        this.queue = {}
    }
    rollback(target_frame){

    }
    prune_queue(){
        //remove frames beyond the past frame limit
        for(let frame in this.queue){
            if(frame < this.present_frame-this.frame_limits.past){
                delete this.queue[frame]
            }
        }
    }
    advance_one_frame(){
        this.present_frame++
        this.present_predictions = this.predict_inputs(this.present_frame-1,this.present_frame,this.present_predictions)
    }
    add_inputs(frame,player_id,inputs){
        if(!this.queue[frame]){
            this.queue[frame] = {}
        }
        if(!this.queue[frame][player_id]){
            this.queue[frame][player_id] = {}
        }
        for(let input_key in inputs){
            let input_value = inputs[input_key]
            this.queue[frame][player_id][input_key] = input_value
        }
    }
    predict_inputs(start_frame,end_frame,previous_predictions = {}){
        for(let i = start_frame; i <= end_frame; i++){
            if(this.queue[i]){
                for(let player_id in this.queue[i]){
                    if(!previous_predictions[player_id]){
                        previous_predictions[player_id] = {}
                    }
                    for(let input_key in this.queue[i][player_id]){
                        let input_value = this.queue[i][player_id][input_key]
                        //add last known input values for every input
                        previous_predictions[player_id][input_key] = input_value
                    }
                }
            }
        }
        return previous_predictions
    }
    read_present_predictions(){
        return this.present_predictions
    }
    read_raw_inputs(frame,player_id){
        return this.queue[frame][player_id]
    }
}

export default new RollbackQueue()