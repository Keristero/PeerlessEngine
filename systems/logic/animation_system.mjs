import {
    defineQuery,
} from '../../kerenginebitecs.mjs'
import { Animation, Animated } from '../../components/components.mjs';
import ResourceManager from '../../managers/ResourceManager.mjs';

const query = defineQuery([Animation, Animated])

const system = world => {
    //update animated animations
    const ents = query(world)
    for (let i = 0; i < ents.length; i++) {
        const eid = ents[i]
        const animation = ResourceManager.get(Animation.rid[eid])
        let state_data = animation.animation_states[Animation.state[eid]]
        let frame_data = state_data.frames[Animation.frame[eid]]
        if(!Animated.is_paused[eid]){
            Animated.frame_elapsed[eid] += 16.66*Animated.speed[eid]//TODO dont hardcode the MS
            while(Animated.frame_elapsed[eid] >= frame_data.duration){
                let is_last_frame = state_data.frames.length-1 == Animation.frame[eid]
                if(is_last_frame){
                    if(Animated.is_looping[eid]){
                        Animation.frame[eid] = 0
                    }
                    Animated.frame_elapsed[eid] = 0
                }else{
                    //advance frame
                    Animation.frame[eid] ++
                    Animated.frame_elapsed[eid] -= frame_data.duration
                }
            }
        }
    }
    return world
}

export default system