import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  dropCap?: boolean;
}

export default function MarkdownRenderer({
  content,
  dropCap = false,
}: MarkdownRendererProps) {
  return (
    <div className="space-y-4 text-slate-700 dark:text-slate-300 text-base sm:text-[17px] leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 pt-3 pb-1">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 pt-3 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 pt-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 text-slate-700 dark:text-slate-300">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="py-3 px-4 my-4 border-l-2 border-blue-600 dark:border-blue-400 text-base text-slate-700 dark:text-slate-300 bg-stone-50 dark:bg-slate-800/50 rounded-r-lg">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900 dark:text-slate-100">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
