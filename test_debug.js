const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Return-Format': 'text' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function markdownToHtml(md) {
  if (!md) return '<p></p>';
  const safe = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  let html = safe;
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/^---$/gm, '<hr/>');
  html = html.replace(/^(?!<[a-zA-Z/])(.+)$/gm, '<p>$1</p>');
  return html;
}

async function main() {
  const cgMd = await fetchUrl('https://r.jina.ai/https://www.centralgalaxy.com/how-do-neural-networks-learn/');
  const cgHtml = markdownToHtml(cgMd);
  
  console.log('=== FULL CG HTML ===');
  console.log(cgHtml);
  console.log('\n=== LENGTH ===', cgHtml.length);
  
  // Simulate what setContentHTML does: JSON.stringify the string and postMessage it
  const payload = JSON.stringify({ type: 'action', name: 'setHtml', data: { html: cgHtml } });
  console.log('\n=== JSON PAYLOAD LENGTH ===', payload.length);
  
  // Try to JSON.parse it back
  try {
    const parsed = JSON.parse(payload);
    console.log('JSON roundtrip: OK');
  } catch (e) {
    console.error('JSON FAILED:', e.message);
  }
}

main().catch(console.error);
