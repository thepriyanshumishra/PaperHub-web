'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { sanitizeAILatex } from '@/lib/sanitizeLaTeX';
import { Copy, Check, Loader2 } from 'lucide-react';

interface MathMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Fenced code blocks that contain only plain prose (no programming keywords)
 * are rendered as regular paragraphs instead of dark terminal boxes.
 */
function unwrapProseFences(markdown: string): string {
  return markdown.replace(
    /```([a-zA-Z]*)[ \t]*\r?\n([\s\S]*?)```/g,
    (_m, lang: string, body: string) => {
      const trimmed = body.trim();
      const language = lang.toLowerCase();
      
      const isMathOrTextLang = 
        !language || 
        language === 'text' || 
        language === 'latex' || 
        language === 'math' || 
        language === 'markdown' || 
        language === 'plaintext' || 
        language === 'txt';
      
      const hasHeavyMath = /\$\$|\\\[|\\\(|\\frac|\\int|\\begin|\\end|\\lambda|\\partial/.test(trimmed);
      
      if (isMathOrTextLang && hasHeavyMath) {
        return '\n' + trimmed + '\n';
      }
      
      const isCode =
        /;/.test(trimmed) || 
        /^\s*\w+\s*\(/.test(trimmed) || 
        /^\s*(if|for|while|return|int|void|def|class|import|#include|const|let|var|function)\b/.test(trimmed) ||
        language === 'mermaid';
        
      if (isCode) return _m;
      return '\n' + trimmed + '\n';
    }
  );
}

interface HastElement {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastElement[];
  value?: string;
}

function hastToText(node: HastElement): string {
  if (node.type === 'text') return node.value ?? '';
  if (node.children) return node.children.map(hastToText).join('');
  return '';
}

interface CodeBlockProps {
  codeString: string;
  lang: string;
  lineCount: number;
}

function CodeBlock({ codeString, lang, lineCount }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border-primary relative group/code bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#181825]/90 border-b border-white/5 backdrop-blur-sm select-none">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium font-sans rounded-md bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white transition-all duration-200 border border-white/5 hover:border-white/10 shadow-sm hover:shadow active:scale-[0.98] focus:outline-none"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400 stroke-[2.5px] scale-110 transition-transform animate-in fade-in zoom-in duration-200" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} className="stroke-[2px]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.25rem 1rem',
          fontSize: '0.72rem',
          lineHeight: '1.6',
          background: 'transparent',
          borderRadius: 0,
        }}
        showLineNumbers={lineCount > 4}
        wrapLongLines
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}

const mermaidSvgCache: Record<string, string> = {};

const getCacheKey = (chart: string) => {
  if (typeof window === 'undefined') return `light-${chart}`;
  const isDark = document.documentElement.classList.contains('dark');
  return `${isDark ? 'dark' : 'light'}-${chart}`;
};

interface MermaidRendererProps {
  chart: string;
}

function MermaidRenderer({ chart }: MermaidRendererProps) {
  // Clean all escaped quotes and rogue backslashes from the flowchart code to ensure 100% syntax compliance.
  const cleanChart = chart
    .replace(/\\"/g, '"')      // Replace any \" with "
    .replace(/\\'/g, "'")      // Replace any \' with '
    .replace(/\\/g, '');       // Replace any other rogue backslashes

  const [svg, setSvg] = useState<string>(() => {
    const key = getCacheKey(cleanChart);
    return mermaidSvgCache[key] || '';
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const key = `${isDarkMode ? 'dark' : 'light'}-${cleanChart}`;
    
    if (mermaidSvgCache[key]) {
      setSvg(mermaidSvgCache[key]);
      return;
    }

    let active = true;
    const renderChart = async () => {
      try {
        const mermaidModule = (await import('mermaid')).default;
        
        mermaidModule.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          themeVariables: {
            background: 'transparent',
            primaryColor: isDarkMode ? '#1e1b4b' : '#f0f2fe',
            primaryTextColor: isDarkMode ? '#f8fafc' : '#312e81',
            lineColor: isDarkMode ? '#818cf8' : '#6366f1',
            primaryBorderColor: isDarkMode ? '#4f46e5' : '#c7d2fe',
            nodeBorder: isDarkMode ? '#4f46e5' : '#c7d2fe',
            mainBkg: isDarkMode ? '#1e1b4b' : '#f0f2fe',
            actorBkg: isDarkMode ? '#1e1b4b' : '#f0f2fe',
            actorBorder: isDarkMode ? '#4f46e5' : '#c7d2fe',
            signalColor: isDarkMode ? '#f8fafc' : '#312e81',
            signalLineColor: isDarkMode ? '#818cf8' : '#6366f1',
          }
        });

        // Unique ID for mermaid render
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg: renderedSvg } = await mermaidModule.render(id, cleanChart);
        
        if (active) {
          mermaidSvgCache[key] = renderedSvg;
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (active) {
          setError((err as Error).message || 'Failed to render flowchart');
        }
      }
    };

    renderChart();

    return () => {
      active = false;
    };
  }, [cleanChart]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
        <p className="font-semibold mb-1">Failed to render flowchart:</p>
        <pre className="whitespace-pre-wrap overflow-x-auto">{cleanChart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-8 rounded-lg bg-transparent border border-border-primary/50 flex flex-col items-center justify-center gap-3 animate-pulse">
        <Loader2 className="w-5 h-5 text-accent animate-spin" />
        <span className="text-xs text-text-secondary">Generating flowchart...</span>
      </div>
    );
  }

  return (
    <div 
      className="my-6 p-4 rounded-xl bg-transparent overflow-x-auto flex justify-center transition-all duration-300 select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const MathMarkdown = React.memo(function MathMarkdown({ content, className = '' }: MathMarkdownProps) {
  const preprocessed = sanitizeAILatex(content || '');
  const final = unwrapProseFences(preprocessed);

  return (
    <div className={`prose dark:prose-invert max-w-none math-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              throwOnError: false,
              errorColor: '#cc0000',
              macros: {
                '\\bold': '\\mathbf',
                '\\bm': '\\boldsymbol',
                '\\sgn': '\\operatorname{sgn}',
                '\\tr': '\\operatorname{tr}',
                '\\tg': '\\tan',
                '\\ctg': '\\cot',
                '\\sh': '\\sinh',
                '\\ch': '\\cosh',
                '\\th': '\\tanh',
                '\\cth': '\\coth',
                '\\sp': '^',
                '\\sb': '_',
                '\\box': '\\Box',
              }
            }
          ]
        ]}
        components={{
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-base text-text-primary">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="font-display font-bold text-xl mb-3 mt-5 text-text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display font-bold text-lg mb-2 mt-4 text-text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display font-semibold text-base mb-2 mt-3 text-text-primary">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-1.5 text-base text-text-secondary">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-base text-text-secondary">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-text-secondary mb-1.5">{children}</li>
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pre: ({ node }: { node?: any }) => {
            const hastNode = node as HastElement | undefined;

            const codeNode = hastNode?.children?.find(
              (c) => c.type === 'element' && c.tagName === 'code'
            );

            if (!codeNode) {
              return (
                <pre className="bg-[#1e1e2e] rounded-lg p-4 overflow-x-auto text-xs my-4 border border-border-primary font-mono text-gray-200">
                  {hastToText(hastNode!)}
                </pre>
              );
            }

            const classes = (codeNode.properties?.className ?? []) as string[];
            const langClass = classes.find((c) => c.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : '';

            const codeString = hastToText(codeNode).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <MermaidRenderer chart={codeString} />;
            }

            const lineCount = codeString.split('\n').length;

            return <CodeBlock codeString={codeString} lang={lang} lineCount={lineCount} />;
          },

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ children, node }: { children?: React.ReactNode; node?: any }) => {
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
        {final}
      </ReactMarkdown>
    </div>
  );
});
MathMarkdown.displayName = 'MathMarkdown';
