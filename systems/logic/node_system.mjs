import {
    defineQuery,
    hasComponent
} from '../../kerenginebitecs.mjs'
import { Node, RelativePosition,Position} from '../../components/components.mjs';

const nodeTreeQuery = defineQuery([Node])

function sort_by_depth(eid_a,eid_b){
    return Node.depth[eid_a]-Node.depth[eid_b]
}

const system = world => {
    const ents = nodeTreeQuery(world)
    ents.sort(sort_by_depth)
    for(let eid of ents){
        let parent_eid = Node.parent_eid[eid]
        //Update positions
        //The position of the child entity is overwritten with the parents position + relative position
        if(Node.use_parent_position[eid]){
            Position.x[eid] = Position.x[parent_eid] + RelativePosition.x[eid]
            Position.y[eid] = Position.y[parent_eid] + RelativePosition.y[eid]
        }
    }
    return world
}

export default system