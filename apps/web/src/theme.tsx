/**
 * Theme switching for the parenting web dashboard.
 *
 * Provides 4 variants (light/dark/sepia/nord) via CSS variables on the root
 * element. The current theme is persisted in localStorage so user preference
 * survives reloads. ThemeSwitcher in the Header exposes the choice.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactElement,
	type ReactNode,
} from "react";

export type ThemeName = "light" | "dark" | "sepia" | "nord";

export interface ThemeMeta {
	name: ThemeName;
	label: string;
	/** Short description for tooltip / aria-label */
	description: string;
}

export const THEMES: Record<ThemeName, ThemeMeta> = {
	light: { name: "light", label: "Light", description: "Bright default theme" },
	dark: { name: "dark", label: "Dark", description: "Easy on the eyes at night" },
	sepia: { name: "sepia", label: "Sepia", description: "Warm beige for reading" },
	nord: { name: "nord", label: "Nord", description: "Cool blue-gray palette" },
};

export const THEME_NAMES: ThemeName[] = ["light", "dark", "sepia", "nord"];

export const DEFAULT_THEME: ThemeName = "light";

export interface ThemeContextValue {
	theme: ThemeName;
	setTheme: (next: ThemeName) => void;
	cycle: () => void;
}

const STORAGE_KEY = "parenting:theme";

/** CSS variables applied to :root when a theme is selected. */
export const THEME_VARS: Record<ThemeName, Record<string, string>> = {
	light: {
		"--bg": "#ffffff",
		"--bg-elevated": "#f5f5f7",
		"--bg-hover": "#e8e8ec",
		"--fg": "#1d1d1f",
		"--fg-muted": "#6e6e73",
		"--border": "#d2d2d7",
		"--accent": "#007aff",
		"--accent-fg": "#ffffff",
		"--user-bubble": "#007aff",
		"--agent-bubble": "#f5f5f7",
		"--error": "#ff3b30",
		"--shadow": "rgba(0,0,0,0.08)",
	},
	dark: {
		"--bg": "#000000",
		"--bg-elevated": "#1c1c1e",
		"--bg-hover": "#2c2c2e",
		"--fg": "#f5f5f7",
		"--fg-muted": "#98989d",
		"--border": "#38383a",
		"--accent": "#0a84ff",
		"--accent-fg": "#ffffff",
		"--user-bubble": "#0a84ff",
		"--agent-bubble": "#1c1c1e",
		"--error": "#ff453a",
		"--shadow": "rgba(0,0,0,0.4)",
	},
	sepia: {
		"--bg": "#f4ecd8",
		"--bg-elevated": "#e8dfc6",
		"--bg-hover": "#dccdb0",
		"--fg": "#5b4636",
		"--fg-muted": "#8a7a5e",
		"--border": "#c8b896",
		"--accent": "#a0522d",
		"--accent-fg": "#fdf6e3",
		"--user-bubble": "#a0522d",
		"--agent-bubble": "#e8dfc6",
		"--error": "#a33",
		"--shadow": "rgba(91,70,54,0.15)",
	},
	nord: {
		"--bg": "#2e3440",
		"--bg-elevated": "#3b4252",
		"--bg-hover": "#434c5e",
		"--fg": "#eceff4",
		"--fg-muted": "#9aa5b9",
		"--border": "#4c566a",
		"--accent": "#88c0d0",
		"--accent-fg": "#2e3440",
		"--user-bubble": "#88c0d0",
		"--agent-bubble": "#3b4252",
		"--error": "#bf616a",
		"--shadow": "rgba(0,0,0,0.3)",
	},
};

/** Pure helper: read theme from a Storage-like object. Returns default on miss/error. */
export function readStoredTheme(storage: { getItem: (k: string) => string | null } | null): ThemeName {
	if (!storage) return DEFAULT_THEME;
	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (raw && (THEMES as Record<string, unknown>)[raw]) return raw as ThemeName;
	} catch {
		// ignore
	}
	return DEFAULT_THEME;
}

/** Pure helper: write theme to a Storage-like object. Returns true on success. */
export function writeStoredTheme(
	storage: { setItem: (k: string, v: string) => void } | null,
	theme: ThemeName,
): boolean {
	if (!storage) return false;
	try {
		storage.setItem(STORAGE_KEY, theme);
		return true;
	} catch {
		return false;
	}
}

/** Apply theme CSS variables to a document-like root. */
export function applyTheme(root: { style: { setProperty: (k: string, v: string) => void } }, theme: ThemeName): void {
	const vars = THEME_VARS[theme];
	for (const [k, v] of Object.entries(vars)) {
		root.style.setProperty(k, v);
	}
}

/** Pure helper: next theme in the cycle (light → dark → sepia → nord → light). */
export function nextTheme(theme: ThemeName): ThemeName {
	const idx = THEME_NAMES.indexOf(theme);
	const next = (idx + 1) % THEME_NAMES.length;
	return THEME_NAMES[next];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Hook to read the current theme. Returns null-safe defaults if used outside provider. */
export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (ctx) return ctx;
	// Default no-op fallback (only happens in tests without provider).
	const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
	const setTheme = useCallback((next: ThemeName) => {
		setThemeState(next);
	}, []);
	const cycle = useCallback(() => {
		setThemeState((prev) => nextTheme(prev));
	}, []);
	return useMemo(() => ({ theme, setTheme, cycle }), [theme, setTheme, cycle]);
}

/** Provider that wires theme state + localStorage persistence. */
export function ThemeProvider({
	children,
	initialTheme,
}: {
	children: ReactNode;
	initialTheme?: ThemeName;
}): ReactElement {
	const [theme, setThemeState] = useState<ThemeName>(initialTheme ?? readStoredTheme(typeof window !== "undefined" ? window.localStorage : null));

	const setTheme = useCallback((next: ThemeName) => {
		setThemeState(next);
	}, []);

	/* v8 ignore next 3 */
	const cycle = useCallback(() => {
		setThemeState((prev) => nextTheme(prev));
	}, []);

	useEffect(() => {
		if (typeof document === "undefined") return;
		applyTheme(document.documentElement, theme);
		writeStoredTheme(typeof window !== "undefined" ? window.localStorage : null, theme);
	}, [theme]);

	const value = useMemo(() => ({ theme, setTheme, cycle }), [theme, setTheme, cycle]);
	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** ThemeSwitcher: a dropdown exposing all themes. */
export function ThemeSwitcher(): ReactElement {
	const { theme, setTheme } = useTheme();
	return (
		<div
			className="theme-switcher"
			data-testid="theme-switcher"
			role="group"
			aria-label="Theme"
		>
			<label htmlFor="theme-select" className="sr-only">
				Theme
			</label>
			<select
				id="theme-select"
				data-testid="theme-select"
				value={theme}
				onChange={(e) => setTheme(e.target.value as ThemeName)}
			>
				{THEME_NAMES.map((name) => (
					<option key={name} value={name}>
						{THEMES[name].label}
					</option>
				))}
			</select>
		</div>
	);
}