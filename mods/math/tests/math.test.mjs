import assert from 'node:assert/strict'

// No entity state needed — math functions are pure
export async function setup(engine, world) {}

export const tests = {
    'random_integer returns an integer': (engine) => {
        const result = engine.mods.math.random_integer(1, 100)
        assert.ok(Number.isInteger(result), `expected integer, got ${result}`)
    },

    'random_integer result is within [min, max)': (engine) => {
        for (let i = 0; i < 200; i++) {
            const result = engine.mods.math.random_integer(5, 10)
            assert.ok(result >= 5, `${result} should be >= 5`)
            assert.ok(result < 10, `${result} should be < 10`)
        }
    },

    'random_integer with a range of 1 always returns min (min is inclusive)': (engine) => {
        for (let i = 0; i < 20; i++) {
            assert.equal(engine.mods.math.random_integer(7, 8), 7)
        }
    },

    'random_integer works with negative numbers': (engine) => {
        for (let i = 0; i < 200; i++) {
            const result = engine.mods.math.random_integer(-10, -1)
            assert.ok(result >= -10, `${result} should be >= -10`)
            assert.ok(result < -1,   `${result} should be < -1`)
        }
    },

    'random_float returns a number within [min, max)': (engine) => {
        for (let i = 0; i < 200; i++) {
            const result = engine.mods.math.random_float(1.0, 2.0)
            assert.ok(result >= 1.0, `${result} should be >= 1.0`)
            assert.ok(result < 2.0,  `${result} should be < 2.0`)
        }
    },

    'random_float can return non-integer values': (engine) => {
        const results = Array.from({ length: 50 }, () => engine.mods.math.random_float(0, 1000))
        assert.ok(results.some(r => !Number.isInteger(r)), 'expected at least one non-integer result')
    },

    'random_float with equal min and max returns that value': (engine) => {
        assert.equal(engine.mods.math.random_float(3.5, 3.5), 3.5)
    },
}
