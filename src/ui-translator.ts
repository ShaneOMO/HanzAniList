import { dynamicTranslations, uiDictionary } from "./ui-dictionary";

const skippedTags = new Set(["CODE", "INPUT", "NOSCRIPT", "PRE", "SCRIPT", "STYLE", "TEXTAREA"]);

const caseInsensitiveDictionary = new Map(
  Object.entries(uiDictionary).map(([key, value]) => [key.toLocaleLowerCase("en"), value]),
);

export function translateText(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const trimmed = raw.replace(/\s+/g, " ");
  const translated = uiDictionary[trimmed]
    ?? caseInsensitiveDictionary.get(trimmed.toLocaleLowerCase("en"))
    ?? caseInsensitiveDictionary.get(trimmed.replace(/:$/, "").toLocaleLowerCase("en"));
  if (translated) return value.replace(raw, trimmed.endsWith(":") ? `${translated}：` : translated);
  for (const [pattern, replacement] of dynamicTranslations) {
    if (pattern.test(trimmed)) return value.replace(raw, trimmed.replace(pattern, replacement));
  }
  return undefined;
}

export function translateTree(root: ParentNode): void {
  const ownerDocument = root.nodeType === 9 ? root as Document : root.ownerDocument;
  if (!ownerDocument) return;
  const walkRoot = root.nodeType === 9 ? (root as Document).body : root;
  if (!walkRoot) return;
  const walker = ownerDocument.createTreeWalker(walkRoot, 4);
  const changes: Array<{ node: Text; value: string }> = [];
  let current = walker.nextNode() as Text | null;
  while (current) {
    const parent = current.parentElement;
    if (parent && !skippedTags.has(parent.tagName) && !parent.closest(".hanz-tooltip")) {
      const translated = translateText(current.data);
      if (translated && translated !== current.data) changes.push({ node: current, value: translated });
    }
    current = walker.nextNode() as Text | null;
  }
  for (const change of changes) change.node.data = change.value;

  const selector = "input[placeholder], textarea[placeholder], [aria-label]";
  const elements = [
    ...(root instanceof Element && root.matches(selector) ? [root] : []),
    ...root.querySelectorAll(selector),
  ];
  for (const element of elements) {
    for (const attribute of ["placeholder", "aria-label"]) {
      const value = element.getAttribute(attribute);
      const translated = value ? translateText(value) : undefined;
      if (translated) element.setAttribute(attribute, translated.trim());
    }
  }
}
