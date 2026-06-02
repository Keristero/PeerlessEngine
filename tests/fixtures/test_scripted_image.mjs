// Test fixture: scripted image asset that returns a data URL string.
// Intentionally avoids Blob/URL.createObjectURL so it works in Node.js tests.
export const asset_type = 'image'

export default async function() {
    return 'data:image/png;base64,test_pixel'
}
