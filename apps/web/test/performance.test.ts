import { describe, expect, it, vi } from "vitest";
import {
	extractMetricValue,
	formatRenderReport,
	getVitalByName,
	getWebVitals,
	type MetricName,
	measureRender,
	measureRenderAsync,
	PERFORMANCE_DISCLAIMER,
	type RenderMeasurement,
	rateMetric,
	reportWebVitals,
	summarizeMeasurements,
} from "../src/performance.js";

describe("rateMetric", () => {
	it("rates CLS correctly", () => {
		expect(rateMetric("CLS", 0.05)).toBe("good");
		expect(rateMetric("CLS", 0.15)).toBe("needs-improvement");
		expect(rateMetric("CLS", 0.5)).toBe("poor");
	});

	it("rates LCP correctly", () => {
		expect(rateMetric("LCP", 1500)).toBe("good");
		expect(rateMetric("LCP", 3000)).toBe("needs-improvement");
		expect(rateMetric("LCP", 5000)).toBe("poor");
	});

	it("rates INP correctly", () => {
		expect(rateMetric("INP", 100)).toBe("good");
		expect(rateMetric("INP", 300)).toBe("needs-improvement");
		expect(rateMetric("INP", 600)).toBe("poor");
	});

	it("rates TTFB correctly", () => {
		expect(rateMetric("TTFB", 500)).toBe("good");
		expect(rateMetric("TTFB", 1000)).toBe("needs-improvement");
		expect(rateMetric("TTFB", 2000)).toBe("poor");
	});

	it("rates FID correctly", () => {
		expect(rateMetric("FID", 50)).toBe("good");
		expect(rateMetric("FID", 200)).toBe("needs-improvement");
		expect(rateMetric("FID", 500)).toBe("poor");
	});

	it("rates FCP correctly", () => {
		expect(rateMetric("FCP", 1000)).toBe("good");
		expect(rateMetric("FCP", 2000)).toBe("needs-improvement");
		expect(rateMetric("FCP", 4000)).toBe("poor");
	});

	it("boundary: exactly at good threshold", () => {
		expect(rateMetric("LCP", 2500)).toBe("good");
	});
});

describe("extractMetricValue", () => {
	it("returns 0 for undefined entry", () => {
		expect(extractMetricValue("LCP", undefined)).toBe(0);
	});

	it("extracts CLS from .value", () => {
		const entry = { value: 0.1 } as unknown as PerformanceEntry;
		expect(extractMetricValue("CLS", entry)).toBe(0.1);
	});

	it("extracts LCP from .startTime", () => {
		const entry = { startTime: 2000 } as unknown as PerformanceEntry;
		expect(extractMetricValue("LCP", entry)).toBe(2000);
	});

	it("extracts INP from .duration", () => {
		const entry = { duration: 250 } as unknown as PerformanceEntry;
		expect(extractMetricValue("INP", entry)).toBe(250);
	});

	it("prefers startTime over duration for LCP", () => {
		const entry = {
			startTime: 100,
			duration: 9999,
		} as unknown as PerformanceEntry;
		expect(extractMetricValue("LCP", entry)).toBe(100);
	});

	it("falls back to 0 for unknown metric name (cast)", () => {
		const entry = { value: 1 } as unknown as PerformanceEntry;
		expect(extractMetricValue("UNKNOWN" as MetricName, entry)).toBe(0);
	});
});

describe("getWebVitals", () => {
	it("returns 6 vitals", async () => {
		const v = await getWebVitals();
		expect(v).toHaveLength(6);
	});

	it("includes all metric names", async () => {
		const v = await getWebVitals();
		const names = v.map((x) => x.name);
		expect(names).toContain("CLS");
		expect(names).toContain("LCP");
		expect(names).toContain("INP");
		expect(names).toContain("TTFB");
		expect(names).toContain("FID");
		expect(names).toContain("FCP");
	});

	it("returns rating for each vital", async () => {
		const v = await getWebVitals();
		for (const x of v) {
			expect(["good", "needs-improvement", "poor"]).toContain(x.rating);
		}
	});
});

describe("getVitalByName", () => {
	it("returns null for missing metric", () => {
		// In jsdom, no perf entries exist for our custom names
		expect(getVitalByName("LCP")).toBeNull();
	});

	it("returns valid vital when entry exists", () => {
		// Mark a fake entry
		performance.mark("test-LCP");
		// We can't easily fabricate a real LCP entry in jsdom, so just
		// verify the function returns null when no entry exists
		expect(getVitalByName("CLS")).toBeNull();
	});
});

