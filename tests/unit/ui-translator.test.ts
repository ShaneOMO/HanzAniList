import { describe, expect, it } from "vitest";
import { translateText, translateTree } from "../../src/ui-translator";

describe("translateText", () => {
  it("translates exact labels while retaining whitespace", () => {
    expect(translateText("  Overview\n")).toBe("  概览\n");
    expect(translateText("home")).toBe("首页");
    expect(translateText("\n\t\t\t\tanime list\n\t\t\t")).toBe("\n\t\t\t\t动画列表\n\t\t\t");
    expect(translateText("1d\u00a07h  31m")).toBe("1天 7小时 31分");
    expect(translateText("1d")).toBe("1天");
    expect(translateText("7h")).toBe("7小时");
    expect(translateText("31m")).toBe("31分");
    expect(translateText("12 episodes")).toBe("12 集");
    expect(translateText("Score: 87%")).toBe("评分：87%");
    expect(translateText("Anime in Progress")).toBe("正在观看的动画");
    expect(translateText("Genres & Tags")).toBe("类型与标签");
    expect(translateText("Adventure")).toBe("冒险");
    expect(translateText("South Korea")).toBe("韩国");
    expect(translateText("Follows")).toBe("关注动态");
    expect(translateText("4 hours ago")).toBe("4 小时前");
    expect(translateText("Read chapter 1 - 64 of")).toBe("阅读了第 1–64 话：");
    expect(translateText("Watched episode 8 of Example")).toBe("观看了《Example》第 8 集");
    expect(translateText("1d 7h 47m")).toBe("1天 7小时 47分");
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

  it("translates attributes when the input itself is the update root", () => {
    const input = document.createElement("input");
    input.placeholder = "Filter";
    input.setAttribute("aria-label", "Search");
    translateTree(input);
    expect(input.placeholder).toBe("筛选");
    expect(input.getAttribute("aria-label")).toBe("搜索");
  });
});
