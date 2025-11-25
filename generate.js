const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, 'examples');
const SITE_DIR = path.join(__dirname, 'site');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Ensure site directory exists
if (!fs.existsSync(SITE_DIR)) {
    fs.mkdirSync(SITE_DIR, { recursive: true });
}

// Helper to read file content
function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

// Helper to write file content
function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content);
}

// Parse C# file
function parseCSharp(content) {
    const lines = content.split('\n');
    const chunks = [];
    let currentChunk = { code: [], docs: [] };
    let isHeader = true;
    let header = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (isHeader) {
            if (trimmed.startsWith('//')) {
                header += trimmed.substring(2).trim() + " ";
                continue;
            } else if (trimmed === "") {
                continue;
            } else {
                isHeader = false;
            }
        }

        if (trimmed.startsWith('//')) {
            if (currentChunk.code.length > 0) {
                chunks.push(currentChunk);
                currentChunk = { code: [], docs: [] };
            }
            currentChunk.docs.push(trimmed.substring(2).trim());
        } else {
            currentChunk.code.push(line);
            // If we have code, and the next line is a comment, we push the chunk
            // But wait, the requirement is "align with line".
            // A better approach for alignment might be to keep them in sync array.
            // Let's refine the structure.
        }
    }
    // Push last chunk
    if (currentChunk.code.length > 0 || currentChunk.docs.length > 0) {
        chunks.push(currentChunk);
    }

    return { header: header.trim(), chunks };
}

// Better parsing strategy for alignment:
// We want a list of "segments". Each segment has `docs` (text) and `code` (text).
// If a block of code has a preceding comment, they go together.
// If code has no comment, docs is empty.
// If comment has no code (e.g. at end), code is empty.

function parseFile(content, commentPrefix) {
    const lines = content.split('\n');
    const segments = [];
    let currentDocs = [];
    let currentCode = [];
    let isHeader = true;
    let header = "";
    let pendingBlankLine = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (isHeader) {
            if (trimmed.startsWith(commentPrefix)) {
                header += trimmed.substring(commentPrefix.length).trim() + " ";
                continue;
            } else if (trimmed === "") {
                continue;
            } else {
                isHeader = false;
            }
        }

        if (trimmed.startsWith(commentPrefix)) {
            // If we have accumulated code, push it as a segment
            if (currentCode.length > 0) {
                // Trim only leading empty lines, keep trailing for spacing
                let codeStr = currentCode.join("\n");
                codeStr = codeStr.replace(/^\n+/, ''); // Only trim leading
                codeStr = codeStr.replace(/\n+$/, ''); // Trim trailing

                if (codeStr.length > 0) {
                    segments.push({ docs: currentDocs.join(" "), code: codeStr, addBlankAfter: pendingBlankLine });
                    currentDocs = [];
                    currentCode = [];
                    pendingBlankLine = false;
                }
            }
            currentDocs.push(trimmed.substring(commentPrefix.length).trim());
        } else if (trimmed === "" && currentCode.length > 0) {
            // Blank line after code - mark it for spacing
            pendingBlankLine = true;
            currentCode.push(line);
        } else {
            currentCode.push(line);
        }
    }

    // Push final segment
    if (currentCode.length > 0 || currentDocs.length > 0) {
        let codeStr = currentCode.join("\n");
        codeStr = codeStr.replace(/^\n+/, '');
        codeStr = codeStr.replace(/\n+$/, '');
        segments.push({ docs: currentDocs.join(" "), code: codeStr, addBlankAfter: false });
    }

    return { header: header.trim(), segments };
}


