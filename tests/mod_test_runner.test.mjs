import assert from "node:assert/strict"
import { readdir } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import path from "node:path"
import * as bitecs from "../node_modules/bitecs/dist/core/index.mjs"
import { setup_mod_loader } from "../engine_mod_loader.mjs"

const TESTS_DIR = path.dirname(new URL(import.meta.url).pathname)
const MOD_DIRS = [
    path.resolve(TESTS_DIR, "../mods"),
    path.resolve(TESTS_DIR, "../../mods"),
]

function make_fresh_engine() {
    const world = bitecs.createWorld()
    const engine = { bitecs, world, mods: {}, sorted_systems: {} }
    setup_mod_loader(engine)
    return engine
}

async function safe_readdir(dir, opts) {
    try { return await readdir(dir, opts) } catch { return [] }
}

async function load_mod_registry(mod_dirs) {
    const registry = {}
    for (const mods_dir of mod_dirs) {
        const entries = (await safe_readdir(mods_dir, { withFileTypes: true }))
            .filter(e => e.isDirectory())
        for (const entry of entries) {
            const folder = path.join(mods_dir, entry.name)
            const files = (await safe_readdir(folder)).filter(f => f.endsWith(".mjs"))
            for (const file of files) {
                const imported = await import(pathToFileURL(path.join(folder, file)))
                if (imported.mod?.name) {
                    registry[imported.mod.name] = imported.mod
                    break
                }
            }
        }
    }
    return registry
}

async function activate_deps(engine, mod, registry, activated = []) {
    for (const dep_name of (mod.dependencies || [])) {
        if (engine.mods[dep_name]) continue
        const dep = registry[dep_name]
        if (dep) {
            await activate_deps(engine, dep, registry, activated)
            await engine.activate_mod(dep)
            activated.push(dep_name)
        }
    }
    return activated
}

async function discover_suites(mod_dirs, registry) {
    const suites = []
    for (const mods_dir of mod_dirs) {
        const entries = (await safe_readdir(mods_dir, { withFileTypes: true }))
            .filter(e => e.isDirectory())
        for (const entry of entries) {
            const tests_dir = path.join(mods_dir, entry.name, "tests")
            const test_files = (await safe_readdir(tests_dir)).filter(f => f.endsWith(".test.mjs"))
            if (test_files.length === 0) continue

            const folder_files = (await safe_readdir(path.join(mods_dir, entry.name)))
                .filter(f => f.endsWith(".mjs"))
            let mod = null
            for (const file of folder_files) {
                const imported = await import(pathToFileURL(path.join(mods_dir, entry.name, file)))
                if (imported.mod?.name) { mod = imported.mod; break }
            }
            if (!mod) continue

            for (const file of test_files) {
                const test_file = path.join(tests_dir, file)
                const test_module = await import(pathToFileURL(test_file))
                suites.push({ mod, test_module, test_file })
            }
        }
    }
    return suites
}

const registry = await load_mod_registry(MOD_DIRS)
const suites = await discover_suites(MOD_DIRS, registry)

for (const { mod, test_module, test_file } of suites) {
    describe("mod: " + mod.name, function() {
        let engine

        before(async function() {
            engine = make_fresh_engine()
            const activated = await activate_deps(engine, mod, registry)
            engine.mods[mod.name] = mod
            console.log("[mod_test_runner] file:", path.relative(process.cwd(), test_file))
            if (activated.length > 0) {
                console.log("[mod_test_runner] deps:", activated.join(", "))
            }
            if (typeof test_module.setup === "function") {
                await test_module.setup(engine, engine.world)
            }
        })

        for (const [test_name, test_fn] of Object.entries(test_module.tests || {})) {
            it(test_name, function() {
                return test_fn(engine, engine.world)
            })
        }
    })
}
