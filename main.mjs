import PerformanceManager from './managers/PerformanceManager.mjs'
import ResourceManager from './managers/ResourceManager.mjs'
import SceneManager from './managers/SceneManager.mjs'
import CanvasManager from './managers/CanvasManager.mjs'
import ReferenceTypeManager from './managers/ReferenceTypeManager.mjs'
import VarietyManager from './managers/VarietyManager.mjs'
import EventManager from './managers/EventManager.mjs'
import InputManager from './managers/InputManager.mjs'
import NetworkManager from './managers/TrysteroManager.mjs'
import RollbackQueue from './managers/RollbackQueue.mjs'

import animation_system from './systems/logic/animation_system.mjs'
import clickable_system from './systems/logic/clickable_system.mjs'
import controller_system from './systems/logic/controller_system.mjs'
import mouse_system from './systems/logic/mouse_system.mjs'
import node_system from './systems/logic/node_system.mjs'
import debug_text_system from './systems/render/debug_text_system.mjs'

import Scene from './classes/Scene.mjs'

class Game {
    constructor(settings) {
        this.game_tic_length_ms = settings.game_tic_length_ms
        this.game_tic_length_ns = settings.game_tic_length_ms * 100
    }
    update_steps() {
        SceneManager.update()
        PerformanceManager.update_game_performance()
    }
    render_steps() {
        SceneManager.render()
        PerformanceManager.update_render_performance()
    }
    update() {
        this.update_steps()
        const now = performance.now()
        const delta = now - PerformanceManager.game_time.then
        const ms_till_next_update = Math.max(0, Math.floor((this.game_tic_length_ns - delta) / 100))
        setTimeout(() => { this.update() }, ms_till_next_update)
    }
    render() {
        this.render_steps()
        requestAnimationFrame(() => { this.render() });
    }
    async start() {
        await ResourceManager.all_loaded()
        setTimeout(() => { this.update() }, this.game_tic_length_ms)
        setTimeout(() => { this.render() }, this.game_tic_length_ms)
    }
}

export { Game }
export {
    PerformanceManager,
    ResourceManager,
    SceneManager,
    CanvasManager,
    ReferenceTypeManager,
    VarietyManager,
    EventManager,
    InputManager,
    NetworkManager,
    Scene
}
export {
    animation_system,
    clickable_system,
    controller_system,
    mouse_system,
    node_system,
    debug_text_system
}