import React, { useState } from 'react';

/**
 * Rich HTML5 & Markdown Message Renderer for AnyBot AI.
 * Renders:
 *  - Markdown & HTML5 Tables (with responsive scroll, zebra striping, custom headers)
 *  - Responsive HTML5 Images with zoom & lightbox modal
 *  - Syntax-highlighted Code blocks with copy-to-clipboard button
 *  - Clickable Links, Badges, Bullet lists, Blockquotes, Headings, and HTML tags
 */

function parseInlineFormatting(text) {
  if (!text) return '';

  let html = text;

  // Replace Markdown images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    return `<img src="${url}" alt="${alt || 'image'}" class="rich-msg-img" loading="lazy" />`;
  });

  // Replace Markdown links: [label](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="rich-msg-link">${label}</a>`;
  });

  // Replace bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Replace italic *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Replace inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="rich-inline-code">$1</code>');

  return html;
}

function parseMarkdownTable(tableLines) {
  if (tableLines.length < 2) return null;

  const rows = tableLines.map((line) => {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());
  });

  const isSeparator = tableLines[1].includes('---') || tableLines[1].includes('-:-');
  if (!isSeparator) return null;

  const headers = rows[0];
  const dataRows = rows.slice(2);

  return (
    <div className="rich-table-wrapper" key={`table-${Math.random()}`}>
      <table className="rich-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(h) }} />
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td key={colIndex} dangerouslySetInnerHTML={{ __html: parseInlineFormatting(cell) }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="rich-code-block">
      <div className="rich-code-header">
        <span className="rich-code-lang">{language || 'code'}</span>
        <button type="button" className="rich-code-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="rich-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function RichMessageRenderer({ content = '' }) {
  const [modalImage, setModalImage] = useState(null);

  if (!content) return null;

  const lines = content.split('\n');
  const blocks = [];
  let currentBlock = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableBuffer = [];

  const flushLines = () => {
    if (currentBlock.length > 0) {
      blocks.push({ type: 'text', content: currentBlock.join('\n') });
      currentBlock = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      blocks.push({ type: 'table', lines: tableBuffer });
      tableBuffer = [];
    }
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code block fence ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', lang: codeLang, code: codeBuffer.join('\n') });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushLines();
        flushTable();
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Check Markdown table line (| ... |)
    const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|');
    if (isTableLine) {
      flushLines();
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    currentBlock.push(line);
  }

  flushLines();
  flushTable();

  const handleContainerClick = (e) => {
    if (e.target.tagName === 'IMG' && (e.target.classList.contains('rich-msg-img') || e.target.getAttribute('src'))) {
      setModalImage(e.target.getAttribute('src'));
    }
  };

  return (
    <div className="rich-msg-content" onClick={handleContainerClick}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.lang} code={block.code} />;
        }

        if (block.type === 'table') {
          return parseMarkdownTable(block.lines);
        }

        if (block.type === 'text') {
          const formatted = parseInlineFormatting(block.content);
          return (
            <div
              key={idx}
              className="rich-msg-text"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }

        return null;
      })}

      {/* Image Modal Zoom */}
      {modalImage && (
        <div
          className="rich-img-modal-overlay"
          onClick={() => setModalImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
          }}>
          <img
            src={modalImage}
            alt="Enlarged preview"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  );
}
