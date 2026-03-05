import re

with open('trending.html', 'r', encoding='utf-8') as f:
    html = f.read()

articles = re.findall(r'<article class="Box-row">.*?</article>', html, re.DOTALL)
for i, article in enumerate(articles[:3]):
    # Get all hrefs inside h2
    h2_match = re.search(r'<h2[^>]*>(.*?)</h2>', article, re.DOTALL)
    if h2_match:
        h2_content = h2_match.group(1)
        repo_match = re.search(r'href="/([^"]+)"', h2_content)
        repo_name = repo_match.group(1) if repo_match else "NOT FOUND"
    else:
        repo_name = "NOT FOUND"

    # Get description
    desc_match = re.search(r'<p class="col-9[^"]*">(.*?)</p>', article, re.DOTALL)
    desc = desc_match.group(1).strip() if desc_match else "No description"
    desc = re.sub(r'<[^>]+>', '', desc).strip()

    # Get stars
    stars_match = re.search(r'href="/[^/]+/[^/]+/stargazers"[^>]*>.*?<svg[^>]*>.*?</svg>\s*([\d,]+)\s*</a>', article, re.DOTALL)
    stars = stars_match.group(1).replace(',', '') if stars_match else "0"

    # Get language
    lang_match = re.search(r'<span itemprop="programmingLanguage">(.*?)</span>', article)
    lang = lang_match.group(1) if lang_match else "Unknown"

    # Get stars today
    today_match = re.search(r'([\d,]+)\s+stars\s+today', article)
    today = today_match.group(1).replace(',', '') if today_match else "0"

    print(f"Repo: {repo_name} | Stars: {stars} | Today: {today} | Lang: {lang}")
