import { describe, expect, it } from "vitest";
import { parseModelList } from "../src/lib/models";

describe("model list parsing", () => {
  it("parses and sorts the OpenAI models response", () => {
    expect(
      parseModelList({
        object: "list",
        data: [{ id: "gpt-5" }, { id: "gpt-4.1" }, { id: "gpt-5" }],
      }),
    ).toEqual(["gpt-4.1", "gpt-5"]);
  });

  it("supports a common compatible models array", () => {
    expect(parseModelList({ models: [{ name: "model-b" }, "model-a"] })).toEqual([
      "model-a",
      "model-b",
    ]);
  });

  it("rejects empty or invalid responses", () => {
    expect(() => parseModelList({ data: [] })).toThrow("没有返回可用模型");
    expect(() => parseModelList(null)).toThrow("返回格式不正确");
  });
});
