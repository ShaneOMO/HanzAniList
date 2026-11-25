const apiUrl = "https://api.bgm.tv/v0/search/subjects";

export function normalizeTitle(value = "") {
  const numerals = { "一": "1", "二": "2", "两": "2", "三": "3", "四": "4", "五": "5", "六": "6", "七": "7", "八": "8", "九": "9", "十": "10" };
  return value.normalize("NFKC").toLocaleLowerCase()
    .replace(/(\d+)(?:st|nd|rd|th)\s*season/g, "第$1期")
    .replace(/(?:シーズン|season)\s*(\d+)/g, "第$1期")
    .replace(/第\s*([一二两三四五六七八九十])\s*期/g, (_, number) => `第${numerals[number]}期`)
    .replace(/[\s\-_~!！?？:：;；,，.。'’'\"“”()（）\[\]【】]/g, "");
}

export function selectBangumiMatch(media, subjects) {
  const originals = [media.title?.native, media.title?.romaji, media.title?.english]
    .filter(Boolean)
    .map(normalizeTitle);
  const expectedType = media.type === "ANIME" ? 2 : 1;
  const year = media.startDate?.year;
  const candidates = subjects.filter((subject) => subject.type === expectedType && subject.name_cn?.trim());
  const scored = candidates.map((subject) => {
    const names = [subject.name, subject.name_cn].map(normalizeTitle);
    const exact = names.some((name) => originals.includes(name));
    const subjectYear = Number(subject.date?.slice(0, 4)) || undefined;
    const yearMatch = year && subjectYear === year;
    return { subject, exact, yearMatch, score: (exact ? 100 : 0) + (yearMatch ? 20 : 0) };
  }).filter((candidate) => candidate.exact);
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || (scored.length > 1 && !best.yearMatch)) return undefined;
  return best.subject;
}

export async function searchBangumi(media, fetchImpl = fetch) {
  const keywords = [media.title?.native, media.title?.romaji, media.title?.english].filter(Boolean);
  for (const keyword of keywords) {
    const response = await fetchImpl(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "HanzAniList/0.1 (https://github.com/ShaneOMO/HanzAniList)",
      },
      body: JSON.stringify({
        keyword,
        sort: "match",
        filter: { type: [media.type === "ANIME" ? 2 : 1] },
      }),
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After")) || 5;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`Bangumi HTTP ${response.status}`);
    const result = await response.json();
    const match = selectBangumiMatch(media, result.data ?? []);
    if (match) return match;
  }
  return undefined;
}
