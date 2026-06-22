/**
 * Tests for layout utilities (max-width centering, responsive columns).
 */
import { describe, expect, it } from "vitest";
import {
	appBodyGridStyle,
	appContainerInlineStyle,
	centeredContainerStyle,
	headerInlineStyle,
	LAYOUT,
	resolveBreakpoint,
	responsiveColumns,
} from "../src/index.js";

describe("LAYOUT constants", () => {
	it("exports expected max-width", () => {
		expect(LAYOUT.maxWidth).toBe(1200);
	});

	it("exports breakpoints", () => {
		expect(LAYOUT.breakpointTablet).toBe(768);
		expect(LAYOUT.breakpointDesktop).toBe(1024);
	});

	it("exports sidebar width", () => {
		expect(LAYOUT.sidebarWidth).toBe(280);
	});

	it("exports header height", () => {
		expect(LAYOUT.headerHeight).toBe(64);
	});
});

describe("centeredContainerStyle", () => {
	it("returns centered style with default max-width", () => {
		const style = centeredContainerStyle();
		expect(style.maxWidth).toBe("1200px");
		expect(style.marginLeft).toBe("auto");
		expect(style.marginRight).toBe("auto");
		expect(style.width).toBe("100%");
	});

	it("accepts custom max-width", () => {
		const style = centeredContainerStyle(800);
		expect(style.maxWidth).toBe("800px");
		expect(style.marginLeft).toBe("auto");
	});
});

describe("responsiveColumns", () => {
	it("returns 1 column below tablet breakpoint", () => {
		expect(responsiveColumns(320)).toBe(1);
		expect(responsiveColumns(767)).toBe(1);
	});

	it("returns 2 columns at tablet breakpoint and below desktop", () => {
		expect(responsiveColumns(768)).toBe(2);
		expect(responsiveColumns(1023)).toBe(2);
	});

	it("returns 3 columns at desktop breakpoint and above", () => {
		expect(responsiveColumns(1024)).toBe(3);
		expect(responsiveColumns(1920)).toBe(3);
	});

	it("handles edge case at exact breakpoint", () => {
		expect(responsiveColumns(LAYOUT.breakpointTablet)).toBe(2);
		expect(responsiveColumns(LAYOUT.breakpointDesktop)).toBe(3);
	});
});

describe("resolveBreakpoint", () => {
	it("returns mobile for small viewports", () => {
		expect(resolveBreakpoint(320)).toBe("mobile");
		expect(resolveBreakpoint(767)).toBe("mobile");
	});

	it("returns tablet for medium viewports", () => {
		expect(resolveBreakpoint(768)).toBe("tablet");
		expect(resolveBreakpoint(1023)).toBe("tablet");
	});

	it("returns desktop for large viewports", () => {
		expect(resolveBreakpoint(1024)).toBe("desktop");
		expect(resolveBreakpoint(2560)).toBe("desktop");
	});
});

describe("appContainerInlineStyle", () => {
	it("returns max-width centered style", () => {
		const style = appContainerInlineStyle();
		expect(style.maxWidth).toBe("1200px");
		expect(style.marginLeft).toBe("auto");
		expect(style.marginRight).toBe("auto");
		expect(style.width).toBe("100%");
		expect(style.minHeight).toBe("100vh");
	});
});

describe("appBodyGridStyle", () => {
	it("returns 1-column grid for mobile", () => {
		const style = appBodyGridStyle(1);
		expect(style.display).toBe("grid");
		expect(style.gridTemplateColumns).toBe("1fr");
	});

	it("returns 1-column grid for tablet (stacked)", () => {
		const style = appBodyGridStyle(2);
		expect(style.gridTemplateColumns).toBe("1fr");
	});

	it("returns sidebar + content for desktop", () => {
		const style = appBodyGridStyle(3);
		expect(style.gridTemplateColumns).toBe("280px 1fr");
	});

	it("uses standard gap", () => {
		const style = appBodyGridStyle(1);
		expect(style.gap).toBe("24px");
	});
});

describe("headerInlineStyle", () => {
	it("returns centered header style", () => {
		const style = headerInlineStyle();
		expect(style.maxWidth).toBe("1200px");
		expect(style.marginLeft).toBe("auto");
		expect(style.marginRight).toBe("auto");
		expect(style.width).toBe("100%");
		expect(style.height).toBe("64px");
		expect(style.display).toBe("flex");
		expect(style.alignItems).toBe("center");
		expect(style.justifyContent).toBe("space-between");
		expect(style.padding).toBe("0 16px");
	});
});
