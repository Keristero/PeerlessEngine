class SceneManager{
    constructor(starting_scene){
        this.current_scene = starting_scene
        this.scenes = {}
    }
    add(scene_id,scene){
        this.scenes[scene_id] = scene
        scene.init()
    }
    set_scene(scene_id){
        this.current_scene = this.scenes[scene_id]
    }
    render(){
        return this.current_scene.render()
    }
    update(){
        return this.current_scene.update()
    }
}

export default new SceneManager()