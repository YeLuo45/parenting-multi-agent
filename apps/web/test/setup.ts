/**
 * vitest setup — extends vitest with @testing-library/jest-dom matchers
 * and provides a #root element for the React app to mount into.
 * Guarded so it still runs cleanly when a per-file directive (e.g.
 * `// @vitest-environment node`) flips the environment away from jsdom.
 */
import "@testing-library/jest-dom/vitest";

// Provide a #root element so main.tsx can mount the React app.
if (typeof document !== "undefined") {
	const root = document.createElement("div");
	root.id = "root";
	document.body.appendChild(root);
}
