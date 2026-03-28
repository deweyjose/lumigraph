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
      description: `  ## The target
M42 is a showcase nebula. ## Distance and light
Roughly 1,300 light-years away. ## Deep time
The nebula is young on cosmic scales; the universe is about 13.8 billion years old—figures here are approximate. ## When this light began its journey
Long before recorded history on Earth. ## Your capture
Backyard winter 2025 with modest gear.
${" More context about the capture and why it matters to the reader.".repeat(12)}  `,
    });

    const result = await generatePostWriteupFromInterview(baseContext, {
      targetFocus: "M42",
      captureStory: "Backyard, winter 2025",
      gearTechnique: "",
      processingAngle: "",
      readerTakeaway: "Trapezium cluster",
      tone: "",
    });

    expect(result.description).toMatch(/^## The target/);
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
      description: `  ## The target
Orion Nebula detail. ## Distance and light
About 1,300 light-years. ## Deep time
Star-forming region; cosmic ages are approximate versus a 13.8 Gyr universe. ## When this light began its journey
Ancient Earth eras, illustrative only.
${" Expanded researched context and one Wikipedia URL sentence for the reader.".repeat(10)}  `,
    });

    const result = await expandPostWriteup(
      baseContext,
      "Short draft about the Orion Nebula."
    );

    expect(result.description).toMatch(/^## The target/);
    expect(result.description.length).toBeGreaterThanOrEqual(400);
    expect(generateOpenAIResponsesJsonObjectMock).toHaveBeenCalledOnce();
  });
});
