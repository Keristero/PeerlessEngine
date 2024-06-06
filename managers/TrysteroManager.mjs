import {joinRoom,getRelaySockets} from '../libraries/trystero-nostr.min.js'
import { EventManager } from '../main.mjs'
import { sleep } from '../utilities/async_helpers.mjs'
import { EVENTS } from '../engine_constants.mjs'

class NetworkManager{
    constructor(){
        this.rooms = {}
        this.send_state_actions = {}
    }
    get_peers(room_name){
        return this?.rooms[room_name]?.getPeers()
    }
    get_own_id(room_name){
        return this?.rooms[room_name]?.selfId
    }
    async reached_socket_state(desired_state){
        let sockets = getRelaySockets()
        let retries = 3
        let delay = 200
        let correct = false
        while(!correct && retries > 0){
            await sleep(delay)
            for(let i in sockets){
                let socket = sockets[i]
                if(socket.readyState != desired_state){
                    continue
                }
            }
            correct = true
        }
    }
    send_state_to_peer(room_name,peer_id,state){
        this.send_state_actions[room_name](state,peer_id)
    }
    send_state(room_name,state){
        this.send_state_actions[room_name](state)
    }
    async join_room(config,room_name){
        if(this.rooms[room_name]){
            throw(`already in room ${room_name}`)
        }
        console.log(`joining room ${room_name}`)
        const room = joinRoom(config, room_name)
        room.onPeerJoin((peer_id)=>{
            EventManager.fire({
                type:EVENTS.EID_NETWORK_PEER_JOINED,
                peer_id:peer_id,
                room_name:room_name,
            })
        })
        room.onPeerLeave((peer_id)=>{
            EventManager.fire({
                type:EVENTS.EID_NETWORK_PEER_LEFT,
                peer_id:peer_id,
                room_name:room_name,
            })
        })
        const [send_local_state, on_remote_state] = room.makeAction('local_state')
        on_remote_state((state,peer_id)=>{
            EventManager.fire({
                type:EVENTS.EID_NETWORK_REMOTE_STATE,
                peer_id:peer_id,
                room_name:room_name,
                state:state
            })
        })
        await this.reached_socket_state(1)
        console.log(`joined room ${room_name}`)
        this.rooms[room_name] = room
        this.send_state_actions[room_name] = send_local_state
    }
    leave_room(room_name){
        console.log(`leaving room ${room_name}`)
        if(!this.rooms[room_name]){
            throw(`not in room ${room_name}`)
        }
        delete this.rooms[room_name]
        delete this.send_state_actions[room_name]
    }
}

export default new NetworkManager()