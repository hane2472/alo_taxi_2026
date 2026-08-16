export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadWord(filename: string, title: string, bodyHtml: string) {
  const html = `<!doctype html><html dir="rtl" lang="ar" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8" />
<title>${title}</title>
<style>
  body{font-family:'Tajawal',Arial,sans-serif;color:#111}
  h1{font-size:20px;margin:0 0 4px}
  h2{font-size:15px;margin:20px 0 8px}
  p.meta{color:#666;font-size:12px;margin:0 0 12px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
  th{background:#f4f4f5}
</style></head><body>${bodyHtml}</body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printHtml(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>${title}</title>
<style>
  body{font-family:Tajawal,system-ui,sans-serif;padding:24px;color:#111}
  h1{font-size:20px;margin:0 0 4px}
  h2{font-size:15px;margin:20px 0 8px}
  p.meta{color:#666;font-size:12px;margin:0 0 12px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
  th{background:#f4f4f5}
  @media print{@page{size:A4;margin:12mm}}
</style></head><body>${bodyHtml}
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
  w.document.close();
  return true;
}

export function htmlTable(headers: string[], rows: (string | number | null | undefined)[][]) {
  const th = headers.map((h) => `<th>${h}</th>`).join("");
  const tr = rows
    .map((r) => `<tr>${r.map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}
