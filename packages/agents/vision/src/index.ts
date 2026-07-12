/**
 * @parenting/agent-vision — Multimodal image analysis.
 *
 * Direction U4: Multimodal 截图识别.
 */

export {
	classifyMilestone,
	createVisionService,
	extractText,
	HeuristicVisionProvider,
	imageBytesFromDataUrl,
	imageHash,
	LlmVisionProvider,
	MAX_IMAGE_BYTES,
	MockVisionProvider,
	OcrVisionProvider,
	SUPPORTED_MIME_TYPES,
	VISION_DISCLAIMER,
	type VisionInput,
	type VisionProvider,
	type VisionProviderId,
	type VisionResult,
	VisionService,
	validateImageInput,
} from "./vision.js";

export const VISION_VERSION = "0.1.0";
