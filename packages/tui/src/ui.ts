/**
 * Pure rendering + formatting helpers for the TUI.
 * No I/O, no readline — easily unit-testable in isolation.
 */

export type AnsiColor =
	| "reset"
	| "bold"
	| "dim"
	| "red"
	| "green"
	| "yellow"
	| "blue"
	| "magenta"
	| "cyan"
	| "white";

const COLORS: Record<AnsiColor, string> = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
};

/**
 * Colorize a string only when color is enabled. Returns plain text otherwise
 * so that tests + non-TTY environments stay readable.
 */
export function colorize(text: string, color: AnsiColor, enabled = true): string {
	if (!enabled) return text;
	return `${COLORS[color]}${text}${COLORS.reset}`;
}

export interface ChildTab {
	id: string;
	name: string;
	stage: string;
}

const CHILD_TAB_WIDTH = 16;

/**
 * Render child profiles as a horizontal tab strip with the active child
 * highlighted. Empty list returns a placeholder.
 */
export function renderChildTabs(children: ChildTab[], activeId: string, enabled = true): string {
	if (children.length === 0) return colorize("（无孩子档案）", "dim", enabled);
	const tabs = children.map((c) => {
		const isActive = c.id === activeId;
		const label = `${c.name} (${c.stage})`.padEnd(CHILD_TAB_WIDTH).slice(0, CHILD_TAB_WIDTH);
		return isActive ? colorize(`▸ ${label} ◂`, "cyan", enabled) : `  ${label}  `;
	});
	return tabs.join(" │ ");
}

export interface HistoryEntry {
	question: string;
	answer: string;
	createdAt?: string;
}

export interface HistoryPageOptions {
	page: number; // 1-based
	pageSize: number;
	enabled?: boolean;
}

/**
 * Slice a history list into a single page. Negative page or oversized
 * page numbers fall back to the closest valid value.
 */
export function paginateHistory<T>(items: T[], page: number, pageSize: number): T[] {
	if (pageSize <= 0) return [];
	if (items.length === 0) return [];
	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
	const safePage = Math.min(Math.max(1, page), totalPages);
	const start = (safePage - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

/**
 * Render a single page of history entries with index numbers, the question in
 * bold, and the answer dimmed.
 */
export function renderHistoryPage(
	entries: HistoryEntry[],
	options: HistoryPageOptions,
): string {
	const enabled = options.enabled ?? true;
	const { page, pageSize } = options;
	if (pageSize <= 0) return colorize("（pageSize 必须大于 0）", "red", enabled);
	if (entries.length === 0) return colorize("（暂无历史）", "dim", enabled);
	const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
	const safePage = Math.min(Math.max(1, page), totalPages);
	const pageItems = paginateHistory(entries, safePage, pageSize);
	const lines = pageItems.map((entry, i) => {
		const idx = (safePage - 1) * pageSize + i + 1;
		const q = colorize(`#${idx} Q: ${entry.question}`, "bold", enabled);
		const a = colorize(`     A: ${entry.answer}`, "dim", enabled);
		return `${q}\n${a}`;
	});
	const footer = colorize(
		`— page ${safePage}/${totalPages} (${entries.length} entries, pageSize ${pageSize}) —`,
		"yellow",
		enabled,
	);
	return `${lines.join("\n\n")}\n\n${footer}`;
}

export const TUI_COMMANDS = [
	"/list",
	"/use ",
	"/history",
	"/help",
	"/quit",
	"/clear",
] as const;

export type TuiCommand = (typeof TUI_COMMANDS)[number];

/**
 * Filter the candidate command list by the user's partial input. Used by
 * readline completer + the `/help` autocomplete hint.
 */
export function completeTuiCommand(partial: string): TuiCommand[] {
	if (!partial.startsWith("/")) return [];
	const lower = partial.toLowerCase();
	return TUI_COMMANDS.filter((cmd) => cmd.toLowerCase().startsWith(lower));
}

/**
 * Return the banner that should be printed on exit. Tells the user that the
 * session was cleaned up.
 */
export function renderGoodbye(enabled = true): string {
	return [
		colorize("👋 再见 — 记忆已保存。", "cyan", enabled),
		"",
	].join("\n");
}

/**
 * Clear-screen sequence. Wrapped so tests can stub it and so non-TTY
 * environments (e.g. CI) can disable it.
 */
export const CLEAR_SCREEN = "\x1b[2J\x1b[H";

export function renderClearScreen(enabled = true): string {
	return enabled ? CLEAR_SCREEN : "";
}
