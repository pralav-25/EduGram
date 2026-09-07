#!/usr/bin/env python3
"""Dependency-free local HTML/resource and JavaScript checks (requires Node.js)."""
from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.links, self.scripts, self.errors = path, set(), [], [], []
        self.script = None
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.errors.append(f"duplicate id: {attrs['id']}")
            self.ids.add(attrs["id"])
        for key in ("src", "href", "poster"):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == "script" and not attrs.get("src") and attrs.get("type", "") in (
            "", "text/javascript", "application/javascript", "module"
        ):
            self.script = [self.getpos()[0], attrs.get("type") == "module", []]

    def handle_data(self, data):
        if self.script is not None:
            self.script[2].append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            self.scripts.append(self.script)
            self.script = None


def main():
    if not shutil.which("node"):
        sys.exit("Node.js is required to check JavaScript syntax.")
    pages = {p.resolve(): Page(p) for p in ROOT.rglob("*.html")
             if not any(part in {".git", "node_modules", "dist"} for part in p.parts)}
    failures = []
    for path, page in pages.items():
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = ((ROOT / unquote(url.path).lstrip("/")) if url.path.startswith("/")
                      else path.parent / unquote(url.path)) if url.path else path
            target = target.resolve()
            if not target.exists():
                page.errors.append(f"missing local resource: {link}")
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                page.errors.append(f"missing fragment: {link}")
        for line, module, parts in page.scripts:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".mjs" if module else ".js", encoding="utf-8") as file:
                file.write("".join(parts)); file.flush()
                result = subprocess.run(["node", "--check", file.name], capture_output=True, text=True)
                if result.returncode:
                    page.errors.append(f"script near line {line}: {result.stderr.strip()}")
        failures.extend(f"{path.relative_to(ROOT)}: {error}" for error in page.errors)
    for path in (ROOT / "scripts").glob("*.js"):
        result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
        if result.returncode:
            failures.append(result.stderr)
    if failures:
        sys.exit("\n".join(failures))
    print(f"Checked {len(pages)} HTML pages: resources, fragments, IDs, and JavaScript syntax pass.")


if __name__ == "__main__":
    main()
