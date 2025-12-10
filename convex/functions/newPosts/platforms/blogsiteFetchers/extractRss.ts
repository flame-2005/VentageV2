export function extractRSSLinks(html: string, baseUrl: string): string[] {
  try {
    const feeds: string[] = [];

    // Use regex to extract RSS/Atom feed links (works in Node.js without external deps)
    const linkRegex = /<link[^>]*type=["'](application\/rss\+xml|application\/atom\+xml)["'][^>]*>/gi;
    const hrefRegex = /href=["']([^"']+)["']/i;

    const matches = html.match(linkRegex);
    
    if (matches) {
      for (const linkTag of matches) {
        const hrefMatch = linkTag.match(hrefRegex);
        if (hrefMatch && hrefMatch[1]) {
          const href = hrefMatch[1];
          try {
            const feedUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
            feeds.push(feedUrl);
          } catch (error) {
            console.warn(`Failed to parse feed URL: ${href}`, error);
          }
        }
      }
    }

    // Fallback guesses
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const guesses = [
      'feed', 
      'rss', 
      'atom', 
      'feed.xml', 
      'rss.xml', 
      'atom.xml',
      'index.xml',
      'feeds/posts/default'  // Common for Blogger
    ].map(p => `${normalizedBase}/${p}`);
    
    return [...feeds, ...guesses];
  } catch (error) {
    console.error('Error extracting RSS links:', error);
    
    // Return fallback guesses even if parsing fails
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return [
      'feed', 
      'rss', 
      'atom', 
      'feed.xml', 
      'rss.xml', 
      'atom.xml',
      'index.xml',
      'feeds/posts/default'
    ].map(p => `${normalizedBase}/${p}`);
  }
}