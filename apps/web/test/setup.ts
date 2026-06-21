/**
 * vitest setup — extends vitest with @testing-library/jest-dom matchers
 * and provides a #root element for the React app to mount into.
 */
import "@testing-library/jest-dom/vitest";

// Provide a #root element so main.tsx can mount the React app.
const root = document.createElement("div");
root.id = "root";
document.body.appendChild(root);
