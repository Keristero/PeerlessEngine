
/**
 * Strips the base_folder prefix from file_path and removes the file extension
 * from the last segment, returning an array of key parts used to build the
 * nested structure in engine.assets.
 *
 * parse_asset_key_path('./assets', '/assets/sounds/bounce.mp3')
 *   → ['sounds', 'bounce']
 */
export function parse_asset_key_path(base_folder, file_path) {
    const norm = (p) => {
        p = p.replace(/^\.\//, '')   // strip leading ./
        if (!p.startsWith('/')) p = '/' + p
        return p.replace(/\/$/, '')  // strip trailing /
    }
    const base = norm(base_folder)
    const file = norm(file_path)

    let relative = file
    if (file.startsWith(base + '/')) {
        relative = file.slice(base.length + 1)
    }

    const parts = relative.split('/').filter(Boolean)
    if (parts.length > 0) {
        parts[parts.length - 1] = parts[parts.length - 1].replace(/\.[^.]+$/, '')
    }
    return parts
}

/**
 * Sets obj[parts[0]][parts[1]]...[parts[n]] = value,
 * creating intermediate plain objects as needed.
 */
export function set_nested(obj, parts, value) {
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
            cur[parts[i]] = {}
        }
        cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
}

export function setup_asset_loader(engine) {
    engine.assets = {}

    /**
     * Load a URL as an HTMLImageElement.
     * @param {string} src
     * @returns {Promise<HTMLImageElement>}
     */
    engine.load_image_asset = function(src) {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload  = () => resolve(img)
            img.onerror = (e) => reject(e)
            img.src = src
        })
    }

    /**
     * Load a URL as an HTMLAudioElement.
     * @param {string} src
     * @returns {Promise<HTMLAudioElement>}
     */
    engine.load_audio_asset = function(src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src)
            audio.addEventListener('canplaythrough', () => resolve(audio), { once: true })
            audio.addEventListener('error', reject, { once: true })
            audio.load()
        })
    }

    /**
     * Fetch a URL and return its text content.
     * @param {string} url
     * @returns {Promise<string>}
     */
    engine.load_text_asset = async function(url) {
        const res = await fetch(url)
        return res.text()
    }

    /**
     * Import a scripted asset (.mjs) module.  The module must export:
     *   - asset_type: 'image' | 'audio' | 'text'
     *   - default: async function() → Blob | string
     *
     * The raw data returned by default() is forwarded to the matching
     * engine.load_*_asset function.  A Blob is converted to an object URL
     * first; a string is passed through directly (data URL, SVG, etc.).
     *
     * @param {string} module_url
     * @returns {Promise<HTMLImageElement|HTMLAudioElement|string>}
     */
    engine.load_scripted_asset = async function(module_url) {
        const { default: get_data, asset_type } = await import(module_url)
        if (typeof get_data !== 'function' || !asset_type) {
            throw new Error(`Scripted asset must export a default function and asset_type: ${module_url}`)
        }

        const raw = await get_data()

        // Blob → object URL so the load functions receive a usable string src.
        let src = raw
        if (typeof Blob !== 'undefined' && raw instanceof Blob) {
            src = URL.createObjectURL(raw)
        }

        if (asset_type === 'image') return engine.load_image_asset(src)
        if (asset_type === 'audio') return engine.load_audio_asset(src)
        if (asset_type === 'text')  return typeof raw === 'string' ? raw : raw.text()
        throw new Error(`Unknown asset_type: "${asset_type}" in ${module_url}`)
    }

    /**
     * Scan folder_path for image, audio, text, and scripted (.mjs) asset files.
     * All loads run in parallel via Promise.all.  Folder hierarchy is preserved
     * in engine.assets so that breakout_assets/sounds/bounce.mp3 becomes
     * engine.assets.sounds.bounce.  Existing keys are never cleared — calling
     * this multiple times (e.g. once for engine assets, once for game assets)
     * accumulates into the same engine.assets object.
     *
     * Missing or inaccessible directories are silently skipped.
     *
     * @param {string} folder_path
     */
    engine.find_and_load_assets = async function(folder_path) {
        const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
        const AUDIO_EXTS = ['.mp3', '.ogg', '.wav']
        const TEXT_EXTS  = ['.txt', '.json']
        const SCRIPT_EXT = '.mjs'

        const probe = await fetch(folder_path)
        if (!probe.ok) return

        const scan = (ext) => engine.recursive_directory_scan(folder_path, ext, 3)

        const [image_files, audio_files, text_files, script_files] = await Promise.all([
            Promise.all(IMAGE_EXTS.map(scan)).then(arrs => arrs.flat()),
            Promise.all(AUDIO_EXTS.map(scan)).then(arrs => arrs.flat()),
            Promise.all(TEXT_EXTS.map(scan)).then(arrs => arrs.flat()),
            scan(SCRIPT_EXT),
        ])

        const store = (file, asset) =>
            set_nested(engine.assets, parse_asset_key_path(folder_path, file), asset)
        const warn = (label, file) => (e) =>
            console.warn(`Failed to load ${label}: ${file}`, e)

        await Promise.all([
            ...image_files.map(f =>
                engine.load_image_asset(f).then(a => store(f, a)).catch(warn('image', f))),
            ...audio_files.map(f =>
                engine.load_audio_asset(f).then(a => store(f, a)).catch(warn('audio', f))),
            ...text_files.map(f =>
                engine.load_text_asset(f).then(a => store(f, a)).catch(warn('text', f))),
            ...script_files.map(f =>
                engine.load_scripted_asset(f).then(a => store(f, a)).catch(warn('scripted asset', f))),
        ])
    }
}

