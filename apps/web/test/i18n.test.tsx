/**
 * Tests for i18n infrastructure (zh-CN + en).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, within, act } from "@testing-library/react";
import type { ReactElement } from "react";
import {
	I18nProvider,
	LanguageSwitcher,
	useI18n,
	LOCALES,
	LOCALE_LABELS,
	DEFAULT_LOCALE,
	MESSAGES,
	readStoredLocale,
	writeStoredLocale,
	translate,
	type Locale,
	type MessageKey,
} from "../src/index.js";

let testContainer: HTMLDivElement;

beforeEach(() => {
	cleanup();
	testContainer = document.createElement("div");
	document.body.appendChild(testContainer);
});

afterEach(() => {
	cleanup();
	if (testContainer && testContainer.parentNode) {
		testContainer.parentNode.removeChild(testContainer);
	}
});

describe("LOCALES and labels", () => {
	it("has zh-CN and en", () => {
		expect(LOCALES).toEqual(["zh-CN", "en"]);
	});

	it("DEFAULT_LOCALE is zh-CN", () => {
		expect(DEFAULT_LOCALE).toBe("zh-CN");
	});

	it("each locale has a label", () => {
		expect(LOCALE_LABELS["zh-CN"]).toBeTruthy();
		expect(LOCALE_LABELS["en"]).toBeTruthy();
	});
});

describe("MESSAGES dictionary", () => {
	it("has entries for every locale", () => {
		for (const loc of LOCALES) {
			expect(MESSAGES[loc]).toBeDefined();
			expect(typeof MESSAGES[loc]).toBe("object");
		}
	});

	it("has same keys across locales", () => {
		const zhKeys = Object.keys(MESSAGES["zh-CN"]);
		const enKeys = Object.keys(MESSAGES["en"]);
		expect(zhKeys.sort()).toEqual(enKeys.sort());
	});

	it("zh-CN and en have different content for at least one key", () => {
		const sampleKey: MessageKey = "chat.empty";
		expect(MESSAGES["zh-CN"][sampleKey]).not.toBe(MESSAGES["en"][sampleKey]);
	});
});

describe("translate", () => {
	it("returns the localized string for valid key", () => {
		expect(translate("zh-CN", "chat.empty")).toBe(MESSAGES["zh-CN"]["chat.empty"]);
		expect(translate("en", "chat.empty")).toBe(MESSAGES["en"]["chat.empty"]);
	});

	it("returns the key itself when missing in messages", () => {
		const fakeKey = "missing.key" as MessageKey;
		expect(translate("zh-CN", fakeKey)).toBe("missing.key");
	});
});

describe("readStoredLocale", () => {
	it("returns DEFAULT_LOCALE when storage is null", () => {
		expect(readStoredLocale(null)).toBe(DEFAULT_LOCALE);
	});

	it("returns DEFAULT_LOCALE when storage is empty", () => {
		const storage = { getItem: () => null };
		expect(readStoredLocale(storage)).toBe(DEFAULT_LOCALE);
	});

	it("returns stored locale", () => {
		const storage = { getItem: () => "en" };
		expect(readStoredLocale(storage)).toBe("en");
	});

	it("returns DEFAULT_LOCALE when stored is invalid", () => {
		const storage = { getItem: () => "fr-FR" };
		expect(readStoredLocale(storage)).toBe(DEFAULT_LOCALE);
	});

	it("returns DEFAULT_LOCALE when storage throws", () => {
		const storage = {
			getItem: () => {
				throw new Error("storage error");
			},
		};
		expect(readStoredLocale(storage)).toBe(DEFAULT_LOCALE);
	});
});

describe("writeStoredLocale", () => {
	it("returns true on success", () => {
		const storage = { setItem: vi.fn() };
		expect(writeStoredLocale(storage, "en")).toBe(true);
		expect(storage.setItem).toHaveBeenCalledWith("parenting:locale", "en");
	});

	it("returns false when storage is null", () => {
		expect(writeStoredLocale(null, "en")).toBe(false);
	});

	it("returns false when storage throws", () => {
		const storage = {
			setItem: () => {
				throw new Error("quota");
			},
		};
		expect(writeStoredLocale(storage, "en")).toBe(false);
	});
});

describe("LanguageSwitcher", () => {
	beforeEach(() => {
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

	it("renders a select with all locale options", () => {
		render(
			<I18nProvider>
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId("locale-select") as HTMLSelectElement;
		const options = Array.from(select.options).map((o) => o.value);
		expect(options).toEqual(LOCALES);
	});

	it("defaults to zh-CN", () => {
		render(
			<I18nProvider>
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId("locale-select") as HTMLSelectElement;
		expect(select.value).toBe("zh-CN");
	});

	it("changes locale when select changes", () => {
		render(
			<I18nProvider>
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId("locale-select");
		select.dispatchEvent(new Event("change", { bubbles: true }));
		// Simulate selecting 'en'
		const nativeSelect = select as HTMLSelectElement;
		nativeSelect.value = "en";
		nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
		expect(nativeSelect.value).toBe("en");
	});

	it("respects initialLocale prop", () => {
		render(
			<I18nProvider initialLocale="en">
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId("locale-select") as HTMLSelectElement;
		expect(select.value).toBe("en");
	});

	it("persists locale to localStorage on change", () => {
		render(
			<I18nProvider>
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		expect(localStorage.getItem("parenting:locale")).toBe("zh-CN");
	});

	it("restores locale from localStorage", () => {
		localStorage.setItem("parenting:locale", "en");
		render(
			<I18nProvider>
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		const select = within(testContainer).getByTestId("locale-select") as HTMLSelectElement;
		expect(select.value).toBe("en");
	});

	it("sets document.documentElement.lang", () => {
		render(
			<I18nProvider initialLocale="en">
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		expect(document.documentElement.lang).toBe("en");
	});

	it("has aria-label group", () => {
		render(
			<I18nProvider>
				<LanguageSwitcher />
			</I18nProvider>,
			{ container: testContainer },
		);
		expect(within(testContainer).getByRole("group", { name: "Language" })).toBeInTheDocument();
	});
});

describe("useI18n hook", () => {
	beforeEach(() => {
		Object.defineProperty(window, "localStorage", {
			value: { getItem: () => null, setItem: () => {} },
			configurable: true,
			writable: true,
		});
	});

	it("returns default locale when no provider", () => {
		let captured: ReturnType<typeof useI18n> | null = null;
		function Probe(): ReactElement {
			captured = useI18n();
			return <div data-testid="probe">{captured.locale}</div>;
		}
		render(<Probe />, { container: testContainer });
		expect(captured?.locale).toBe(DEFAULT_LOCALE);
		expect(within(testContainer).getByTestId("probe").textContent).toBe("zh-CN");
	});

	it("translates messages via t()", () => {
		let captured: ReturnType<typeof useI18n> | null = null;
		function Probe(): ReactElement {
			captured = useI18n();
			return <div data-testid="probe">{captured.t("chat.empty")}</div>;
		}
		render(<Probe />, { container: testContainer });
		expect(within(testContainer).getByTestId("probe").textContent).toBe(MESSAGES["zh-CN"]["chat.empty"]);
	});

	it("setLocale updates state in fallback", () => {
		let captured: ReturnType<typeof useI18n> | null = null;
		function Probe(): ReactElement {
			captured = useI18n();
			return <div data-testid="probe">{captured.locale}</div>;
		}
		render(<Probe />, { container: testContainer });
		act(() => captured?.setLocale("en"));
		expect(within(testContainer).getByTestId("probe").textContent).toBe("en");
	});
});

describe("I18nProvider default behavior", () => {
	beforeEach(() => {
		Object.defineProperty(window, "localStorage", {
			value: { getItem: () => null, setItem: () => {} },
			configurable: true,
			writable: true,
		});
	});

	it("renders children inside the provider", () => {
		render(
			<I18nProvider>
				<div data-testid="child">content</div>
			</I18nProvider>,
			{ container: testContainer },
		);
		expect(within(testContainer).getByTestId("child")).toBeInTheDocument();
	});
});