import { Node } from '../components/components.mjs'
import { hasComponent } from '../kerenginebitecs.mjs'

export function add_parent(world,eid,parent_eid){
    Node.parent_eid[eid] = parent_eid
    Node.depth[eid] = hasComponent(world,Node,parent_eid) ? Node.depth[parent_eid]+1 : 0
    Node.use_parent_position[eid] = 1
}