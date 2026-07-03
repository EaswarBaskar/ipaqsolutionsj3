const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, fileList = []) {
  if(!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if(file !== 'node_modules' && file !== '.git') {
        findHtmlFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const projects = ['d:/eantrax projects/ipag tekton', 'd:/eantrax projects/Ipaq Solutions'];
let report = '';

projects.forEach(proj => {
  if(!fs.existsSync(proj)) return;
  report += 'Project: ' + proj + '\n';
  const htmlFiles = findHtmlFiles(proj);
  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check alt tags
    const imgRegex = /<img[^>]+>/g;
    let match;
    while((match = imgRegex.exec(content)) !== null) {
      if(!match[0].includes('alt=')) {
        report += '  [A11y] Missing alt tag in ' + path.basename(file) + ': ' + match[0] + '\n';
      }
    }
    
    // Check title
    if(!/<title>[^<]+<\/title>/.test(content)) {
      report += '  [SEO] Missing or empty <title> in ' + path.basename(file) + '\n';
    }
    
    // Check meta description
    if(!/<meta[^>]*name=["']description["'][^>]*>/i.test(content)) {
      report += '  [SEO] Missing meta description in ' + path.basename(file) + '\n';
    }
    
    // Check headings (H1)
    const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
    if(h1Count === 0) report += '  [SEO] Missing <h1> in ' + path.basename(file) + '\n';
    if(h1Count > 1) report += '  [SEO] Multiple <h1> in ' + path.basename(file) + '\n';
    
  });
});
console.log(report);
