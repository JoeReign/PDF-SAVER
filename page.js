'use strict';

const copyButton = document.getElementById('copy');
const scriptBox = document.getElementById('code');
const copyStatus = document.getElementById('status');

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(scriptBox.value);
    copyStatus.textContent = 'Copied. Paste into the PDF viewer’s Console.';
  } catch {
    scriptBox.focus();
    scriptBox.select();
    copyStatus.textContent = 'Press Ctrl+C, or use Copy from the selection menu.';
  }
});
