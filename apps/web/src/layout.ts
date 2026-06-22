/**
 * Layout constants for the parenting web dashboard.
 *
 * Per user preference: max-width + auto-margin for symmetric centering,
 * 3-column responsive layout, centered header.
 *
 * These constants are exported so they can be tested and reused in CSS.
 */

export const LAYOUT = {
	/** Maximum content width. Centered via `margin: 0 auto`. */
	maxWidth: 1200,
	/** Page-level padding on small screens. */
	pagePaddingX: 16,
	/** Header height in pixels. */
	headerHeight: 64,
	/** Children panel width in pixels. */
	sidebarWidth: 280,
	/** Standard gap between grid columns. */
	gap: 24,
	/** Min width for the children sidebar before it collapses. */
	breakpointTablet: 768,
	/** Min width for the 3-column layout (header + sidebar + chat). */
	breakpointDesktop: 1024,
} as const;

/** Build the centered-container style for elements that should be max-width constrained. */
export function centeredContainerStyle(width: number = LAYOUT.maxWidth): {
	maxWidth: string;
	marginLeft: string;
	marginRight: string;
	width: string;
} {
	return {
		maxWidth: `${width}px`,
		marginLeft: "auto",
		marginRight: "auto",
		width: "100%",
	};
}

/** Determine the responsive column count for the app-body based on viewport width. */
export function responsiveColumns(viewportWidth: number): 1 | 2 | 3 {
	if (viewportWidth < LAYOUT.breakpointTablet) return 1;
	if (viewportWidth < LAYOUT.breakpointDesktop) return 2;
	return 3;
}

/** Resolve the layout breakpoint name for a given viewport width. */
export type BreakpointName = "mobile" | "tablet" | "desktop";

export function resolveBreakpoint(viewportWidth: number): BreakpointName {
	if (viewportWidth < LAYOUT.breakpointTablet) return "mobile";
	if (viewportWidth < LAYOUT.breakpointDesktop) return "tablet";
	return "desktop";
}

/** Compute the inline-style object for the main app container. */
export function appContainerInlineStyle(): Record<string, string> {
	return {
		maxWidth: `${LAYOUT.maxWidth}px`,
		marginLeft: "auto",
		marginRight: "auto",
		width: "100%",
		minHeight: "100vh",
	};
}

/** Compute the inline-style object for the app-body grid given the column count. */
export function appBodyGridStyle(columns: 1 | 2 | 3): Record<string, string> {
	if (columns === 1) {
		return {
			display: "grid",
			gridTemplateColumns: "1fr",
			gap: `${LAYOUT.gap}px`,
		};
	}
	if (columns === 2) {
		return {
			display: "grid",
			gridTemplateColumns: "1fr",
			gap: `${LAYOUT.gap}px`,
		};
	}
	return {
		display: "grid",
		gridTemplateColumns: `${LAYOUT.sidebarWidth}px 1fr`,
		gap: `${LAYOUT.gap}px`,
	};
}

/** Compute the centered header style. */
export function headerInlineStyle(): Record<string, string> {
	return {
		maxWidth: `${LAYOUT.maxWidth}px`,
		marginLeft: "auto",
		marginRight: "auto",
		width: "100%",
		height: `${LAYOUT.headerHeight}px`,
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: `0 ${LAYOUT.pagePaddingX}px`,
	};
}
