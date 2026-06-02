import assert from 'node:assert/strict'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse_asset_key_path, set_nested, setup_asset_loader } from '../engine_asset_loader.mjs'

const FIXTURES_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'fixtures')

function make_engine() {
    const engine = {}
    setup_asset_loader(engine)
    return engine
}

// ─── parse_asset_key_path ─────────────────────────────────────────────────────

describe('parse_asset_key_path', () => {
    it('single file at the root of the assets folder', () => {
        assert.deepEqual(
            parse_asset_key_path('./assets', '/assets/ball.png'),
            ['ball']
        )
    })

    it('file one directory deep', () => {
        assert.deepEqual(
            parse_asset_key_path('./assets', '/assets/sounds/bounce.mp3'),
            ['sounds', 'bounce']
        )
    })

    it('deeply nested file preserves full path', () => {
        assert.deepEqual(
            parse_asset_key_path('./assets', '/assets/ui/hud/score.png'),
            ['ui', 'hud', 'score']
        )
    })

    it('strips the ./ prefix from base folder before comparison', () => {
        assert.deepEqual(
            parse_asset_key_path('./breakout_assets', '/breakout_assets/ball.mjs'),
            ['ball']
        )
    })

    it('works when base folder is already an absolute path', () => {
        assert.deepEqual(
            parse_asset_key_path('/assets', '/assets/ball.png'),
            ['ball']
        )
    })
})

// ─── set_nested ───────────────────────────────────────────────────────────────

describe('set_nested', () => {
    it('sets a top-level key on the object', () => {
        const obj = {}
        set_nested(obj, ['ball'], 'value')
        assert.equal(obj.ball, 'value')
    })

    it('creates intermediate objects for a nested path', () => {
        const obj = {}
        set_nested(obj, ['sounds', 'bounce'], 'value')
        assert.equal(obj.sounds.bounce, 'value')
    })

    it('preserves existing sibling keys when adding a new one', () => {
        const obj = { sounds: { existing: 1 } }
        set_nested(obj, ['sounds', 'new_key'], 2)
        assert.equal(obj.sounds.existing, 1)
        assert.equal(obj.sounds.new_key, 2)
    })
})

// ─── load_image_asset ─────────────────────────────────────────────────────────

describe('load_image_asset', () => {
    afterEach(() => { delete globalThis.Image })

    it('sets src and resolves with the image when onload fires', async () => {
        const engine = make_engine()
        const fake_img = {}
        globalThis.Image = function() { return fake_img }

        const promise = engine.load_image_asset('ball.png')
        assert.equal(fake_img.src, 'ball.png', 'src must be set before waiting for load')
        fake_img.onload()

        const result = await promise
        assert.strictEqual(result, fake_img)
    })

    it('rejects when onerror fires', async () => {
        const engine = make_engine()
        const fake_img = {}
        globalThis.Image = function() { return fake_img }

        const promise = engine.load_image_asset('missing.png')
        fake_img.onerror(new Error('404'))

        await assert.rejects(promise)
    })
})

// ─── load_audio_asset ─────────────────────────────────────────────────────────

describe('load_audio_asset', () => {
    afterEach(() => { delete globalThis.Audio })

    it('calls load() and resolves with audio on canplaythrough', async () => {
        const engine = make_engine()
        const listeners = {}
        let load_called = false
        const fake_audio = {
            addEventListener: (event, fn) => { listeners[event] = fn },
            load: () => { load_called = true },
        }
        globalThis.Audio = function() { return fake_audio }

        const promise = engine.load_audio_asset('bounce.mp3')
        assert.ok(load_called, 'audio.load() must be called to start buffering')
        listeners['canplaythrough']()

        const result = await promise
        assert.strictEqual(result, fake_audio)
    })
})

// ─── load_text_asset ──────────────────────────────────────────────────────────

