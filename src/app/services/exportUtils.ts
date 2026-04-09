export function downloadCsv(fileName: string, headers: string[], rows: Array<Array<string | number | undefined>>) {
  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';'))
    .join('\n');

  downloadBlob(fileName, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
}

export function downloadExcelHtml(fileName: string, headers: string[], rows: Array<Array<string | number | undefined>>) {
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}</tr>`)
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(fileName, html, 'application/vnd.ms-excel;charset=utf-8;');
}

function downloadBlob(fileName: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
