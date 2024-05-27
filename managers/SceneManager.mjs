import {defineSerializer,defineDeserializer,DESERIALIZE_MODE} from '../kerenginebitecs.mjs'
import EventManager from './EventManager.mjs'
import InputManager from './InputManager.mjs'
import { EVENTS } from '../engine_constants.mjs'
import RollbackQueue from './RollbackQueue.mjs'

class SceneManager{
    constructor(starting_scene){
        this.current = starting_scene
        this.scenes = {}
        let rollback_handler = EventManager.on((event) => {
            if (event.type == EVENTS.EID_ROLLBACK) {
                this.rollback(event.target_frame)
            }
        })
        let forced_update_handler = EventManager.on((event) => {
            if (event.type == EVENTS.EID_FORCE_UPDATE) {
                console.log('doing forced update!!!',this.current.scene.world.frame)
                this.update(true)
            }
        })
        let delete_snapshot_handler = EventManager.on((event)=>{
            if(event.type == EVENTS.EID_DELETE_SNAPSHOT){
                //console.log('deleting old snapshot',event.target_frame)
                delete this.current.snapshots[event.target_frame]
            }
        })
    }
    add(scene_id,scene){
        scene.init()
        this.scenes[scene_id] = {
            scene:scene,
            serialize:defineSerializer(scene.world),
            deserialize:defineDeserializer(scene.world),
            snapshots:{}
        }
    }
    set_scene(scene_id){
        RollbackQueue.reset_everything()
        if(this.current){
            this.current.scene.scene_deactivated()
        }
        if(this.scenes[scene_id]){
            this.scenes[scene_id].scene.scene_activated()
        }
        this.current = this.scenes[scene_id]
    }
    rollback(target_frame){
        console.warn('scene manager trying rollback to ',target_frame)
        let packet = this.current.snapshots[target_frame]
        //console.log(packet)
        if(packet){
            this.current.deserialize(this.current.scene.world,packet)
        }
    }
    snapshot_world(){
        let packet = this.current.serialize(this.current.scene.world)
        let frame_no = this.current.scene.world.frame
        this.current.snapshots[frame_no] = packet
        //console.log('snapshots',Object.keys(this.current.snapshots).length)
    }
    render(){
        return this.current.scene.render()
    }
    test_rollback(target_frame){
        if(this.current.snapshots[target_frame]){
            console.log(this.current.snapshots[target_frame])
            RollbackQueue.perform_rollback(target_frame)
        }
    }
    update(is_resimulation=false){
        if(!is_resimulation){
            let inputs = InputManager.late_poll_state()
            RollbackQueue.add_state(this.current.scene.world.frame+1,inputs)
        }
        this.current.scene.update()
        this.snapshot_world()
        RollbackQueue.set_present_frame(this.current.scene.world.frame)
    }
}

export default new SceneManager()