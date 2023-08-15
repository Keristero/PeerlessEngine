import Component from '../../main/Component.js'

class Rectangle extends Component{
    constructor(){
        super({
            width:{default:1},
            height:{default:1}
        })
    }
}

export default new Rectangle()