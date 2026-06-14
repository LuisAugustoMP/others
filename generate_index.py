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
    <style>
        :root {{
            --bg-color: #0d1117;
            --text-color: #c9d1d9;
            --highlight-color: #3fb950;
            --link-color: #58a6ff;
            --border-color: #30363d;
            --hover-bg: #161b22;
            --font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        }}

        body {{
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: var(--font-mono);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }}

        .container {{
            max-width: 1000px;
            margin: 0 auto;
        }}

        .header {{
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}

        .prompt {{
            color: var(--highlight-color);
            font-weight: bold;
        }}

        .path {{
            color: var(--link-color);
        }}

        .repo-title {{
            font-size: 1.5rem;
            margin-bottom: 10px;
        }}

        .directory-list {{
            list-style: none;
            padding: 0;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
        }}

        .directory-item {{
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            transition: background 0.15s ease;
        }}

        .directory-item:last-child {{
            border-bottom: none;
        }}

        .directory-item:hover {{
            background-color: var(--hover-bg);
        }}

        .directory-item a {{
            color: var(--text-color);
            text-decoration: none;
            flex-grow: 1;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
        }}

        .directory-item a:hover {{
            color: var(--link-color);
        }}

        .icon {{
            margin-right: 12px;
            font-size: 1.2rem;
            width: 24px;
            text-align: center;
            opacity: 0.8;
        }}

        .stats {{
            color: #6e7681;
            font-size: 0.9rem;
            white-space: nowrap;
            margin-left: 20px;
        }}

        .footer {{
            margin-top: 40px;
            color: #6e7681;
            font-size: 0.9rem;
            text-align: center;
            border-top: 1px solid var(--border-color);
            padding-top: 20px;
        }}

        /* Mobile adjustments */
        @media (max-width: 600px) {{
            body {{
                padding: 15px;
            }}
            .repo-title {{
                font-size: 1.2rem;
            }}
            .directory-item a {{
                font-size: 1rem;
            }}
            .stats {{
                display: none;
            }}
        }}

        /* Scrollbar styling */
        ::-webkit-scrollbar {{
            width: 10px;
        }}
        ::-webkit-scrollbar-track {{
            background: var(--bg-color);
        }}
        ::-webkit-scrollbar-thumb {{
            background: var(--border-color);
            border-radius: 5px;
        }}
        ::-webkit-scrollbar-thumb:hover {{
            background: #484f58;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="repo-title">
                <span class="prompt">guest@luisaugusto:</span><span class="path">~/others</span>$ ls -l
            </div>
            <div style="color: #8b949e;">Personal collection of small projects and experiments.</div>
        </div>

        <ul class="directory-list" id="project-list">
            {items_html}
        </ul>

        <div class="footer">
            total {count} project(s) listed. last update: {last_update}
        </div>
    </div>
</body>
</html>
"""

ITEM_TEMPLATE = """
            <li class="directory-item">
                <a href="{path}/index.html">
                    <span class="icon">📁</span>
                    {path}/
                </a>
                <span class="stats">{mod_date}</span>
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
    
    # Sort by modification time (newest first)
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