describe('load_text_asset', () => {
    afterEach(() => { delete globalThis.fetch })

    it('returns the text body of the response', async () => {
        const engine = make_engine()
        globalThis.fetch = async () => ({ ok: true, text: async () => 'hello world' })

        const result = await engine.load_text_asset('/assets/info.txt')
        assert.equal(result, 'hello world')
    })
})

// ─── load_scripted_asset ──────────────────────────────────────────────────────

describe('load_scripted_asset', () => {
    it('imports the module, calls default(), and routes to load_image_asset', async () => {
        const engine = make_engine()
        let received_src = null
        const fake_img = { _type: 'image' }
        engine.load_image_asset = async (src) => { received_src = src; return fake_img }

        const fixture = pathToFileURL(path.join(FIXTURES_DIR, 'test_scripted_image.mjs')).href
        const result = await engine.load_scripted_asset(fixture)

        assert.equal(received_src, 'data:image/png;base64,test_pixel',
            'load_image_asset must receive the data URL returned by the module')
        assert.strictEqual(result, fake_img)
    })

    it('throws when the module exports an unknown asset_type', async () => {
        const engine = make_engine()
        const fixture = pathToFileURL(path.join(FIXTURES_DIR, 'test_scripted_unknown.mjs')).href
        await assert.rejects(engine.load_scripted_asset(fixture), /Unknown asset_type/)
    })
})

// ─── find_and_load_assets ─────────────────────────────────────────────────────

describe('find_and_load_assets', () => {
    afterEach(() => { delete globalThis.fetch })

    it('builds a nested engine.assets tree from scanned file paths', async () => {
        const engine = make_engine()

        globalThis.fetch = async () => ({ ok: true })
        engine.recursive_directory_scan = async (_folder, ext) => {
            if (ext === '.png') return ['/assets/ball.png', '/assets/ui/score.png']
            if (ext === '.mp3') return ['/assets/sounds/bounce.mp3']
            if (ext === '.mjs') return ['/assets/tiles/stone.mjs']
            return []
        }
        engine.load_image_asset    = async (url) => ({ _type: 'image', url })
        engine.load_audio_asset    = async (url) => ({ _type: 'audio', url })
        engine.load_text_asset     = async (url) => url
        engine.load_scripted_asset = async (url) => ({ _type: 'scripted', url })

        await engine.find_and_load_assets('./assets')

        assert.equal(engine.assets.ball._type,          'image')
        assert.equal(engine.assets.ui.score._type,      'image')
        assert.equal(engine.assets.sounds.bounce._type, 'audio')
        assert.equal(engine.assets.tiles.stone._type,   'scripted')
    })

    it('skips scanning entirely when the directory probe returns non-ok', async () => {
        const engine = make_engine()
        globalThis.fetch = async () => ({ ok: false })
        let scan_called = false
        engine.recursive_directory_scan = async () => { scan_called = true; return [] }

        await engine.find_and_load_assets('./nonexistent')

        assert.ok(!scan_called, 'scan must not run for a missing directory')
        assert.deepEqual(engine.assets, {})
    })

    it('accumulates into engine.assets across multiple calls', async () => {
        const engine = make_engine()
        globalThis.fetch = async () => ({ ok: true })

        engine.recursive_directory_scan = async (_f, ext) =>
            ext === '.png' ? ['/a/ball.png'] : []
        engine.load_image_asset    = async (url) => ({ url })
        engine.load_audio_asset    = async (url) => ({ url })
        engine.load_text_asset     = async (url) => url
        engine.load_scripted_asset = async (url) => ({ url })

        await engine.find_and_load_assets('./a')

        engine.recursive_directory_scan = async (_f, ext) =>
            ext === '.png' ? ['/b/bat.png'] : []

        await engine.find_and_load_assets('./b')

        assert.ok(engine.assets.ball, 'first load must still be present')
        assert.ok(engine.assets.bat,  'second load must be accumulated')
    })
})
