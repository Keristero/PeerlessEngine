class RollbackQueue{
    constructor(){
        this.reset_everything()
    }
    reset_everything(){
        this.states = {}
        this.oldest_state;
        this.limits = {
            past_frames:60,
            future_frames:60,
        }
        this.simulation = {
            present_frame: 0
        }
    }
    add_state(frame_no,state){
        //state should be an object containing the latest value of every possible input
        if(frame_no > this.simulation.present_frame+this.limits.future_frames){
            throw('rollback error, tried adding state too far in future')
        }
        if(frame_no < this.simulation.present_frame-this.limits.past_frames){
            throw('rollback error, tried adding state too far in past')
        }
        this.states[frame_no] = state
        if(!this.oldest_state){
            this.oldest_state = state
        }
    }
    advance_present_frame(){
        this.simulation.present_frame++
        let oldest_allowed_frame = this.simulation.present_frame-this.limits.past_frames
        if(this.states[oldest_allowed_frame-1]){
            this.oldest_state = this.states[oldest_allowed_frame-1]
            delete this.states[oldest_allowed_frame-1]
        }
    }
    read_present_predicted_state(){
        return this.read_predicted_state(this.simulation.present_frame)
    }
    read_predicted_state(frame_no){
        for(let i = frame_no; i > frame_no-this.limits.past_frames; i--){
            if(this.states[i]){
                return this.states[i]
            }
        }
        return this.oldest_state
    }
}

export default new RollbackQueue()