import assert from 'node:assert/strict'
import { setup_mod_loader } from '../engine_mod_loader.mjs'

function make_engine(mods = {}) {
    const engine = { mods, sorted_systems: {}, world: {} }
    setup_mod_loader(engine)
    return engine
}

// ─── topological_sort ────────────────────────────────────────────────────────

describe('topological_sort', () => {
    let engine
    beforeEach(() => { engine = make_engine() })

    it('returns an empty array for empty input', () => {
        assert.deepEqual(engine.topological_sort([]), [])
    })

    it('returns a single item unchanged', () => {
        const a = { name: 'a', dependencies: [] }
        assert.deepEqual(engine.topological_sort([a]), [a])
    })

    it('places a dependency before the item that depends on it', () => {
        const a = { name: 'a', dependencies: [] }
        const b = { name: 'b', dependencies: ['a'] }
        const result = engine.topological_sort([b, a])
        assert.ok(result.indexOf(a) < result.indexOf(b))
    })

    it('handles a chain of three dependencies', () => {
        const a = { name: 'a', dependencies: [] }
        const b = { name: 'b', dependencies: ['a'] }
        const c = { name: 'c', dependencies: ['b'] }
        const result = engine.topological_sort([c, b, a])
        assert.ok(result.indexOf(a) < result.indexOf(b))
        assert.ok(result.indexOf(b) < result.indexOf(c))
    })

    it('handles multiple independent roots', () => {
        const a = { name: 'a', dependencies: [] }
        const b = { name: 'b', dependencies: [] }
        const c = { name: 'c', dependencies: ['a', 'b'] }
        const result = engine.topological_sort([c, b, a])
        assert.ok(result.indexOf(a) < result.indexOf(c))
        assert.ok(result.indexOf(b) < result.indexOf(c))
    })

    it('ignores dependencies not present in the input (external/already-loaded)', () => {
        const a = { name: 'a', dependencies: ['external_mod'] }
        const result = engine.topological_sort([a])
        assert.deepEqual(result, [a])
    })

    it('still returns all items on circular dependency and emits a warning', () => {
        const warnings = []
        const orig = console.warn
        console.warn = (...args) => warnings.push(args.join(' '))

        const a = { name: 'a', dependencies: ['b'] }
        const b = { name: 'b', dependencies: ['a'] }
        const result = engine.topological_sort([a, b])

        console.warn = orig
        assert.equal(result.length, 2)
        assert.ok(warnings.length > 0)
    })
})

// ─── sort_systems ─────────────────────────────────────────────────────────────

describe('sort_systems', () => {
    it('groups systems into their respective categories', () => {
        const physSys = { name: 'physSys', category: 'physics', dependencies: [] }
        const rendSys = { name: 'rendSys', category: 'render',  dependencies: [] }
        const engine = make_engine({ mod_a: { systems: { physSys, rendSys } } })
        engine.sort_systems()
        assert.equal(engine.sorted_systems.physics.length, 1)
        assert.equal(engine.sorted_systems.render.length, 1)
        assert.equal(engine.sorted_systems.physics[0], physSys)
        assert.equal(engine.sorted_systems.render[0], rendSys)
    })

    it('sorts systems within a category by their dependencies', () => {
        const a = { name: 'a', category: 'physics', dependencies: [] }
        const b = { name: 'b', category: 'physics', dependencies: ['a'] }
        const engine = make_engine({ mod_a: { systems: { b, a } } })
        engine.sort_systems()
        const order = engine.sorted_systems.physics
        assert.ok(order.indexOf(a) < order.indexOf(b))
    })

    it('throws a descriptive error when a system is missing a category', () => {
        const bad = { name: 'badSystem', dependencies: [] }
        const engine = make_engine({ mod_a: { systems: { bad } } })
        assert.throws(
            () => engine.sort_systems(),
            /System "badSystem" is missing a required "category" field/
        )
    })

    it('throws a descriptive error on a cross-category dependency', () => {
        const a = { name: 'a', category: 'physics', dependencies: [] }
        const b = { name: 'b', category: 'render',  dependencies: ['a'] }
        const engine = make_engine({ mod_a: { systems: { a, b } } })
        assert.throws(
            () => engine.sort_systems(),
            /Cross-category dependencies are not allowed/
        )
    })

    it('produces an empty sorted_systems object when no mods have systems', () => {
        const engine = make_engine({ mod_a: {} })
        engine.sort_systems()
        assert.deepEqual(engine.sorted_systems, {})
    })
})

