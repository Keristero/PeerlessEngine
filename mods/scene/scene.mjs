import scene_system from "./systems/scene_system.mjs"

const mod = {
    name: "scene",
    dependencies: [],
    components: {},
    relationships: {},
    systems: { scene_system },

    // Map<name, { systems: Set<string>, create, reuse, cleanup }>
    _scenes: new Map(),

    _current_scene: null,
    _pending: null,              // { name: string, data: any }
    _created_scenes: new Set(),
}

mod.activate = function(engine, world) {}

/**
 * Register a named scene.
 *
 * descriptor:
 *   systems  — string[]  — system names that ONLY run in this scene
 *   create   — (engine, world, data) => void  — called first time entering scene
 *   reuse    — (engine, world, data) => void  — called on subsequent entries
 *   cleanup  — (engine, world) => void        — called when leaving scene
 */
mod.register_scene = function(name, descriptor) {
    mod._scenes.set(name, {
        systems: new Set(descriptor.systems ?? []),
        create:  descriptor.create  ?? (() => {}),
        reuse:   descriptor.reuse   ?? (() => {}),
        cleanup: descriptor.cleanup ?? (() => {}),
    })
}

/**
 * Request a scene transition.
 * Safe to call from any system — the actual transition happens at end-of-tick
 * in sceneSystem.  Only the most recent request per tick takes effect.
 */
mod.request_transition = function(name, data = {}) {
    mod._pending = { name, data }
}

export { mod }
