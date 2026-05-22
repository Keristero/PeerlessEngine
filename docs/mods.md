# Mods

Mods are the primary way to extend the engine. Each mod is a `.mjs` file that exports a `mod` object. The engine discovers, sorts, and activates mods automatically.

## How mods are loaded

When `engine.init(path)` is called, it calls `find_and_load_mods` on the `mods/` subdirectory of that path. You can also call `engine.find_and_load_mods(path)` directly to load an additional folder of mods (e.g. your game's own `mods/` directory).

Loading happens in three steps:

1. **Scan** — `recursive_directory_scan` walks the folder up to one level deep and collects all `.mjs` files.
2. **Import** — all files are imported to read their metadata (`name`, `dependencies`).
3. **Sort & activate** — mods are topologically sorted so dependencies are always activated before the mods that need them, then each mod's `activate` function is called in order.

## The mod object

A mod file must export a named `mod` object. The required fields are:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Unique identifier for the mod. Used as the key in `engine.mods`. |
| `dependencies` | `string[]` | yes | Names of other mods this mod requires. Use `[]` if none. |
| `activate` | `async function(engine, world, deps)` | yes | Called once when the mod is loaded. |

Optional fields you can add for your own organisation (the engine doesn't use them directly):

| Field | Description |
|---|---|
| `components` | Object containing bitecs component definitions. |
| `relationships` | Object containing bitecs relationship factories. |
| `systems` | Object containing system functions. |
| `prefabs` | Object containing prefab factory functions. |

## The `activate` function

```js
mod.activate = async function(engine, world, deps) { ... }
```

| Argument | Description |
|---|---|
| `engine` | The engine object. Provides `engine.bitecs` for ECS operations and `engine.mods` for the full mod registry. |
| `world` | The bitecs world. Shorthand for `engine.world`. |
| `deps` | An object containing only the mods listed in `dependencies`. Accessing a mod through `deps` is the preferred way to use other mods — if it wasn't declared as a dependency it won't be present here. |

> If a declared dependency isn't loaded by the time a mod activates, the engine will log a warning and the key will be absent from `deps`.

## Writing a new mod

### Minimal example

```js
// mods/my-mod/my_mod.mjs

const mod = {
    name: "my_mod",
    dependencies: [],
}

mod.activate = async function(engine, world, deps) {
    console.log("my_mod activated!")
}

export { mod }
```

### Example with dependencies, components, and a system

This example creates a `gravity` mod that depends on the `twodee` mod and adds downward acceleration to all entities that have a `Velocity2d` component.

```js
// mods/gravity/gravity.mjs
import { GravityAffected } from "./components/gravity_components.mjs"

const mod = {
    name: "gravity",
    dependencies: ["twodee"],
    components: { GravityAffected },
    systems: {},
}

mod.activate = async function(engine, world, deps) {
    const { registerComponent } = engine.bitecs
    registerComponent(world, GravityAffected)

    mod.systems.gravitySystem = function gravitySystem(engine, world) {
        const { query } = engine.bitecs
        const { Velocity2d } = deps.twodee.components

        for (const eid of query(world, [Velocity2d, GravityAffected])) {
            Velocity2d.y[eid] += 0.1
        }
    }
}

export { mod }
```

```js
// mods/gravity/components/gravity_components.mjs
const GravityAffected = {}
export { GravityAffected }
```

Key points from the example:

- `deps.twodee` is available because `"twodee"` is in `dependencies`.
- The system is defined inside `activate` so it closes over `deps`, avoiding the need to reach into `engine.mods` at runtime.
- Components are imported directly from their own file and registered in `activate`.

## Dependency rules

- A mod **must** list every other mod it uses in its `dependencies` array.
- The engine sorts mods so dependencies are always activated first — circular dependencies will produce a warning and may cause undefined behaviour.
- Dependencies that are loaded from a different folder (e.g. engine built-ins loaded via `engine.init`) do not need to be in the same batch and are not part of the sort — they are simply expected to already be present in `engine.mods` before the dependent mod activates.
