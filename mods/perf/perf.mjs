// Performance instrumentation mod.
//
// Two independent env vars (process.env or window.*) control behaviour:
//
//   PERFORMANCE_OVERLAY=true
//     Enables a per-system EMA timing overlay (read by debugDisplaySystem).
//     Set to a comma-separated list of system names to show only those systems:
//       PERFORMANCE_OVERLAY=physicsSystem,collisionSystem
//     Does NOT accumulate sample arrays — safe for long browser sessions.
//
//   PERFORMANCE_INSTRUMENTATION=true
//     Enables full per-sample capture (samples[], p1, p99) used by perf-runner.
//     Also enables EXIT_AFTER_X_UPDATES to stop the simulation loop.
//     Implies overlay-level EMA tracking.
//
// Browser equivalent: set window.PERFORMANCE_OVERLAY / window.PERFORMANCE_INSTRUMENTATION
// before engine initialisation.

const mod = {
    name: "perf",
    dependencies: [],
    components: {},
    systems: {},
    enabled: false,
    _capture_samples: false,  // true when PERFORMANCE_INSTRUMENTATION is set
    _overlay_enabled: false,  // true when PERFORMANCE_OVERLAY is set
    _overlay_systems: null,   // null = all systems; string[] = only these
    _stats: null,             // Map<name, { total_ms, count, ema_ms, samples? }>
    _system_order: [],        // system names in first-seen execution order
    _physics_updates: 0,      // number of physics update_systems calls recorded
    _should_stop: false,      // set true when EXIT_AFTER_X_UPDATES is reached
}

mod.activate = async function (engine, _world) {
    const envObj = typeof process !== 'undefined' ? (process.env ?? {}) : {}
    const winObj = typeof window  !== 'undefined' ? window              : {}

    const instr_val   = envObj.PERFORMANCE_INSTRUMENTATION ?? winObj.PERFORMANCE_INSTRUMENTATION
    const overlay_val = envObj.PERFORMANCE_OVERLAY         ?? winObj.PERFORMANCE_OVERLAY

    const instrumentation = Boolean(instr_val)
    const overlay         = Boolean(overlay_val)

    if (!instrumentation && !overlay) return

    const max_updates = parseInt(
        envObj.EXIT_AFTER_X_UPDATES ?? winObj.EXIT_AFTER_X_UPDATES ?? '0'
    )

    mod.enabled          = true
    mod._capture_samples = instrumentation
    mod._overlay_enabled = overlay
    mod._stats           = new Map()
    mod._system_order    = []
    mod._physics_updates = 0
    mod._should_stop     = false

    // Parse overlay filter: plain boolean → show all; 'sys1,sys2,...' → subset
    const is_plain_bool = overlay_val === true || overlay_val === 'true' || overlay_val === '1'
    mod._overlay_systems = (overlay && !is_plain_bool)
        ? String(overlay_val).split(',').map(s => s.trim()).filter(Boolean)
        : null

    const _orig = engine.update_systems

    engine.update_systems = function (category) {
        const systems = engine.sorted_systems[category] || []
        for (const system of systems) {
            engine._current_system = system.name

            const t0      = performance.now()
            system.run(engine, engine.world)
            const elapsed = performance.now() - t0

            engine._current_system = null

            if (!mod._stats.has(system.name)) {
                const entry = { total_ms: 0, count: 0, ema_ms: elapsed }
                if (mod._capture_samples) entry.samples = []
                mod._stats.set(system.name, entry)
                mod._system_order.push(system.name)
            }
            const s = mod._stats.get(system.name)
            s.total_ms += elapsed
            s.count++
            s.ema_ms = s.ema_ms * 0.9 + elapsed * 0.1
            if (mod._capture_samples) s.samples.push(elapsed)
        }

        if (category === 'physics') {
            mod._physics_updates++
            if (max_updates > 0 && mod._physics_updates >= max_updates) {
                mod._should_stop = true
            }
        }
    }
}

// Clear all collected stats (useful when running multiple scenarios in one process).
mod.reset = function () {
    if (mod._stats) mod._stats.clear()
    mod._system_order    = []
    mod._physics_updates = 0
    mod._should_stop     = false
}

// Return raw stats as a JSON-serializable object for tooling (e.g. chart generation).
// Only meaningful when PERFORMANCE_INSTRUMENTATION is set (samples array exists).
mod.raw_data = function () {
    if (!mod._stats || !mod._capture_samples) return null
    const systems = {}
    for (const name of mod._system_order) {
        const s      = mod._stats.get(name)
        const sorted = s.samples.slice().sort((a, b) => a - b)
        const p1_idx  = Math.max(0, Math.ceil(0.01 * sorted.length) - 1)
        const p99_idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1)
        systems[name] = {
            avg:     s.total_ms / s.count,
            p1:      sorted[p1_idx],
            p99:     sorted[p99_idx],
            samples: s.samples,
        }
    }
    return { system_order: mod._system_order, systems }
}

// Print average + p1/p99 times for every system in execution order.
// Only meaningful when PERFORMANCE_INSTRUMENTATION is set.
mod.report = function () {
    if (!mod._stats || !mod._capture_samples || mod._stats.size === 0) {
        console.log('  (no data collected)')
        return
    }
    for (const name of mod._system_order) {
        const s      = mod._stats.get(name)
        const avg    = s.total_ms / s.count
        const sorted = s.samples.slice().sort((a, b) => a - b)
        const p1_idx  = Math.max(0, Math.ceil(0.01 * sorted.length) - 1)
        const p99_idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1)
        const p1  = sorted[p1_idx]
        const p99 = sorted[p99_idx]
        console.log(
            `  ${name.padEnd(32)} avg: ${avg.toFixed(4)}ms` +
            `  p1: ${p1.toFixed(4)}ms  p99: ${p99.toFixed(4)}ms` +
            `  (${s.count} samples)`
        )
    }
}

export { mod }
