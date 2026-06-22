/**
 * Tests for theme switching (light/dark/sepia/nord).
 */

import {
	act,
	cleanup,
	fireEvent,
	render,
	within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyTheme,
	DEFAULT_THEME,
	nextTheme,
	readStoredTheme,
	THEME_NAMES,
	THEME_VARS,
	THEMES,
	ThemeProvider,
	ThemeSwitcher,
	useTheme,
	writeStoredTheme,
} from "../src/index.js";

let testContainer: HTMLDivElement;

beforeEach(() => {
	cleanup();
	// Create a fresh container for each test to avoid DOM accumulation
	testContainer = document.createElement("div");
	document.body.appendChild(testContainer);
});

afterEach(() => {
	cleanup();
	if (testContainer?.parentNode) {
		testContainer.parentNode.removeChild(testContainer);
	}
});

describe("THEMES and THEME_NAMES", () => {
	it("contains all 4 themes", () => {
		expect(THEME_NAMES).toEqual(["light", "dark", "sepia", "nord"]);
	});

	it("each theme has name/label/description", () => {
		for (const name of THEME_NAMES) {
			const meta = THEMES[name];
			expect(meta.name).toBe(name);
			expect(meta.label).toBeTruthy();
			expect(meta.description).toBeTruthy();
		}
	});

	it("DEFAULT_THEME is light", () => {
		expect(DEFAULT_THEME).toBe("light");
	});

	it("THEME_VARS provides CSS variables for each theme", () => {
		for (const name of THEME_NAMES) {
			const vars = THEME_VARS[name];
			expect(vars["--bg"]).toBeTruthy();
			expect(vars["--fg"]).toBeTruthy();
			expect(vars["--accent"]).toBeTruthy();
		}
	});

	it("different themes have different backgrounds", () => {
		expect(THEME_VARS.light["--bg"]).not.toBe(THEME_VARS.dark["--bg"]);
		expect(THEME_VARS.sepia["--bg"]).not.toBe(THEME_VARS.nord["--bg"]);
	});
});

describe("nextTheme", () => {
	it("cycles through themes in order", () => {
		expect(nextTheme("light")).toBe("dark");
		expect(nextTheme("dark")).toBe("sepia");
		expect(nextTheme("sepia")).toBe("nord");
		expect(nextTheme("nord")).toBe("light");
	});
});

describe("readStoredTheme", () => {
	it("returns DEFAULT_THEME when storage is null", () => {
		expect(readStoredTheme(null)).toBe(DEFAULT_THEME);
	});

	it("returns DEFAULT_THEME when storage is empty", () => {
		const storage = { getItem: () => null };
		expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
	});

	it("returns stored valid theme", () => {
		const storage = { getItem: () => "dark" };
		expect(readStoredTheme(storage)).toBe("dark");
	});

	it("returns DEFAULT_THEME when stored value is invalid", () => {
		const storage = { getItem: () => "invalid-theme" };
		expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
	});

	it("returns DEFAULT_THEME when storage throws", () => {
		const storage = {
			getItem: () => {
				throw new Error("storage error");
			},
		};
		expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
	});
});

describe("writeStoredTheme", () => {
	it("returns true on success", () => {
		const storage = { setItem: vi.fn() };
		expect(writeStoredTheme(storage, "dark")).toBe(true);
		expect(storage.setItem).toHaveBeenCalledWith("parenting:theme", "dark");
	});

	it("returns false when storage is null", () => {
		expect(writeStoredTheme(null, "dark")).toBe(false);
	});

	it("returns false when storage throws", () => {
		const storage = {
			setItem: () => {
				throw new Error("quota exceeded");
			},
		};
		expect(writeStoredTheme(storage, "dark")).toBe(false);
	});
});

describe("applyTheme", () => {
	it("sets all CSS variables on the root", () => {
		const setProperty = vi.fn();
		const root = { style: { setProperty } };
		applyTheme(root, "dark");
		expect(setProperty).toHaveBeenCalledWith(
			"--bg",
			THEME_VARS.dark["--bg"],
		);
		expect(setProperty).toHaveBeenCalledWith(
			"--fg",
			THEME_VARS.dark["--fg"],
		);
		expect(setProperty).toHaveBeenCalledWith(
			"--accent",
			THEME_VARS.dark["--accent"],
		);
	});

	it("works with all theme names", () => {
		for (const name of THEME_NAMES) {
			const setProperty = vi.fn();
			const root = { style: { setProperty } };
			applyTheme(root, name);
			expect(setProperty).toHaveBeenCalledWith(
				"--bg",
				THEME_VARS[name]["--bg"],
			);
		}
	});
});

