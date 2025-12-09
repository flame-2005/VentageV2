"use node"
export async function fetchHtml(url: string, timeout = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return await res.text();
  } catch {
    clearTimeout(timer);
    return "";
  }
}
