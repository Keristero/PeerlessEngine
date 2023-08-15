import Component from '../../main/Component.js'

class Position extends Component{
    constructor(){
        super({
            x:{default:0},
            y:{default:0}
        })
    }
}

export default new Position()