// ─── update_systems ───────────────────────────────────────────────────────────

describe('update_systems', () => {
    it('calls run on each system in order for the given category', () => {
        const log = []
        const engine = make_engine()
        engine.sorted_systems = {
            physics: [
                { name: 'a', run: () => log.push('a') },
                { name: 'b', run: () => log.push('b') },
            ]
        }
        engine.update_systems('physics')
        assert.deepEqual(log, ['a', 'b'])
    })

    it('does not run systems from other categories', () => {
        const log = []
        const engine = make_engine()
        engine.sorted_systems = {
            physics: [{ name: 'phys', run: () => log.push('phys') }],
            render:  [{ name: 'rend', run: () => log.push('rend') }],
        }
        engine.update_systems('physics')
        assert.deepEqual(log, ['phys'])
    })

    it('does nothing and does not throw for an unknown category', () => {
        const engine = make_engine()
        engine.sorted_systems = {}
        assert.doesNotThrow(() => engine.update_systems('nonexistent'))
    })
})

// ─── activate_mod ─────────────────────────────────────────────────────────────

describe('activate_mod', () => {
    it('calls mod.activate with the engine, world, and an empty deps object', async () => {
        const engine = make_engine()
        let received
        const mod = {
            name: 'test',
            dependencies: [],
            activate: async (eng, world, deps) => { received = { eng, world, deps } }
        }
        await engine.activate_mod(mod)
        assert.equal(received.eng, engine)
        assert.equal(received.world, engine.world)
        assert.deepEqual(received.deps, {})
    })

    it('stores the mod in engine.mods under its name after activation', async () => {
        const engine = make_engine()
        const mod = { name: 'my_mod', dependencies: [], activate: async () => {} }
        await engine.activate_mod(mod)
        assert.equal(engine.mods.my_mod, mod)
    })

    it('populates deps with references to satisfied dependencies', async () => {
        const dep_mod = { name: 'dep', dependencies: [], activate: async () => {} }
        const engine = make_engine({ dep: dep_mod })
        let received_deps
        const mod = {
            name: 'consumer',
            dependencies: ['dep'],
            activate: async (eng, world, deps) => { received_deps = deps }
        }
        await engine.activate_mod(mod)
        assert.equal(received_deps.dep, dep_mod)
    })

    it('omits a missing dependency from deps and emits a warning', async () => {
        const warnings = []
        const orig = console.warn
        console.warn = (...args) => warnings.push(args.join(' '))

        const engine = make_engine()
        let received_deps
        const mod = {
            name: 'consumer',
            dependencies: ['not_loaded'],
            activate: async (eng, world, deps) => { received_deps = deps }
        }
        await engine.activate_mod(mod)
        console.warn = orig

        assert.equal(received_deps.not_loaded, undefined)
        assert.ok(warnings.some(w => w.includes('not_loaded')))
    })

    it('skips activation and warns when the mod has no name or activate function', async () => {
        const warnings = []
        const orig = console.warn
        console.warn = (...args) => warnings.push(args)

        const engine = make_engine()
        await engine.activate_mod({ dependencies: [] })

        console.warn = orig
        assert.equal(Object.keys(engine.mods).length, 0)
        assert.equal(warnings.length, 1)
    })
})

// ─── component_ownership ──────────────────────────────────────────────────────