function generate() {
    const examples = fs.readdirSync(EXAMPLES_DIR).filter(f => fs.statSync(path.join(EXAMPLES_DIR, f)).isDirectory());

    const links = [];

    examples.forEach(example => {
        const examplePath = path.join(EXAMPLES_DIR, example);
        const csFile = path.join(examplePath, `${example}.cs`);
        const shFile = path.join(examplePath, `${example}.sh`);

        if (fs.existsSync(csFile)) {
            const csContent = readFile(csFile);
            const parsedCs = parseFile(csContent, '//');

            let parsedSh = { segments: [] };
            if (fs.existsSync(shFile)) {
                const shContent = readFile(shFile);
                parsedSh = parseFile(shContent, '#');
            }

            const html = renderTemplate(example, parsedCs, parsedSh, examples);
            writeFile(path.join(SITE_DIR, `${example}.html`), html);
            links.push({ name: example, url: `${example}.html` });
        }
    });

    // Generate Index
    // For now, index redirects to the first example or lists them
    // Let's make index list them.
    const indexHtml = renderIndex(links);
    writeFile(path.join(SITE_DIR, 'index.html'), indexHtml);
}

function renderTemplate(title, csData, shData, allExamples) {
    const currentIndex = allExamples.indexOf(title);
    const prevExample = currentIndex > 0 ? allExamples[currentIndex - 1] : null;
    const nextExample = currentIndex < allExamples.length - 1 ? allExamples[currentIndex + 1] : null;

    // Filter out empty segments
    const csSegments = csData.segments.filter(seg => seg.code.trim() || seg.docs.trim());
    const shSegments = shData.segments.filter(seg => seg.code.trim() || seg.docs.trim());

    const template = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>C# by Example: ${title}</title>
    <link rel="stylesheet" href="site.css">
  </head>
  <body>
    <div class="example" id="${title.toLowerCase()}">
      <h2><a href="./">C# by Example</a>: ${title}</h2>
      
      <table>
        ${csSegments.map((seg, index) => `<tr class="${seg.addBlankAfter ? 'spaced' : ''}">
          <td class="docs">
            <p>${seg.docs}</p>
          </td>
          <td class="code${index === 0 ? ' leading' : ''}">
            <pre><code class="language-csharp">${escapeHtml(seg.code)}</code></pre>
          </td>
        </tr>`).join('\n        ')}
      </table>
      ${shSegments.length > 0 ? `
      <table>
        ${shSegments.map((seg, index) => `<tr class="${seg.addBlankAfter ? 'spaced' : ''}">
          <td class="docs">
            <p>${seg.docs}</p>
          </td>
          <td class="code${index === 0 ? ' leading' : ''}">
            <pre><code class="language-bash">${escapeHtml(seg.code)}</code></pre>
          </td>
        </tr>`).join('\n        ')}
      </table>` : ''}
      
      <p class="next">
        ${nextExample ? `Next example: <a href="${nextExample}.html">${nextExample}</a>.` : ''}
      </p>
      
      <p class="footer">
        <a href="https://github.com/yourusername/csharp_by_examples">source</a> | <a href="https://github.com/yourusername/csharp_by_examples#license">license</a>
      </p>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
    <script>
      window.onkeydown = (e) => {
        if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
        if (e.key === "ArrowLeft") {
          ${prevExample ? `window.location.href = '${prevExample}.html';` : ''}
        }
        if (e.key === "ArrowRight") {
          ${nextExample ? `window.location.href = '${nextExample}.html';` : ''}
        }
      }
    </script>
  </body>
</html>`;
    return template;
}

function renderIndex(links) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>C# by Example</title>
    <link rel="stylesheet" href="site.css">
</head>
<body>
    <div class="example" id="intro">
        <h2><a href="./">C# by Example</a></h2>
        <p>
            <a href="https://docs.microsoft.com/en-us/dotnet/csharp/">C#</a> is an elegant and type-safe object-oriented language.
            These annotated examples demonstrate various features of the language.
        </p>
        
        <ul>
            ${links.map(l => `<li><a href="${l.url}">${l.name}</a></li>`).join('\n            ')}
        </ul>
        
        <p class="footer">
            <a href="https://github.com/yourusername/csharp_by_examples">source</a> | <a href="https://github.com/yourusername/csharp_by_examples#license">license</a>
        </p>
    </div>
</body>
</html>`;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

generate();
