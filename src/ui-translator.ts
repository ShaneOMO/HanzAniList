import { dynamicTranslations, uiDictionary } from "./ui-dictionary";

const skippedTags = new Set(["CODE", "INPUT", "NOSCRIPT", "PRE", "SCRIPT", "STYLE", "TEXTAREA"]);

export function translateText(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const translated = uiDictionary[trimmed] ?? uiDictionary[trimmed.replace(/:$/, "")];
  if (translated) return value.replace(trimmed, trimmed.endsWith(":") ? `${translated}：` : translated);
  for (const [pattern, replacement] of dynamicTranslations) {
    if (pattern.test(trimmed)) return value.replace(trimmed, trimmed.replace(pattern, replacement));
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

  const elements = root.querySelectorAll("input[placeholder], textarea[placeholder]");
  for (const element of elements) {
    const placeholder = element.getAttribute("placeholder");
    const translated = placeholder ? uiDictionary[placeholder.trim()] : undefined;
    if (translated) element.setAttribute("placeholder", translated);
  }
}
