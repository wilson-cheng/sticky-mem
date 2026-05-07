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
  // Test dev.to
  const devtoMd = await fetchUrl('https://r.jina.ai/https://dev.to/snake_sun/4-hours-of-autonomous-indie-iteration-what-an-ai-agent-actually-shipped-3ljh');
  const devtoHtml = markdownToHtml(devtoMd);
  console.log('=== DEV.TO HTML (first 1000 chars) ===');
  console.log(devtoHtml.substring(0, 1000));
  console.log('\n=== DEV.TO HTML length ===', devtoHtml.length);
  
  // Check for potential issues
  const nullChars = (devtoHtml.match(/\0/g) || []).length;
  const unclosedTags = (devtoHtml.match(/<(?!\/)[a-zA-Z][^>]*>/g) || []).length;
  const closedTags = (devtoHtml.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
  console.log('Null chars:', nullChars);
  console.log('Open tags:', unclosedTags);
  console.log('Close tags:', closedTags);
  
  // Check for HTML in content
  const hasScript = /<script/i.test(devtoHtml);
  const hasEvent = /on\w+=/i.test(devtoHtml);
  console.log('Has script tags:', hasScript);
  console.log('Has event handlers:', hasEvent);
  
  console.log('\n========================================\n');
  
  // Test centralgalaxy
  const cgMd = await fetchUrl('https://r.jina.ai/https://www.centralgalaxy.com/how-do-neural-networks-learn/');
  const cgHtml = markdownToHtml(cgMd);
  console.log('=== CG HTML (first 1000 chars) ===');
  console.log(cgHtml.substring(0, 1000));
  console.log('\n=== CG HTML length ===', cgHtml.length);
  
  const nullChars2 = (cgHtml.match(/\0/g) || []).length;
  const unclosedTags2 = (cgHtml.match(/<(?!\/)[a-zA-Z][^>]*>/g) || []).length;
  const closedTags2 = (cgHtml.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
  console.log('Null chars:', nullChars2);
  console.log('Open tags:', unclosedTags2);
  console.log('Close tags:', closedTags2);
}

main().catch(console.error);