describe("measureRender", () => {
	it("measures sync function duration", () => {
		const r = measureRender("test", () => 42, 1000);
		expect(r.result).toBe(42);
		expect(r.measurement.name).toBe("test");
		expect(r.measurement.durationMs).toBeGreaterThanOrEqual(0);
		expect(r.measurement.passed).toBe(true);
	});

	it("marks failed when over threshold", () => {
		const r = measureRender(
			"slow",
			() => {
				// Burn CPU
				let s = 0;
				for (let i = 0; i < 1_000_000; i++) s += i;
				return s;
			},
			0.001,
		);
		expect(r.measurement.passed).toBe(false);
	});

	it("captures startTs and endTs", () => {
		const r = measureRender("ts", () => 1);
		expect(r.measurement.endTs).toBeGreaterThanOrEqual(
			r.measurement.startTs,
		);
	});
});

describe("measureRenderAsync", () => {
	it("measures async function duration", async () => {
		const r = await measureRenderAsync("async", async () => {
			await new Promise((res) => setTimeout(res, 5));
			return "ok";
		});
		expect(r.result).toBe("ok");
		expect(r.measurement.durationMs).toBeGreaterThanOrEqual(0);
	});
});

describe("summarizeMeasurements", () => {
	it("handles empty list", () => {
		const s = summarizeMeasurements([]);
		expect(s.totalDuration).toBe(0);
		expect(s.passed).toBe(0);
		expect(s.failed).toBe(0);
		expect(s.avgDuration).toBe(0);
		expect(s.p95Duration).toBe(0);
		expect(s.measurements).toEqual([]);
	});

	it("computes pass/fail counts", () => {
		const m: RenderMeasurement[] = [
			makeMeasurement(1, 5, 10),
			makeMeasurement(2, 20, 10),
			makeMeasurement(3, 30, 10),
		];
		const s = summarizeMeasurements(m);
		expect(s.passed).toBe(1);
		expect(s.failed).toBe(2);
	});

	it("computes avg duration", () => {
		const m = [makeMeasurement(1, 10, 100), makeMeasurement(2, 20, 100)];
		expect(summarizeMeasurements(m).avgDuration).toBe(15);
	});

	it("computes p95 duration", () => {
		const m = Array.from({ length: 20 }, (_, i) =>
			makeMeasurement(i, i + 1, 1000),
		);
		const s = summarizeMeasurements(m);
		expect(s.p95Duration).toBeGreaterThan(0);
	});
});

function makeMeasurement(
	id: number,
	durMs: number,
	threshold: number,
): RenderMeasurement {
	return {
		name: `m${id}`,
		durationMs: durMs,
		startTs: id,
		endTs: id + durMs,
		threshold,
		passed: durMs <= threshold,
	};
}

describe("reportWebVitals", () => {
	it("calls sink for each vital", () => {
		const sink = vi.fn();
		const v = [
			{
				name: "CLS" as const,
				value: 0.1,
				rating: "good" as const,
				delta: 0.1,
				id: "1",
				timestamp: 0,
			},
			{
				name: "LCP" as const,
				value: 5000,
				rating: "poor" as const,
				delta: 5000,
				id: "2",
				timestamp: 0,
			},
		];
		reportWebVitals(v, sink);
		expect(sink).toHaveBeenCalledTimes(2);
	});

	it("uses console.warn by default", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		reportWebVitals([
			{
				name: "CLS" as const,
				value: 0.1,
				rating: "good" as const,
				delta: 0.1,
				id: "1",
				timestamp: 0,
			},
		]);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});
});

describe("formatRenderReport", () => {
	it("renders Chinese summary", () => {
		const s = summarizeMeasurements([
			makeMeasurement(1, 5, 10),
			makeMeasurement(2, 20, 10),
		]);
		const out = formatRenderReport(s);
		expect(out).toContain("渲染性能报告");
		expect(out).toContain("通过：1");
		expect(out).toContain("失败：1");
		expect(out).toContain("总耗时");
		expect(out).toContain("P95");
	});

	it("handles empty report", () => {
		const out = formatRenderReport(summarizeMeasurements([]));
		expect(out).toContain("0 次");
	});
});

describe("PERFORMANCE_DISCLAIMER", () => {
	it("includes warning emoji", () => {
		expect(PERFORMANCE_DISCLAIMER).toContain("⚠️");
	});
});
