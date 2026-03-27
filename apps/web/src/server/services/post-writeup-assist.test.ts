import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expandPostWriteup,
  generatePostWriteupFromInterview,
  refinePostWriteup,
} from "./post-writeup-assist";

const { generateOpenAIJsonObjectMock } = vi.hoisted(() => ({
  generateOpenAIJsonObjectMock: vi.fn(),
}));

const { generateOpenAIResponsesJsonObjectMock } = vi.hoisted(() => ({
  generateOpenAIResponsesJsonObjectMock: vi.fn(),
}));

vi.mock("@/server/ai/json", () => ({
  generateOpenAIJsonObject: generateOpenAIJsonObjectMock,
}));

vi.mock("@/server/ai/responses-json", () => ({
  generateOpenAIResponsesJsonObject: generateOpenAIResponsesJsonObjectMock,
}));

const baseContext = {
  title: "M42 Orion Nebula",
  targetName: "M42",
  targetType: "NEBULA",
  description: null,
  captureDate: null,
  bortle: 6,
} as const;

beforeEach(() => {
  generateOpenAIJsonObjectMock.mockReset();
  generateOpenAIResponsesJsonObjectMock.mockReset();
});

describe("generatePostWriteupFromInterview", () => {
  it("returns a trimmed description from model JSON output", async () => {
    generateOpenAIJsonObjectMock.mockResolvedValue({
      description:
        "  A concise write-up for this target that meets minimum length requirements for the generated schema.  ",
    });

    const result = await generatePostWriteupFromInterview(baseContext, {
      targetFocus: "M42",
      captureStory: "Backyard, winter 2025",
      gearTechnique: "",
      processingAngle: "",
      readerTakeaway: "Trapezium cluster",
      tone: "",
    });

    expect(result.description).toMatch(/^A concise write-up/);
    expect(generateOpenAIJsonObjectMock).toHaveBeenCalledOnce();
  });
});

describe("refinePostWriteup", () => {
  it("returns trimmed refined text", async () => {
    generateOpenAIJsonObjectMock.mockResolvedValue({
      description: "  Polished text.  ",
    });

    const result = await refinePostWriteup(
      baseContext,
      "Rough draft text here."
    );

    expect(result.description).toBe("Polished text.");
    expect(generateOpenAIJsonObjectMock).toHaveBeenCalledOnce();
  });
});

describe("expandPostWriteup", () => {
  it("returns trimmed expanded text", async () => {
    generateOpenAIResponsesJsonObjectMock.mockResolvedValue({
      description:
        "  Expanded write-up text with researched object context and a Wikipedia URL.  ",
    });

    const result = await expandPostWriteup(
      baseContext,
      "Short draft about the Orion Nebula."
    );

    expect(result.description).toBe(
      "Expanded write-up text with researched object context and a Wikipedia URL."
    );
    expect(generateOpenAIResponsesJsonObjectMock).toHaveBeenCalledOnce();
  });
});
