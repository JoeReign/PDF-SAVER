(() => {
  'use strict';

  const PANEL_ID = 'handbook-save-panel';
  const MAX_IMAGE_SIZE = 2400;
  const JPEG_QUALITY = 0.92;

  function findViewer(win, depth = 0) {
    try {
      if (win.PDFViewerApplication?.pdfDocument) return win;
      if (depth >= 5) return null;

      for (let index = 0; index < win.frames.length; index++) {
        const viewer = findViewer(win.frames[index], depth + 1);
        if (viewer) return viewer;
      }
    } catch {
      // Cross-origin viewers need to be selected in the Console dropdown.
    }
    return null;
  }

  function fileName(title) {
    return (title || 'Handbook')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\.pdf$/i, '')
      .trim()
      .slice(0, 100) || 'Handbook';
  }

  function downloadFile(win, blob, name) {
    const url = win.URL.createObjectURL(blob);
    const link = win.document.createElement('a');
    link.href = url;
    link.download = name;
    win.document.body.append(link);
    link.click();
    link.remove();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 60000);
  }

  // Each page uses three objects: page, JPEG image, and drawing commands.
  class ImagePdf {
    constructor(pageCount) {
      this.parts = [];
      this.offsets = [0];
      this.length = 0;
      this.encoder = new TextEncoder();

      this.write('%PDF-1.4\n');
      this.addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
      const children = Array.from(
        { length: pageCount },
        (_, index) => `${3 + index * 3} 0 R`
      ).join(' ');
      this.addObject(2, `<< /Type /Pages /Count ${pageCount} /Kids [${children}] >>`);
    }

    write(data) {
      const bytes = typeof data === 'string' ? this.encoder.encode(data) : data;
      this.parts.push(bytes);
      this.length += bytes.length;
    }

    addObject(id, dictionary, stream) {
      this.offsets[id] = this.length;
      this.write(`${id} 0 obj\n${dictionary}\n`);
      if (stream) {
        this.write('stream\n');
        this.write(stream);
        this.write('\nendstream\n');
      }
      this.write('endobj\n');
    }

    addPage(number, image) {
      const pageId = 3 + (number - 1) * 3;
      const imageId = pageId + 1;
      const contentId = pageId + 2;
      const { width, height, pixelWidth, pixelHeight, bytes } = image;

      this.addObject(pageId, [
        '<< /Type /Page /Parent 2 0 R',
        `/MediaBox [0 0 ${width} ${height}]`,
        `/Resources << /XObject << /Im ${imageId} 0 R >> >>`,
        `/Contents ${contentId} 0 R >>`
      ].join('\n'));

      this.addObject(imageId, [
        '<< /Type /XObject /Subtype /Image',
        `/Width ${pixelWidth} /Height ${pixelHeight}`,
        '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',
        `/Length ${bytes.length} >>`
      ].join('\n'), bytes);

      const commands = this.encoder.encode(
        `q\n${width} 0 0 ${height} 0 0 cm\n/Im Do\nQ\n`
      );
      this.addObject(contentId, `<< /Length ${commands.length} >>`, commands);
    }

    finish() {
      // PDF cross-reference entries point to byte offsets, not string positions.
      const xrefOffset = this.length;
      this.write(`xref\n0 ${this.offsets.length}\n0000000000 65535 f \n`);
      for (const offset of this.offsets.slice(1)) {
        this.write(`${String(offset).padStart(10, '0')} 00000 n \n`);
      }
      this.write(
        `trailer\n<< /Size ${this.offsets.length} /Root 1 0 R >>\n` +
        `startxref\n${xrefOffset}\n%%EOF\n`
      );
      return new Blob(this.parts, { type: 'application/pdf' });
    }
  }

  function createPanel(dom, pageCount) {
    const panel = dom.createElement('section');
    panel.id = PANEL_ID;
    panel.style.cssText = `
      position: fixed; top: 55px; right: 20px; z-index: 2147483647;
      width: 310px; max-width: calc(100vw - 64px); padding: 20px;
      background: #fff; color: #14213d; border: 2px solid #2946bf;
      border-radius: 12px; box-shadow: 0 8px 40px #0007;
      font: 14px/1.5 system-ui; text-align: left;
    `;

    const heading = dom.createElement('strong');
    heading.textContent = `Save PDF · ${pageCount} pages`;
    const status = dom.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'The original keeps text and links. Page images are a larger copy without selectable text.';
    panel.append(heading, status);

    function addButton(label, action) {
      const button = dom.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = `
        display: block; width: 100%; margin-top: 8px; padding: 9px;
        border: 1px solid #2946bf; border-radius: 6px;
        background: #eff3ff; color: #14213d; cursor: pointer; font: inherit;
      `;
      button.onclick = action;
      panel.append(button);
      return button;
    }

    return { panel, status, addButton };
  }

  const win = findViewer(window);
  if (!win) {
    alert(
      'No loaded PDF.js document found. Wait for the PDF to load. ' +
      'If needed, change the Console context from “top” to the PDF viewer frame and run again.'
    );
    return;
  }

  const dom = win.document;
  const existingPanel = dom.getElementById(PANEL_ID);
  if (existingPanel) {
    existingPanel.scrollIntoView();
    return;
  }

  const pdf = win.PDFViewerApplication.pdfDocument;
  const name = fileName(dom.title);
  const ui = createPanel(dom, pdf.numPages);
  let busy = false;
  let cancelled = false;
  let renderTask = null;

  function checkCancelled() {
    if (cancelled) throw new Error('Cancelled');
  }

  async function saveOriginal() {
    ui.status.textContent = 'Collecting the complete PDF…';
    const bytes = await pdf.getData();
    checkCancelled();
    if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
      throw new Error('The viewer returned invalid PDF data');
    }
    downloadFile(win, new Blob([bytes], { type: 'application/pdf' }), `${name}.pdf`);
    ui.status.textContent = `Download requested: ${pdf.numPages} pages. Check your browser downloads.`;
  }

  async function renderPage(number) {
    const page = await pdf.getPage(number);
    checkCancelled();
    const originalSize = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_IMAGE_SIZE / Math.max(originalSize.width, originalSize.height));
    const viewport = page.getViewport({ scale });
    const canvas = dom.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    try {
      renderTask = page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
        background: 'rgb(255,255,255)'
      });
      await renderTask.promise;
      renderTask = null;
      checkCancelled();

      const image = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
      });
      if (!image) throw new Error('Image encoding failed');

      return {
        width: originalSize.width,
        height: originalSize.height,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        bytes: new Uint8Array(await image.arrayBuffer())
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  async function savePageImages() {
    const output = new ImagePdf(pdf.numPages);
    for (let number = 1; number <= pdf.numPages; number++) {
      checkCancelled();
      ui.status.textContent = `Rendering page ${number} of ${pdf.numPages}… Keep this tab open.`;
      output.addPage(number, await renderPage(number));
      await new Promise(resolve => win.setTimeout(resolve, 0));
    }
    checkCancelled();
    downloadFile(win, output.finish(), `${name}-page-images.pdf`);
    ui.status.textContent = `Download requested: ${pdf.numPages} page images. Check your browser downloads.`;
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    cancelled = false;
    originalButton.disabled = true;
    imagesButton.disabled = true;

    try {
      await action();
    } catch (error) {
      ui.status.textContent = cancelled
        ? 'Cancelled. No partial PDF saved.'
        : `Could not save: ${error.message}. Try the other option or select the PDF frame in Console.`;
    } finally {
      busy = false;
      renderTask = null;
      originalButton.disabled = false;
      imagesButton.disabled = false;
    }
  }

  const originalButton = ui.addButton('Save original PDF', () => run(saveOriginal));
  const imagesButton = ui.addButton('Save all pages as images in a PDF', () => run(savePageImages));
  ui.addButton('Cancel / Close', () => {
    if (!busy) {
      ui.panel.remove();
      return;
    }
    cancelled = true;
    renderTask?.cancel();
    ui.status.textContent = 'Cancelling…';
  });
  dom.body.append(ui.panel);
})();
