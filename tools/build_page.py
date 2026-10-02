"""Embed the current Console script so the instruction page works offline."""

from html import escape
from pathlib import Path


def main():
    root = Path(__file__).resolve().parents[1]
    template = (root / "tools" / "page.html").read_text(encoding="utf-8")
    script = (root / "save-pdf.js").read_text(encoding="utf-8")
    page = template.replace("{{SCRIPT}}", escape(script))
    (root / "index.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
