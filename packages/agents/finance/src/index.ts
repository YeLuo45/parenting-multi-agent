export {
	createFinanceAgent,
	FINANCE_DISCLAIMER,
	FinanceAgent,
} from "./agent.js";

export {
	calculateFundValue,
	EDUCATION_FUND_PLANS,
	type EducationFundPlan,
	estimateTotalEducationCost,
	type FinanceTopic,
	getEssentialInsurance,
	getInsurance,
	getRecommendedPlan,
	getSchoolFee,
	INSURANCE_TYPES,
	type InsuranceType,
	SCHOOL_FEES,
	type SchoolFee,
} from "./knowledge.js";

export const FINANCE_VERSION = "0.1.0";
