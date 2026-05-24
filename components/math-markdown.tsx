'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MathMarkdownProps {
  content: string;
  className?: string;
}

/** Sanitize code blocks – remove \quad / \qquad that AI sometimes injects into code */
function sanitizeCodeBlocks(markdown: string): string {
  return markdown.replace(
    /(```[\w]*\n)([\s\S]*?)(```)/g,
    (_m, open, body, close) => {
      const cleaned = body
        .replace(/\\quad\s*/g, '    ')
        .replace(/\\qquad\s*/g, '        ')
        .replace(/\bquad\s+/g, '    ')
        .replace(/\bqquad\s+/g, '        ');
      return open + cleaned + close;
    }
  );
}

// hast Element type (subset)
interface HastElement {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastElement[];
  value?: string;
}

/** Extract all text from a hast node tree */
function hastToText(node: HastElement): string {
  if (node.type === 'text') return node.value ?? '';
  if (node.children) return node.children.map(hastToText).join('');
  return '';
}

export function MathMarkdown({ content, className = '' }: MathMarkdownProps) {
  const sanitized = sanitizeCodeBlocks(content || '');

  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-sm text-text-primary">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="font-display font-bold text-lg mb-3 mt-4 text-text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display font-bold text-base mb-2 mt-3 text-text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display font-semibold text-sm mb-2 mt-3 text-text-primary">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-1 text-sm text-text-secondary">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-1 text-sm text-text-secondary">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-text-secondary mb-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent pl-4 italic text-text-secondary my-4">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text-secondary">{children}</em>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-border-primary rounded-lg text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-bg-secondary">{children}</thead>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-text-primary border-b border-border-primary">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-text-secondary border-b border-border-primary">{children}</td>
          ),

          /**
           * react-markdown v10: intercept <pre> using the raw hast `node` prop.
           * This bypasses the rendered children entirely, reading code content and
           * language directly from the AST so nothing is lost in transformation.
           */
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pre: ({ node }: { node?: any }) => {
            const hastNode = node as HastElement | undefined;

            // Find the <code> child in the hast tree
            const codeNode = hastNode?.children?.find(
              (c) => c.type === 'element' && c.tagName === 'code'
            );

            if (!codeNode) {
              // No code child – render a plain pre as fallback
              return (
                <pre className="bg-[#1e1e2e] rounded-lg p-4 overflow-x-auto text-xs my-4 border border-border-primary font-mono text-gray-200">
                  {hastToText(hastNode!)}
                </pre>
              );
            }

            // Extract language from class list e.g. ["language-c"]
            const classes = (codeNode.properties?.className ?? []) as string[];
            const langClass = classes.find((c) => c.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : '';

            // Extract raw source text
            const codeString = hastToText(codeNode).replace(/\n$/, '');
            const lineCount = codeString.split('\n').length;

            return (
              <div className="my-4 rounded-lg overflow-hidden border border-border-primary">
                {lang && (
                  <div className="flex items-center px-4 py-1.5 bg-[#1e1e2e] border-b border-white/10">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{lang}</span>
                  </div>
                )}
                <SyntaxHighlighter
                  language={lang || 'text'}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.72rem',
                    lineHeight: '1.6',
                    background: '#1e1e2e',
                    borderRadius: lang ? '0 0 0.5rem 0.5rem' : '0.5rem',
                  }}
                  showLineNumbers={lineCount > 4}
                  wrapLongLines
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          },

          /**
           * Inline code renderer.
           * Block code is fully handled in `pre` above via the hast node — this
           * renderer only runs for inline `code` spans (which have no language class).
           */
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ children, node }: { children?: React.ReactNode; node?: any }) => {
            // If this code element has a language class it belongs to a fenced block
            // that is already handled by the `pre` renderer — return null to avoid
            // rendering a duplicate.
            const classes = (node?.properties?.className ?? []) as string[];
            const isBlock = classes.some((c: string) => c.startsWith('language-'));
            if (isBlock) return null;

            return (
              <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-[0.72rem] font-mono border border-border-primary text-accent">
                {children}
              </code>
            );
          },
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}
