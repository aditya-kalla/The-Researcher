"""
Retrieval tools for the SCOUT agent.

These are direct Python ports of researcher-backend/retrieval.js's
fetchSemanticScholarPapers() and fetchArxivPapers(). Same endpoints, same
fields, same timeouts — the only difference is these are exposed as ADK
tools, so SCOUT calls them itself instead of the result being spliced into
a prompt by hand.

ADK auto-wraps any plain Python function passed in an agent's `tools=[...]`
list into a FunctionTool. The docstring becomes the tool description the
model sees, and the type hints become the parameter schema — so keep both
accurate and specific.
"""

import asyncio
import os
import xml.etree.ElementTree as ET

import httpx

SEMANTIC_SCHOLAR_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
ARXIV_URL = "https://export.arxiv.org/api/query"
USER_AGENT = "TheResearcher/1.0 (mailto:researcher-app@example.com)"
ARXIV_NS = {"atom": "http://www.w3.org/2005/Atom"}

# Optional: set S2_API_KEY in .env to get a much higher Semantic Scholar
# rate limit than the shared public/unauthenticated one (which is easy to
# exhaust — ~100 req/5min shared across everyone hitting the API with no
# key, and we hit that limit during testing on 2026-07-01). Free to request
# at https://www.semanticscholar.org/product/api#api-key-form. Code works
# fine without it, just falls back to the shared limit and the retry below.
S2_API_KEY = os.environ.get("S2_API_KEY")


async def search_semantic_scholar(topic: str) -> list[dict]:
    """Searches Semantic Scholar for academic papers relevant to a research topic.

    Returns up to 4 papers with title, authors, year, venue, citation count,
    abstract, and links (open-access PDF, DOI, arXiv if available). Use this
    to ground claims in real, citable literature rather than inventing papers.

    Args:
        topic: The research topic or query to search for, e.g.
            "transformer attention mechanisms" or "CRISPR off-target effects".

    Returns:
        A list of paper dicts. Empty list if the search fails or finds nothing
        — that is a valid result, not an error; report it honestly.
    """
    params = {
        "query": topic,
        "limit": 4,
        "fields": "title,authors,year,abstract,externalIds,openAccessPdf,url,citationCount,venue",
    }
    headers = {"User-Agent": USER_AGENT}
    if S2_API_KEY:
        headers["x-api-key"] = S2_API_KEY

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(SEMANTIC_SCHOLAR_URL, params=params, headers=headers)

            # Semantic Scholar's unauthenticated tier shares a tight rate
            # limit across all callers, so a 429 here is common and often
            # transient. One short retry is usually enough to clear it.
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("retry-after", 2))
                print(f"[SCOUT] Semantic Scholar rate-limited, retrying in {retry_after}s...")
                await asyncio.sleep(retry_after)
                resp = await client.get(SEMANTIC_SCHOLAR_URL, params=params, headers=headers)

        if resp.status_code != 200:
            print(
                f"[SCOUT] Semantic Scholar returned {resp.status_code} for "
                f"topic={topic!r}: {resp.text[:200]}"
            )
            return []
        data = resp.json()
    except (httpx.HTTPError, ValueError) as e:
        print(f"[SCOUT] Semantic Scholar request failed for topic={topic!r}: {type(e).__name__}: {e!r}")
        return []

    papers = []
    for p in data.get("data", []) or []:
        authors = ", ".join(a.get("name", "") for a in (p.get("authors") or [])) or "Unknown Authors"
        external_ids = p.get("externalIds") or {}
        open_access = p.get("openAccessPdf") or {}
        paper_id = p.get("paperId")
        papers.append(
            {
                "title": p.get("title") or "Unknown Title",
                "authors": authors,
                "year": p.get("year") or "Unknown Year",
                "venue": p.get("venue") or "Unknown Venue",
                "citations": p.get("citationCount") or 0,
                "abstract": p.get("abstract") or "",
                "url": open_access.get("url") or p.get("url") or (
                    f"https://www.semanticscholar.org/paper/{paper_id}" if paper_id else ""
                ),
                "doi": f"https://doi.org/{external_ids['DOI']}" if external_ids.get("DOI") else "",
                "arxiv": f"https://arxiv.org/abs/{external_ids['ArXiv']}" if external_ids.get("ArXiv") else "",
                "source_type": "SEMANTIC_SCHOLAR",
            }
        )
    return papers


async def search_arxiv(topic: str) -> list[dict]:
    """Searches arXiv for recent preprints relevant to a research topic.

    Returns up to 3 of the most recently submitted papers, sorted by
    submission date descending — use this for frontier/recency coverage
    that Semantic Scholar's citation-ranked results may miss.

    Args:
        topic: The research topic or query to search for.

    Returns:
        A list of paper dicts. Empty list if the search fails or finds nothing.
    """
    params = {
        "search_query": f'all:"{topic}"',
        "start": 0,
        "max_results": 3,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(ARXIV_URL, params=params, headers={"User-Agent": USER_AGENT})
        if resp.status_code != 200:
            print(f"[SCOUT] arXiv returned {resp.status_code} for topic={topic!r}")
            return []
        root = ET.fromstring(resp.text)
    except (httpx.HTTPError, ET.ParseError) as e:
        print(f"[SCOUT] arXiv request failed for topic={topic!r}: {type(e).__name__}: {e!r}")
        return []

    papers = []
    for entry in root.findall("atom:entry", ARXIV_NS):
        title_el = entry.find("atom:title", ARXIV_NS)
        summary_el = entry.find("atom:summary", ARXIV_NS)
        published_el = entry.find("atom:published", ARXIV_NS)
        id_el = entry.find("atom:id", ARXIV_NS)

        title = " ".join((title_el.text or "").split()) if title_el is not None else ""
        abstract = " ".join((summary_el.text or "").split()) if summary_el is not None else ""
        published = published_el.text if published_el is not None else ""
        year = int(published.split("-")[0]) if published else None

        arxiv_id = ""
        if id_el is not None and id_el.text:
            arxiv_id = id_el.text.rsplit("/abs/", 1)[-1]

        authors = ", ".join(
            (a.find("atom:name", ARXIV_NS).text or "").strip()
            for a in entry.findall("atom:author", ARXIV_NS)
            if a.find("atom:name", ARXIV_NS) is not None
        ) or "Unknown Authors"

        papers.append(
            {
                "title": title,
                "authors": authors,
                "year": year,
                "venue": "arXiv",
                "citations": 0,
                "abstract": abstract,
                "url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else "",
                "doi": "",
                "arxiv": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else "",
                "source_type": "ARXIV",
            }
        )
    return papers
