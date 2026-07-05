/**
 * Minimal service worker for the parenting multi-agent web app.
 *
 *  - Pre-cache the app shell (HTML, JS, CSS, icons) on install
 *  - Cache-first for same-origin GET requests (assets, hash routes)
 *  - Network-first for everything else (the workbench state is
 *    in localStorage/IDB, so this only protects the asset bundle)
 *  - Drop stale entries on activate so a deploy invalidates the
 *    previous cache version.
 */
/* eslint-disable no-restricted-globals */
const CACHE_VERSION = "parenting-shell-v1";
const SHELL = [
	"./",
	"./index.html",
	"./manifest.webmanifest",
	"./favicon.svg",
	"./icon-192.png",
	"./icon-512.png",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_VERSION);
			try {
				await cache.addAll(SHELL);
			} catch {
				// Best-effort: missing icons are fine.
			}
			await self.skipWaiting();
		})(),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			await Promise.all(
				names
					.filter((name) => name !== CACHE_VERSION)
					.map((name) => caches.delete(name)),
			);
			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_VERSION);
			const cached = await cache.match(request);
			if (cached) {
				// Refresh in the background; return cached immediately.
				event.waitUntil(
					fetch(request)
						.then((response) => cache.put(request, response.clone()))
						.catch(() => undefined),
				);
				return cached;
			}
			try {
				const response = await fetch(request);
				if (response.ok) {
					cache.put(request, response.clone()).catch(() => undefined);
				}
				return response;
			} catch {
				return new Response("Offline", { status: 503, statusText: "offline" });
			}
		})(),
	);
});
