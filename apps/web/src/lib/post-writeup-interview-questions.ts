/**
 * Fixed interview steps for AI-assisted post write-ups (#93).
 * Keep IDs stable: they are sent to the API and embedded in prompts.
 */
export const WRITEUP_INTERVIEW_QUESTION_IDS = [
  "targetFocus",
  "captureStory",
  "gearTechnique",
  "processingAngle",
  "readerTakeaway",
  "tone",
] as const;

export type WriteupInterviewQuestionId =
  (typeof WRITEUP_INTERVIEW_QUESTION_IDS)[number];

export type WriteupInterviewQuestion = {
  id: WriteupInterviewQuestionId;
  /** Short heading shown in the wizard */
  title: string;
  /** Extra guidance under the field */
  helper?: string;
  placeholder: string;
  required: boolean;
};

export const WRITEUP_INTERVIEW_QUESTIONS: WriteupInterviewQuestion[] = [
  {
    id: "targetFocus",
    title: "What is the main subject?",
    helper:
      "Name the target or scene (object, constellation region, phenomenon).",
    placeholder: "e.g. M31 Andromeda Galaxy — integrated halo and dust lanes",
    required: true,
  },
  {
    id: "captureStory",
    title: "Where and when did you capture it?",
    helper: "Location type, travel context, and approximate date or season.",
    placeholder:
      "e.g. Bortle 4 dark site in Utah, new moon weekend, March 2025",
    required: true,
  },
  {
    id: "gearTechnique",
    title: "What gear or capture approach matters?",
    helper:
      "Optional. Telescope/lens, camera, mount, filters, integration idea.",
    placeholder: "e.g. 80mm refractor, OSC camera, ~3h total integration",
    required: false,
  },
  {
    id: "processingAngle",
    title: "How did you process it — or what was tricky?",
    helper:
      "Optional. Calibration/stacking notes, noise challenges, artistic choices.",
    placeholder:
      "e.g. Gradient removal under light pollution; gentle star reduction",
    required: false,
  },
  {
    id: "readerTakeaway",
    title: "What should viewers notice first?",
    helper: "The one idea you want the image to communicate.",
    placeholder:
      "e.g. Dust lanes emerging from the core without overcooking color",
    required: true,
  },
  {
    id: "tone",
    title: "What tone should the write-up use?",
    helper: "Optional. Guides voice and vocabulary.",
    placeholder:
      "e.g. concise and technical / warm storytelling / beginner-friendly",
    required: false,
  },
];

export const WRITEUP_REQUIRED_QUESTION_IDS = WRITEUP_INTERVIEW_QUESTIONS.filter(
  (q) => q.required
).map((q) => q.id);
