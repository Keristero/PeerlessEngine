// Test fixture: scripted asset with an unrecognised asset_type.
// Used to verify that load_scripted_asset throws on unknown types.
export const asset_type = 'hologram'

export default async function() {
    return 'some data'
}
