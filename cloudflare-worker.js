export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const asset = await env.ASSETS.fetch(request)

    // Anything the asset layer can serve wins (JS, CSS, images, favicon).
    if (asset.status !== 404) return asset
    if (request.method !== 'GET' && request.method !== 'HEAD') return asset

    // SPA routing: unknown paths render the client app.
    const fallback = new URL('/index.html', url)
    return env.ASSETS.fetch(new Request(fallback, { method: 'GET', headers: request.headers }))
  },
}
