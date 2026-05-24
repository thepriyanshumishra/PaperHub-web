'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MathMarkdownProps {
  content: string;
  className?: string;
}

export function MathMarkdown({ content, className = '' }: MathMarkdownProps) {
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-4 leading-relaxed text-sm text-text-primary">{children}</p>,
          h1: ({ children }) => <h1 className="font-display font-bold text-lg mb-3 mt-4 text-text-primary">{children}</h1>,
          h2: ({ children }) => <h2 className="font-display font-bold text-base mb-2 mt-3 text-text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="font-display font-semibold text-sm mb-2 mt-3 text-text-primary">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-sm text-text-secondary">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-sm text-text-secondary">{children}</ol>,
          li: ({ children }) => <li className="text-text-secondary mb-1">{children}</li>,
          pre: ({ children }) => <div className="my-4">{children}</div>,
          code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <pre className="bg-bg-primary border border-border-primary rounded-lg p-4 overflow-x-auto text-xs">
                <code className={className} {...props}>
                  {String(children).replace(/\n$/, '')}
                </code>
              </pre>
            ) : (
              <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono border border-border-primary text-accent" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