describe('component_ownership', () => {

    it('registers ownership when a system declares "writes"', () => {
        const comp = { x: [], y: [] }
        const sys = { name: 'sys', category: 'physics', dependencies: [], writes: ['MyComp'] }
        const engine = make_engine({ mod_a: { systems: { sys }, components: { MyComp: comp } } })
        engine.sort_systems()
        assert.equal(engine._component_owner.get(comp), 'sys')
    })

    it('throws when two systems declare writes for the same component', () => {
        const comp = { x: [] }
        const sysA = { name: 'sysA', category: 'physics', dependencies: [], writes: ['MyComp'] }
        const sysB = { name: 'sysB', category: 'physics', dependencies: [], writes: ['MyComp'] }
        const engine = make_engine({ mod_a: { systems: { sysA, sysB }, components: { MyComp: comp } } })
        assert.throws(() => engine.sort_systems(), /already owned/)
    })

    it('warns and continues when writes references an unknown component name', () => {
        const warnings = []
        const orig = console.warn
        console.warn = (...args) => warnings.push(args.join(' '))
        const sys = { name: 'sys', category: 'physics', dependencies: [], writes: ['Ghost'] }
        const engine = make_engine({ mod_a: { systems: { sys }, components: {} } })
        assert.doesNotThrow(() => engine.sort_systems())
        console.warn = orig
        assert.ok(warnings.some(w => w.includes('Ghost')))
    })

    it('queues a write via explicit _queue_write instead of applying it immediately', () => {
        const comp = { x: [] }
        comp.x[0] = 0
        const owner = { name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sort_systems()

        engine._queue_write(0, comp, 'x', 99)

        assert.equal(comp.x[0], 0, 'value must not change immediately')
        const queued = engine._pending_writes.get(comp)?.get(0)?.get('x')
        assert.equal(queued, 99, 'value must be in the pending queue')
    })

    it('allows direct writes when there is no current system (_current_system = null)', () => {
        const comp = { x: [] }
        comp.x[0] = 0
        const sys = { name: 'sys', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { sys }, components: { MyComp: comp } } })
        engine.sort_systems()

        // No current system → direct write (setup, activate, test code path)
        comp.x[0] = 42
        assert.equal(comp.x[0], 42, 'direct write should work outside a tick')
    })

    it('applies queued writes before the owning system runs', () => {
        const comp = { x: [] }
        comp.x[0] = 0
        let seen_value_at_run_start
        const owner = {
            name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'],
            run: (engine) => { seen_value_at_run_start = comp.x[0] }
        }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sorted_systems = { physics: [owner] }
        engine.sort_systems()

        engine._queue_write(0, comp, 'x', 77)

        assert.equal(comp.x[0], 0, 'not yet applied')
        engine.update_systems('physics')
        assert.equal(seen_value_at_run_start, 77, 'queued write must be applied before run()')
    })

    it('last write to the same eid+prop wins when multiple are queued', () => {
        const comp = { x: [] }
        comp.x[0] = 0
        const owner = { name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sort_systems()

        engine._queue_write(0, comp, 'x', 10)
        engine._queue_write(0, comp, 'x', 20)
        engine._queue_write(0, comp, 'x', 30)

        engine._apply_pending_for('owner')
        assert.equal(comp.x[0], 30, 'last queued write must win')
    })

    it('get_pending_value returns the latest pending value for a component property', () => {
        const comp = { x: [] }
        comp.x[0] = 10
        const owner = { name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sort_systems()

        engine._queue_write(0, comp, 'x', 99)

        assert.equal(engine.get_pending_value(0, comp, 'x'), 99)
    })

    it('get_pending_value returns undefined when no write is pending', () => {
        const comp = { x: [] }
        comp.x[0] = 10
        const owner = { name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sort_systems()

        assert.equal(engine.get_pending_value(0, comp, 'x'), undefined)
    })

    it('get_pending_delta returns (pending - current) for a numeric property', () => {
        const comp = { x: [] }
        comp.x[0] = 10
        const owner = { name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sort_systems()

        engine._queue_write(0, comp, 'x', 15)  // pending: 15, current committed: 10

        assert.equal(engine.get_pending_delta(0, comp, 'x'), 5)
    })

    it('get_pending_delta returns 0 when no write is pending', () => {
        const comp = { x: [] }
        comp.x[0] = 10
        const owner = { name: 'owner', category: 'physics', dependencies: [], writes: ['MyComp'], run: () => {} }
        const engine = make_engine({ mod_a: { systems: { owner }, components: { MyComp: comp } } })
        engine.sort_systems()

        assert.equal(engine.get_pending_delta(0, comp, 'x'), 0)
    })
})
