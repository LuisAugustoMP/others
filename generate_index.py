import os
import datetime

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(PROJECT_ROOT, "index.html")
EXCLUDE_DIRS = {".git", ".github", "node_modules", ".DS_Store"}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Others Repository</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {{
            --bg-color: #0d1117;
            --text-color: #e6edf3;
            --highlight-color: #7ee787;
            --link-color: #4493f8;
            --border-color: #30363d;
            --hover-bg: #161b22;
            --secondary-text: #7d8590;
            --font-mono: 'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', monospace;
        }}

        body {{
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: var(--font-mono);
            margin: 0;
            padding: 40px 20px;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }}

        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}

        .header {{
            margin-bottom: 30px;
        }}

        .prompt-line {{
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }}

        .prompt-symbol {{
            color: var(--highlight-color);
            font-weight: bold;
        }}

        .command {{
            color: var(--text-color);
        }}

        .description {{
            color: var(--secondary-text);
            font-size: 0.9rem;
            margin-left: 24px;
        }}

        .directory-list {{
            list-style: none;
            padding: 0;
            margin: 20px 0;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: #010409;
            overflow: hidden;
        }}

        .directory-item {{
            display: flex;
            align-items: center;
            padding: 12px 20px;
            border-bottom: 1px solid var(--border-color);
            transition: all 0.2s ease;
        }}

        .directory-item:last-child {{
            border-bottom: none;
        }}

        .directory-item:hover {{
            background-color: var(--hover-bg);
        }}

        .directory-item a {{
            color: var(--link-color);
            text-decoration: none;
            flex-grow: 1;
            display: flex;
            align-items: center;
            font-weight: 500;
        }}

        .icon {{
            margin-right: 15px;
            font-size: 0.9rem;
            width: 20px;
            text-align: center;
            color: var(--secondary-text);
        }}

        .directory-item:hover .icon {{
            color: var(--link-color);
        }}

        .stats {{
            color: var(--secondary-text);
            font-size: 0.85rem;
            font-variant-numeric: tabular-nums;
        }}

        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
            color: var(--secondary-text);
            font-size: 0.85rem;
            display: flex;
            justify-content: space-between;
        }}

        @media (max-width: 600px) {{
            body {{ padding: 20px 15px; }}
            .stats {{ display: none; }}
            .description {{ margin-left: 0; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="prompt-line">
                <span class="prompt-symbol">❯</span>
                <span class="command">ls --projects</span>
            </div>
            <div class="description">Exploring personal workspace /others/</div>
        </div>

        <ul class="directory-list" id="project-list">
            {items_html}
        </ul>

        <div class="footer">
            <span><i class="fas fa-code-branch"></i> main</span>
            <span>{count} projects found • Updated {last_update}</span>
        </div>
    </div>
</body>
</html>
"""

ITEM_TEMPLATE = """
            <li class="directory-item">
                <a href="{path}/index.html">
                    <span class="icon"><i class="fas fa-folder"></i></span>
                    {path}/
                </a>
                <span class="stats"><i class="far fa-calendar-alt"></i> {mod_date}</span>
            </li>"""

def get_projects():
    projects = []
    for entry in os.scandir(PROJECT_ROOT):
        if entry.is_dir() and entry.name not in EXCLUDE_DIRS:
            index_path = os.path.join(entry.path, "index.html")
            if os.path.exists(index_path):
                mod_time = os.path.getmtime(index_path)
                mod_date = datetime.datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
                projects.append({
                    "name": entry.name,
                    "path": entry.name,
                    "mod_date": mod_date,
                    "mod_time": mod_time
                })
    
    projects.sort(key=lambda x: x["mod_time"], reverse=True)
    return projects

def main():
    projects = get_projects()
    items_html = ""
    for p in projects:
        items_html += ITEM_TEMPLATE.format(path=p["path"], mod_date=p["mod_date"])
    
    last_update = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    final_html = HTML_TEMPLATE.format(
        items_html=items_html, 
        count=len(projects), 
        last_update=last_update
    )
    
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        f.write(final_html)
    
    print(f"Successfully generated index.html with {len(projects)} projects.")

if __name__ == "__main__":
    main()
