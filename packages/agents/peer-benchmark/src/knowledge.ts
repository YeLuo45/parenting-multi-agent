/**
 * @parenting/agent-peer-benchmark — Privacy-preserving peer percentile
 * comparison with k-anonymity ≥ 5.
 *
 * Direction R: Peer Benchmark (de-identified).
 *
 * Pure functions: no LLM call, no network. Aggregates peer measurements
 * and returns percentile + de-identified cohort statistics.
 */

export type Metric = "height" | "weight" | "head_circumference";
export type Sex = "male" | "female";

export interface PeerMeasurement {
	ageMonths: number;
	value: number;
	sex: Sex;
}

export interface PeerCohortStats {
	metric: Metric;
	ageMonths: number;
	sex: Sex;
	count: number; // >= 5 (k-anonymity)
	mean: number;
	median: number;
	p5: number;
	p25: number;
	p50: number;
	p75: number;
	p95: number;
	min: number;
	max: number;
}

export interface AnonymizedProfile {
	metric: Metric;
	ageMonths: number;
	sex: Sex;
	value: number;
	percentile: number; // 1-99
	cohort: PeerCohortStats;
	comparison: "above" | "at" | "below";
}

export const K_ANONYMITY_MINIMUM = 5;

/** Filter cohort to entries matching the given age window (±3 months). */
export function filterByAgeWindow(
	data: readonly PeerMeasurement[],
	ageMonths: number,
	windowMonths = 3,
): PeerMeasurement[] {
	return data.filter(
		(m) =>
			m.ageMonths >= ageMonths - windowMonths &&
			m.ageMonths <= ageMonths + windowMonths,
	);
}

/** Filter cohort to entries matching the given sex. */
export function filterBySex(
	data: readonly PeerMeasurement[],
	sex: Sex,
): PeerMeasurement[] {
	return data.filter((m) => m.sex === sex);
}

/**
 * Build a de-identified peer cohort for a child profile.
 * Throws if the cohort has fewer than k-anonymity threshold.
 */
export function buildPeerCohort(
	data: readonly PeerMeasurement[],
	metric: Metric,
	ageMonths: number,
	sex: Sex,
): PeerCohortStats {
	const filtered = filterBySex(filterByAgeWindow(data, ageMonths), sex);
	const values = filtered.map((m) => m.value).sort((a, b) => a - b);
	if (values.length === 0) {
		throw new Error("Cohort is empty for given age/sex");
	}
	if (values.length < K_ANONYMITY_MINIMUM) {
		throw new Error(
			`Cohort too small: ${values.length} < ${K_ANONYMITY_MINIMUM} (k-anonymity)`,
		);
	}
	const n = values.length;
	const sum = values.reduce((a, b) => a + b, 0);
	const mean = sum / n;
	const percentile = (p: number): number => {
		const idx = (p / 100) * (n - 1);
		const lo = Math.floor(idx);
		const hi = Math.ceil(idx);
		if (lo === hi) return values[lo]!;
		const frac = idx - lo;
		return values[lo]! * (1 - frac) + values[hi]! * frac;
	};
	return {
		metric,
		ageMonths,
		sex,
		count: n,
		mean,
		median: percentile(50),
		p5: percentile(5),
		p25: percentile(25),
		p50: percentile(50),
		p75: percentile(75),
		p95: percentile(95),
		min: values[0]!,
		max: values[n - 1]!,
	};
}

/**
 * Compute a child's percentile within the peer cohort.
 * Returns a value in [1, 99].
 */
export function computePercentile(
	cohort: readonly PeerMeasurement[],
	value: number,
	ageMonths: number,
	sex: Sex,
): number {
	const filtered = filterBySex(filterByAgeWindow(cohort, ageMonths), sex);
	if (filtered.length === 0) return 50;
	const below = filtered.filter((m) => m.value < value).length;
	const equal = filtered.filter((m) => m.value === value).length;
	// Mid-rank percentile
	const pct = ((below + 0.5 * equal) / filtered.length) * 100;
	return Math.max(1, Math.min(99, Math.round(pct)));
}

/** Compare a child's value to the cohort: above / at / below median. */
export function compareToCohort(
	cohort: PeerCohortStats,
	value: number,
): "above" | "at" | "below" {
	const diff = value - cohort.median;
	const tolerance = (cohort.p75 - cohort.p25) * 0.1 || 0.1;
	if (Math.abs(diff) <= tolerance) return "at";
	return diff > 0 ? "above" : "below";
}

/**
 * Anonymize a child profile into the cohort context. Returns aggregated
 * stats + the child's percentile + comparison to the cohort.
 */
export function anonymizeProfile(
	cohort: readonly PeerMeasurement[],
	metric: Metric,
	value: number,
	ageMonths: number,
	sex: Sex,
): AnonymizedProfile {
	const stats = buildPeerCohort(cohort, metric, ageMonths, sex);
	const percentile = computePercentile(cohort, value, ageMonths, sex);
	const comparison = compareToCohort(stats, value);
	return {
		metric,
		ageMonths,
		sex,
		value,
		percentile,
		cohort: stats,
		comparison,
	};
}

/** Format an anonymized profile as a Chinese privacy-aware block. */
export function formatAnonymizedProfile(profile: AnonymizedProfile): string {
	const c = profile.cohort;
	const cmpZh = {
		above: "高于中位",
		at: "接近中位",
		below: "低于中位",
	}[profile.comparison];
	return [
		`📊 同侪对比（${profile.metric}，${profile.ageMonths} 月，${profile.sex === "male" ? "男" : "女"}）`,
		`样本量：${c.count}（已脱敏，k-anonymity ≥ 5）`,
		`孩子：${profile.value.toFixed(2)}（P${profile.percentile}）`,
		`队列：均值 ${c.mean.toFixed(2)} | 中位 ${c.median.toFixed(2)} | P25 ${c.p25.toFixed(2)} | P75 ${c.p75.toFixed(2)}`,
		`范围：${c.min.toFixed(2)} - ${c.max.toFixed(2)}`,
		`对比：${cmpZh}`,
		"",
		"⚠️ 本数据来自脱敏队列聚合，不包含任何个人标识。",
	].join("\n");
}

/** Synthetic cohort generator (for testing / demo). */
export function generateSyntheticCohort(
	ageMonths: number,
	sex: Sex,
	count: number,
	metric: Metric,
): PeerMeasurement[] {
	// Use simple deterministic baseline + variation
	const base: Record<Metric, number> = {
		height: 50 + ageMonths * 0.95,
		weight: 3.5 + ageMonths * 0.25,
		head_circumference: 35 + ageMonths * 0.35,
	};
	const mu = base[metric];
	const sd = mu * 0.12;
	const out: PeerMeasurement[] = [];
	for (let i = 0; i < count; i++) {
		// Box-Muller approximation
		const u1 = (((i * 73 + 17) % 1000) + 1) / 1000;
		const u2 = ((i * 131 + 41) % 1000) / 1000;
		const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
		const value = mu + z * sd;
		out.push({
			ageMonths: ageMonths + (i % 7) - 3, // spread ±3
			value: Math.max(0, value),
			sex,
		});
	}
	return out;
}
