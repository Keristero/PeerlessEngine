# Input System

The input system bridges raw device events and ECS components. It is split into three mods:

- **`input`** — core mod; holds devices, mappings, and restrictions; runs `inputSystem`
- **`keyboard`** — browser-only; fills a buffer from `keydown`/`keyup` events
- **`mouse`** — browser-only; fills a buffer from `mousemove`, `mousedown`, `mouseup` events

---

## Device interface

All input devices (keyboard, mouse, or custom) must implement this interface:

```js
device.read(input_name)           // current hold state — number or 0/1
device.read_pressed(input_name)   // 1 if pressed since last flush, else 0
device.read_released(input_name)  // 1 if released since last flush, else 0
device.flush()                    // called by the input system after all mappings are processed
```

`flush()` is the only place pressed/released flags and delta accumulators are cleared. Game systems never read from device objects directly — the input system owns that responsibility.

## Registering devices

```js
engine.mods.input.register_device("keyboard", engine.mods.keyboard.device)
engine.mods.input.register_device("mouse", engine.mods.mouse.device)
```

---

## Keyboard device

`engine.mods.keyboard.device` implements the device interface backed by `keydown`/`keyup` events.

| `read(code)` | `0\|1` | Current held state. `1` while key is held. |
|---|---|---|
| `read_pressed(code)` | `0\|1` | `1` if this key was pressed since the last `flush()`; ignores auto-repeat. |
| `read_released(code)` | `0\|1` | `1` if this key was released since the last `flush()`. |

Key names use `e.code` strings: `"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"KeyW"`, etc. Arrow keys and Space have `e.preventDefault()` called to stop page scrolling.

---

## Mouse device

`engine.mods.mouse.device` implements the device interface backed by `mousemove`, `mousedown`, `mouseup` events.

| `read("x")` / `read("y")` | number | Current cursor position (`clientX`/`clientY`). |
|---|---|---|
| `read("x_delta")` / `read("y_delta")` | number | Movement accumulated since last `flush()`. |
| `read("button0")` etc. | `0\|1` | Current held state for mouse button `n` (0=left, 1=middle, 2=right). |
| `read_pressed("button0")` | `0\|1` | `1` if button was pressed since last `flush()`. |
| `read_released("button0")` | `0\|1` | `1` if button was released since last `flush()`. |

---

## Mappings

A mapping reads one input from a device and accumulates it into a component property each tick. All mapped properties are reset to `0` at the start of each tick before accumulation, so opposing mappings cancel naturally.

```js
engine.mods.input.add_mapping({
    input_device_alias: "keyboard",          // alias passed to register_device
    input_device_input_name: "ArrowLeft",    // key passed to device.read*()
    component: PlayerController,             // bitecs component object
    target_component_property: "horizontal_axis",
    target_value_multiplier: -1,             // optional, default 1
    input_mode: "state",                     // optional: "state" | "pressed" | "released"
})
```

`input_mode` controls which device method is called:

| `input_mode` | Device method called | Use for |
|---|---|---|
| `"state"` (default) | `device.read()` | Held axes, continuous movement |
| `"pressed"` | `device.read_pressed()` | One-shot actions (fire, jump) |
| `"released"` | `device.read_released()` | Release-triggered actions |

Multiple mappings to the same property accumulate — opposing keys cancel, mouse and keyboard add together.

---

## Restrictions

Restrictions clamp a component property to a range after all mappings have been applied. They are declared separately from mappings so a range applies regardless of how many devices contribute to the value.

```js
engine.mods.input.add_restriction({
    component: PlayerController,
    target_component_property: "horizontal_axis",
    min_value: -1,   // optional, default -Infinity
    max_value: 1,    // optional, default +Infinity
})
```

---

## Example: player controller with keyboard + mouse

```js
// components/player_components.mjs
export const PlayerController = { horizontal_axis: [], release_ball: [] }
```

```js
// In your mod's activate():
import { PlayerController } from "./components/player_components.mjs"

registerComponent(world, PlayerController)

// Register devices (done once in your entry point after mods load)
deps.input.register_device("keyboard", engine.mods.keyboard.device)
deps.input.register_device("mouse", engine.mods.mouse.device)

// Clamp the axis to [-1, 1]
deps.input.add_restriction({
    component: PlayerController,
    target_component_property: "horizontal_axis",
    min_value: -1,
    max_value: 1,
})

// Keyboard: left/right arrows — continuous hold
deps.input.add_mapping({
    input_device_alias: "keyboard",
    input_device_input_name: "ArrowLeft",
    component: PlayerController,
    target_component_property: "horizontal_axis",
    target_value_multiplier: -1,
})
deps.input.add_mapping({
    input_device_alias: "keyboard",
    input_device_input_name: "ArrowRight",
    component: PlayerController,
    target_component_property: "horizontal_axis",
    target_value_multiplier: 1,
})

// Mouse: horizontal movement (scaled down) — continuous
deps.input.add_mapping({
    input_device_alias: "mouse",
    input_device_input_name: "x_delta",
    component: PlayerController,
    target_component_property: "horizontal_axis",
    target_value_multiplier: 0.05,
})

// Space: one-shot action — only fires on the frame the key is pressed
deps.input.add_mapping({
    input_device_alias: "keyboard",
    input_device_input_name: "Space",
    component: PlayerController,
    target_component_property: "release_ball",
    target_value_multiplier: 1,
    input_mode: "pressed",
})
```

---

## How the system runs

Each tick of `engine.update_systems("input")`:

1. Reset every mapped component property to `0` for all matching entities
2. For each mapping, call the appropriate device method (`read`, `read_pressed`, or `read_released`), multiply, and accumulate into the component
3. Call `flush()` on every registered device — clears pressed/released flags and delta accumulators
4. For each restriction, clamp the component property to `[min_value, max_value]`

Game systems never read from device objects. The input system is the sole consumer of device state.
