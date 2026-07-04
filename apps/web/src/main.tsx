/**
 * parenting Web Dashboard — React 19 entry.
 *
 * Architecture: this file wires the real parenting view (src/view.tsx) into
 * Vite's DOM. The view is intentionally a pure render function that takes
 * state + dispatch so the same code can be unit-tested without jsdom.
 */
import { loadDotenv } from "./dotenv.js";
import { createRoot } from "react-dom/client";
import { WEB_VERSION } from "./version.js";
import { createParentingApp } from "./view.js";
import "./styles.css";

/* v8 ignore next */
async function mount(): Promise<void> {
	await loadDotenv();
	/* v8 ignore next 8 */
	const root = document.getElementById("root");
	if (!root) {
		throw new Error("#root element not found");
	}
	const { App } = createParentingApp();
	createRoot(root).render(<App />);
}

/* v8 ignore next 4 */
if (typeof document !== "undefined") {
	void mount();
}

export { WEB_VERSION };
