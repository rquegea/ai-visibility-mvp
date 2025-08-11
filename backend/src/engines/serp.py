import os
from serpapi import GoogleSearch

def get_search_results(query: str) -> str:
    params = {
        "q": query,
        "api_key": os.getenv("SERPAPI_KEY")
    }
    search = GoogleSearch(params)
    results = search.get_dict()

    answers = []
    for result in results.get("organic_results", []):
        answers.append(result.get("snippet", ""))

    return "\n".join(answers[:3]) if answers else "No results found."
