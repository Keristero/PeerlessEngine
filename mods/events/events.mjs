import eventFlushSystem from "./systems/event_flush_system.mjs"

const mod = {
    name: "events",
    dependencies: [],
    components: {},
    systems: { eventFlushSystem },
}

mod.activate = function(engine, world) {
    const _queues = new Map()

    // Queue an event. Any system can call this at any time during a tick.
    mod.fire = function(type, data = {}) {
        if (!_queues.has(type)) _queues.set(type, [])
        _queues.get(type).push(data)
    }

    // Return the current array of events of the given type (read-only reference).
    // All systems within a tick see the same events.
    // The array is cleared by eventFlushSystem at the end of each scene tick.
    mod.get = function(type) {
        return _queues.get(type) ?? []
    }

    // Called by eventFlushSystem — clears all queues.
    mod._flush = function() {
        _queues.clear()
    }
}

export { mod }
