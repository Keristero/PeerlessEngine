

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
    simulate_until(target_frame){
        console.warn(`simulating frames from ${this.simulation.present_frame} till ${target_frame}`)
        for(let i = this.simulation.present_frame+1; i <= target_frame; i++){
            this.set_present_frame(i)
            //TODO Here we need to force the game to update!
        }
    }
    set_present_frame(target_frame_number){
        console.log('setting frame to ',target_frame_number)
        let delta = target_frame_number-this.simulation.present_frame
        for(let i = 0; i < delta; i++){
            //remove old states when advancing forward
            let old_frame_number = this.simulation.present_frame+i-this.limits.past_frames
            console.log('removing old frame',old_frame_number)
            if(this.states[old_frame_number-1]){
                this.oldest_state = this.states[old_frame_number-1]
                delete this.states[old_frame_number-1]
            }
        }
        if(delta < 0){
            console.warn(`rolled back ${delta} frames`)
        }
        this.simulation.present_frame=target_frame_number
    }
    perform_rollback_check(frame_no,state){
        if(frame_no > this.simulation.present_frame){
            return false
        }
        let existing_state = this.states[frame_no]
        if(existing_state){
            //TODO maybe remove this check if it is too expensive
            let no_change_from_existing = JSON.stringify(existing_state) == JSON.stringify(state)
            if(no_change_from_existing){
                return false
            }else{
                throw `received two different states for the same frame ${frame_no} on ${this}`
            }
        }
        let predicted_state = this.read_predicted_state(frame_no)
        let no_change_from_predicted = JSON.stringify(predicted_state) == JSON.stringify(state)
        if(no_change_from_predicted){
            return false
        }
        return true
    }
    perform_rollback(rolback_frame){
        let pre_rollback_frame = this.simulation.present_frame
        this.set_present_frame(rolback_frame)
        this.simulate_until(pre_rollback_frame)
    }
    add_state(frame_no,state){
        //state should be an object containing the latest value of every possible input
        if(frame_no > this.simulation.present_frame+this.limits.future_frames){
            throw('rollback error, tried adding state too far in future')
        }
        if(frame_no < this.simulation.present_frame-this.limits.past_frames){
            throw('rollback error, tried adding state too far in past')
        }
        let existing_state = this.states[frame_no]
        if(existing_state){
            throw('cant add multiple states for the same frame!')
        }
        let rollback_required = this.perform_rollback_check(frame_no,state)
        this.states[frame_no] = state
        if(!this.oldest_state){
            this.oldest_state = state
        }
        if(rollback_required){
            this.perform_rollback(frame_no-1)
        }
        //todo, emit rollback event if state is older or equal to present frame
    }
    //todo set present frame (will replace advance)
    advance_present_frame(){
        this.simulation.present_frame++
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