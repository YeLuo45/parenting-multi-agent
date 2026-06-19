export {
	FinanceAgent,
	createFinanceAgent,
	FINANCE_DISCLAIMER,
} from "./agent.js";

export {
	EDUCATION_FUND_PLANS,
	INSURANCE_TYPES,
	SCHOOL_FEES,
	calculateFundValue,
	estimateTotalEducationCost,
	getEssentialInsurance,
	getInsurance,
	getRecommendedPlan,
	getSchoolFee,
	type EducationFundPlan,
	type FinanceTopic,
	type InsuranceType,
	type SchoolFee,
} from "./knowledge.js";

export const FINANCE_VERSION = "0.1.0";
