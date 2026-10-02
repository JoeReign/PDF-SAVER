# Thinkific PDF Saver

Save a PDF that is already loaded in a compatible PDF.js viewer. Built for sites that disable PDF downloading, this tool also works on other sites that expose PDFViewerApplication.pdfDocument.

## Use it

1. Open `index.html` for instructions and the Copy script button.
2. Open your PDF lesson and wait for it to load.
3. Open Developer Tools, select Console, paste the script, and press Enter.
4. Choose **Save original PDF** or **Save all pages as images in a PDF**.

If the document isn't found, select the PDF viewer frame in the Console context dropdown and run the script again. Review the script before running it.

The original preserves text and links. Image export renders all pages in order without scrolling, but has no selectable text or links. Keep the tab open while it runs. Cancel stops the export without saving a partial document.

## Compatibility

The viewer must expose `PDFViewerApplication.pdfDocument`. Cross-origin viewers need their own Console context. Chrome's built-in PDF viewer and other viewer implementations aren't supported.

This is intended for desktop browsers with Developer Tools. It doesn't handle login, scrape whole courses, or download DRM-protected documents. Large image exports can use substantial memory.

## Working on the code

- `save-pdf.js`: viewer lookup, save panel, original download, and image PDF export.
- `page.js` and `style.css`: the instruction page's copy button and styles.
- `tools/page.html`: the instruction page template.
- `tools/build_page.py`: embeds the current script in `index.html` so copying also works offline.

After editing the Console script or page template, rebuild the page:

```sh
python3 tools/build_page.py
```

There are no external libraries or build dependencies beyond Python for that rebuild. End users can open the included HTML directly.

## GitHub Pages

In repository **Settings → Pages**, deploy from `main` and the root folder. This hosts the instruction page; the Console script still runs on the page containing the PDF.

## Checks

Export callbacks and PDF structure were checked using a simulated three-page document with mixed page orientations. The authenticated Thinkific lesson hasn't been tested live.
