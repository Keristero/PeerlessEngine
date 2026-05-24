// Pooling benchmark suite for the peerless-breakout engine.
//
// Compares two entity lifecycle strategies at several spawn rates:
//   destroy     — entities removed with removeEntity when out of bounds
//   engine pool — entities recycled via the pool mod (Destroyed + poolReturnSystem)
//
// Runs perf-runner.mjs in a fresh child process per scenario so that
// module state (component arrays, bitecs internals) is completely isolated.
//
// Usage:
//   node perf-suite.mjs
//   EXIT_AFTER_X_UPDATES=60 node perf-suite.mjs

import { execFileSync }      from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath }     from 'url'
import path                  from 'path'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const RUNNER       = path.join(__dirname, 'perf-runner.mjs')
const RESULTS_DIR  = path.join(__dirname, '../../results')
const RESULTS_FILE = path.join(RESULTS_DIR, 'perf.md')
const SPAWN_RATES  = [40, 80, 160, 320]
const UPDATE_RUNS  = [30, 120]
const MODES        = [
    { label: 'destroy (removeEntity)', env: {} },
    { label: 'pool   (engine mod)',    env: { USE_ENGINE_POOL: 'true' } },
]

const scenarios = []  // { title, updates, data } — collected for markdown

const DIVIDER = '='.repeat(54)

console.log(DIVIDER)
console.log('  peerless-breakout  —  performance suite')
console.log(DIVIDER)

for (const updates of UPDATE_RUNS) {
    console.log(`\n${'='.repeat(54)}`)
    console.log(`  ${updates} physics updates per scenario`)
    console.log('='.repeat(54))

    for (const rate of SPAWN_RATES) {
        console.log(`\n  ▶  ${rate} balls/tick`)

        for (const mode of MODES) {
            console.log(`\n    [${mode.label}]`)
            console.log('  ' + '-'.repeat(52))

            let raw_output = ''
            try {
                raw_output = execFileSync(process.execPath, [RUNNER], {
                    env: {
                        ...process.env,
                        PERFORMANCE_INSTRUMENTATION: 'true',
                        EXIT_AFTER_X_UPDATES:        String(updates),
                        SPAWN_RATE:                  String(rate),
                        ...mode.env,
                    },
                    encoding: 'utf8',
                })
            } catch (err) {
                raw_output = err.stdout ?? ''
                if (err.stderr) process.stderr.write(err.stderr)
            }

            const sentinel = '%%PERF_DATA%%'
            const split_at = raw_output.indexOf(sentinel)
            const output   = split_at >= 0 ? raw_output.slice(0, split_at) : raw_output
            const json_str = split_at >= 0 ? raw_output.slice(split_at + sentinel.length).trim() : null

            process.stdout.write(output)

            if (json_str) {
                try {
                    const data = JSON.parse(json_str)
                    const title = `${rate} balls/tick — ${mode.label} — ${updates} ticks`
                    scenarios.push({ title, updates, data })
                } catch (_) {}
            }
        }
    }
}

console.log('\n' + DIVIDER)
console.log('  Suite complete.')
console.log(DIVIDER + '\n')

// ── Markdown / Mermaid report ─────────────────────────────────────────────────

function make_markdown(scenarios) {
    const ts   = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const lines = []
    lines.push('# Performance Results')
    lines.push('')
    lines.push(`_Generated: ${ts}_`)
    lines.push('')

    // Fixed palette — order matches the line declarations in each chart
    const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
                     '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac']
    const EMOJI   = ['🔵', '🟠', '🔴', '🩵', '🟢', '🟡', '🟣', '🌸', '🟤', '⬜']

    for (const { title, updates, data } of scenarios) {
        const { system_order, systems } = data

        lines.push(`## ${title}`)
        lines.push('')

        // Summary table with color emoji matching the chart palette
        lines.push('| | System | avg | p1 | p99 |')
        lines.push('|---|---|---|---|---|')
        for (let i = 0; i < system_order.length; i++) {
            const name = system_order[i]
            const s    = systems[name]
            const icon = EMOJI[i % EMOJI.length]
            lines.push(`| ${icon} | ${name} | ${s.avg.toFixed(3)}ms | ${s.p1.toFixed(3)}ms | ${s.p99.toFixed(3)}ms |`)
        }
        lines.push('')

        // Full chart — all systems, y-axis scaled to tallest value
        const palette  = system_order.map((_, i) => PALETTE[i % PALETTE.length]).join(', ')
        const all_vals = system_order.flatMap(n => systems[n].samples)
        const y_max    = Math.ceil(Math.max(...all_vals) / 5) * 5 || 5

        const push_chart = (chart_title, order, y) => {
            const pal = order.map((_, i) => PALETTE[i % PALETTE.length]).join(', ')
            lines.push('```mermaid')
            lines.push('---')
            lines.push('config:')
            lines.push('  themeVariables:')
            lines.push('    xyChart:')
            lines.push(`      plotColorPalette: "${pal}"`)
            lines.push('---')
            lines.push('xychart-beta')
            lines.push(`    title "${chart_title}"`)
            lines.push(`    x-axis "tick" 1 --> ${updates}`)
            lines.push(`    y-axis "ms" 0 --> ${y}`)
            for (const name of order) {
                const vals = systems[name].samples.map(v => v.toFixed(3)).join(', ')
                lines.push(`    line [${vals}]`)
            }
            lines.push('```')
            lines.push('')
        }

        push_chart(title, system_order, y_max)

        // Overhead detail chart — drops physicsSystem and collisionSystem so the
        // smaller systems (destructionSystem, poolReturnSystem, etc.) are visible.
        const DOMINANT    = new Set(['physicsSystem', 'collisionSystem'])
        const detail_order = system_order.filter(n => !DOMINANT.has(n))
        if (detail_order.length > 0) {
            const detail_vals  = detail_order.flatMap(n => systems[n].samples)
            const detail_y_max = Math.ceil(Math.max(...detail_vals) / 0.1) * 0.1 || 0.1
            push_chart(`${title} — overhead detail`, detail_order, +detail_y_max.toFixed(1))
        }
    }

    return lines.join('\n')
}

if (scenarios.length > 0) {
    mkdirSync(RESULTS_DIR, { recursive: true })
    writeFileSync(RESULTS_FILE, make_markdown(scenarios), 'utf8')
    console.log(`  Results written to ${path.relative(process.cwd(), RESULTS_FILE)}`)
}
