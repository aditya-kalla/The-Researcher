

/**
 * Fetch top foundation/review papers from Semantic Scholar
 */
export async function fetchSemanticScholarPapers(topic) {
  try {
    const query = encodeURIComponent(topic);
    // Fetch top highly-cited/relevant papers
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=4&fields=title,authors,year,abstract,externalIds,openAccessPdf,url,citationCount,venue`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TheResearcher/1.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      console.error(`[SEMANTIC SCHOLAR] API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return (data.data || []).map(p => ({
      title: p.title || 'Unknown Title',
      authors: (p.authors || []).map(a => a.name).join(', ') || 'Unknown Authors',
      year: p.year || 'Unknown Year',
      venue: p.venue || 'Unknown Venue',
      citations: p.citationCount || 0,
      abstract: p.abstract || '',
      url: p.openAccessPdf?.url || p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ''),
      doi: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : '',
      arxiv: p.externalIds?.ArXiv ? `https://arxiv.org/abs/${p.externalIds.ArXiv}` : '',
      source_type: 'SEMANTIC_SCHOLAR'
    }));
  } catch (error) {
    console.error(`[SEMANTIC SCHOLAR] Fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * Fetch recent frontier papers from arXiv
 */
export async function fetchArxivPapers(topic) {
  try {
    const query = encodeURIComponent(`all:"${topic}"`);
    const url = `http://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=3&sortBy=submittedDate&sortOrder=descending`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      console.error(`[ARXIV] API error: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    // Quick regex parsing for arXiv XML since we just need basic fields and don't want heavy XML libs
    const entries = xml.split('<entry>').slice(1);
    
    return entries.map(entry => {
      const getTag = (tag) => {
        const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim().replace(/\\n/g, ' ') : '';
      };
      
      const title = getTag('title').replace(/\\s+/g, ' ');
      const abstract = getTag('summary').replace(/\\s+/g, ' ');
      const published = getTag('published');
      const year = published ? published.split('-')[0] : new Date().getFullYear();
      const idMatch = entry.match(/<id>http:\/\/arxiv\.org\/abs\/(.+?)<\/id>/);
      const arxivId = idMatch ? idMatch[1] : '';
      
      // Extract authors
      const authorMatches = [...entry.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g)];
      const authors = authorMatches.map(m => m[1].trim()).join(', ') || 'Unknown Authors';

      return {
        title,
        authors,
        year: parseInt(year, 10) || new Date().getFullYear(),
        venue: 'arXiv',
        citations: 0,
        abstract,
        url: arxivId ? `https://arxiv.org/abs/${arxivId}` : '',
        doi: '',
        arxiv: arxivId ? `https://arxiv.org/abs/${arxivId}` : '',
        source_type: 'ARXIV'
      };
    });
  } catch (error) {
    console.error(`[ARXIV] Fetch failed: ${error.message}`);
    return [];
  }
}

/**
 * Build compressed context for the Groq prompt
 */
export function buildResearchContext(papers) {
  if (!papers || papers.length === 0) return 'No external papers retrieved.';
  
  let contextStr = '=== RETRIEVED ACADEMIC PAPERS ===\n\n';
  
  papers.forEach((p, idx) => {
    // Aggressive abstract truncation for token efficiency (first 600 chars)
    const shortAbstract = p.abstract ? (p.abstract.length > 600 ? p.abstract.slice(0, 600) + '...' : p.abstract) : 'No abstract available.';
    
    contextStr += `[Source ${idx + 1}] ${p.title}\n`;
    contextStr += `Authors: ${p.authors} | Year: ${p.year} | Venue: ${p.venue} | Citations: ${p.citations}\n`;
    if (p.url) contextStr += `URL: ${p.url}\n`;
    contextStr += `Abstract: ${shortAbstract}\n\n`;
  });
  
  return contextStr.trim();
}
