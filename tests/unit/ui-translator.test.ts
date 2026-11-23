import { describe, expect, it } from "vitest";
import { translateText, translateTree } from "../../src/ui-translator";

describe("translateText", () => {
  it("translates exact labels while retaining whitespace", () => {
    expect(translateText("  Overview\n")).toBe("  概览\n");
    expect(translateText("12 episodes")).toBe("12 集");
    expect(translateText("Score: 87%")).toBe("评分：87%");
  });

  it("does not alter unknown or user-provided text", () => {
    expect(translateText("A user-written review")).toBeUndefined();
  });
});

describe("translateTree", () => {
  it("translates visible text and placeholders but not editable content", () => {
    document.body.innerHTML = '<button>Save</button><input placeholder="Search AniList" value="Manga"><textarea>Manga</textarea>';
    translateTree(document);
    expect(document.querySelector("button")?.textContent).toBe("保存");
    expect(document.querySelector("input")?.getAttribute("placeholder")).toBe("搜索 AniList");
    expect(document.querySelector("input")?.getAttribute("value")).toBe("Manga");
    expect(document.querySelector("textarea")?.textContent).toBe("Manga");
  });
});