describe("ThemeSwitcher", () => {
	beforeEach(() => {
		// Stub localStorage for each test
		const store: Record<string, string> = {};
		Object.defineProperty(window, "localStorage", {
			value: {
				getItem: (k: string) => store[k] ?? null,
				setItem: (k: string, v: string) => {
					store[k] = v;
				},
			},
			configurable: true,
			writable: true,
		});
	});

	it("renders a select with all theme options", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId(
			"theme-select",
		) as HTMLSelectElement;
		const options = Array.from(select.options).map((o) => o.value);
		expect(options).toEqual(THEME_NAMES);
	});

	it("defaults to light theme", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId(
			"theme-select",
		) as HTMLSelectElement;
		expect(select.value).toBe("light");
	});

	it("changes theme when select value changes", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId("theme-select");
		fireEvent.change(select, { target: { value: "dark" } });
		expect((select as HTMLSelectElement).value).toBe("dark");
	});

	it("respects initialTheme prop", () => {
		render(
			<ThemeProvider initialTheme="sepia">
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId(
			"theme-select",
		) as HTMLSelectElement;
		expect(select.value).toBe("sepia");
	});

	it("applies theme to document.documentElement", () => {
		render(
			<ThemeProvider initialTheme="dark">
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		const bg = document.documentElement.style.getPropertyValue("--bg");
		expect(bg).toBe(THEME_VARS.dark["--bg"]);
	});

	it("persists theme to localStorage", () => {
		render(
			<ThemeProvider initialTheme="nord">
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		expect(localStorage.getItem("parenting:theme")).toBe("nord");
	});

	it("restores theme from localStorage on mount", () => {
		localStorage.setItem("parenting:theme", "sepia");
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId(
			"theme-select",
		) as HTMLSelectElement;
		expect(select.value).toBe("sepia");
	});

	it("has aria-label group", () => {
		render(
			<ThemeProvider>
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		expect(
			within(testContainer).getByRole("group", { name: "Theme" }),
		).toBeInTheDocument();
	});
});

describe("ThemeProvider default behavior", () => {
	beforeEach(() => {
		Object.defineProperty(window, "localStorage", {
			value: {
				getItem: () => null,
				setItem: () => {},
			},
			configurable: true,
			writable: true,
		});
	});

	it("renders children inside the provider", () => {
		render(
			<ThemeProvider>
				<div data-testid="child-content">content</div>
			</ThemeProvider>,
			{ container: testContainer },
		);
		expect(
			within(testContainer).getByTestId("child-content"),
		).toBeInTheDocument();
	});

	it("applies CSS vars to document on mount", () => {
		render(
			<ThemeProvider initialTheme="dark">
				<div>content</div>
			</ThemeProvider>,
			{ container: testContainer },
		);
		const accent =
			document.documentElement.style.getPropertyValue("--accent");
		expect(accent).toBe(THEME_VARS.dark["--accent"]);
	});

	it("uses initialTheme when provided", () => {
		render(
			<ThemeProvider initialTheme="sepia">
				<ThemeSwitcher />
			</ThemeProvider>,
			{ container: testContainer },
		);
		expect(
			(
				within(testContainer).getByTestId(
					"theme-select",
				) as HTMLSelectElement
			).value,
		).toBe("sepia");
	});
});

describe("useTheme fallback (used outside provider)", () => {
	it("returns default theme when no provider", () => {
		let captured: ReturnType<typeof useTheme> | null = null;
		function Probe(): ReactElement {
			captured = useTheme();
			return <div data-testid="probe" />;
		}
		render(<Probe />, { container: testContainer });
		expect(captured?.theme).toBe(DEFAULT_THEME);
	});

	it("setTheme updates state in fallback", () => {
		let captured: ReturnType<typeof useTheme> | null = null;
		function Probe(): ReactElement {
			captured = useTheme();
			return <div data-testid="probe">{captured.theme}</div>;
		}
		render(<Probe />, { container: testContainer });
		act(() => captured?.setTheme("dark"));
		expect(within(testContainer).getByTestId("probe").textContent).toBe(
			"dark",
		);
	});

	it("cycle advances theme in fallback", () => {
		let captured: ReturnType<typeof useTheme> | null = null;
		function Probe(): ReactElement {
			captured = useTheme();
			return <div data-testid="probe">{captured.theme}</div>;
		}
		render(<Probe />, { container: testContainer });
		act(() => captured?.cycle());
		expect(within(testContainer).getByTestId("probe").textContent).toBe(
			"dark",
		);
		act(() => captured?.cycle());
		expect(within(testContainer).getByTestId("probe").textContent).toBe(
			"sepia",
		);
	});
});
