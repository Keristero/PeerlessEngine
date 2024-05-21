class PerformanceManager{
    constructor(){
        this.game_time = { delta: 0, elapsed: 0, then: performance.now() }
        this.render_time = { delta: 0, elapsed: 0, then: performance.now() }
    }
    update_game_performance(){
        const now = performance.now()
        const delta = now - this.game_time.then
        this.game_time.delta = delta
        this.game_time.elapsed += delta
        this.game_time.then = now
    }
    update_render_performance(){
        const now = performance.now()
        const delta = now - this.render_time.then
        this.render_time.delta = delta
        this.render_time.elapsed += delta
        this.render_time.then = now
    }
}

export default new PerformanceManager()