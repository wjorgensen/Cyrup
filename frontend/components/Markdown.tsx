import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

type Props = { 
  content: string;
  className?: string;
};

export default function Markdown({ content, className = '' }: Props) {
  return (
    <article className={`max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSanitize,
        ]}
        components={{
          h1: ({node, ...props}) => (
            <h1 className="text-3xl font-bold text-black mb-4" {...props} />
          ),
          h2: ({node, ...props}) => (
            <h2 className="text-2xl font-bold text-black mb-3 mt-6" {...props} />
          ),
          h3: ({node, ...props}) => (
            <h3 className="text-xl font-bold text-black mb-2 mt-4" {...props} />
          ),
          p: ({node, ...props}) => (
            <p className="text-black mb-4 leading-relaxed" {...props} />
          ),
          a: ({node, ...props}) => (
            <a {...props} className="text-purple-700 hover:text-purple-900 underline font-medium" />
          ),
          ul: ({node, ...props}) => (
            <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
          ),
          ol: ({node, ...props}) => (
            <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
          ),
          li: ({node, children, ...props}) => (
            <li className="text-black ml-4" {...props}>
              <span className="ml-2">{children}</span>
            </li>
          ),
          code: ({node, className, children, ...props}) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            return isInline ? (
              <code className="bg-black/10 text-black px-2 py-0.5 rounded font-mono text-sm" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({node, ...props}) => (
            <pre className="bg-black text-cream-50 p-4 rounded-lg overflow-x-auto mb-4 shadow-box-sm font-mono text-sm" {...props} />
          ),
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-purple-700 pl-4 italic text-black/80 mb-4" {...props} />
          ),
          strong: ({node, ...props}) => (
            <strong className="font-bold text-black" {...props} />
          ),
          em: ({node, ...props}) => (
            <em className="italic" {...props} />
          ),
          hr: ({node, ...props}) => (
            <hr className="border-black/20 my-6" {...props} />
          ),
          table: ({node, ...props}) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-2 border-black shadow-box-sm" {...props} />
            </div>
          ),
          thead: ({node, ...props}) => (
            <thead className="bg-black text-cream-50" {...props} />
          ),
          tbody: ({node, ...props}) => (
            <tbody className="bg-cream-50" {...props} />
          ),
          tr: ({node, ...props}) => (
            <tr className="border-b border-black" {...props} />
          ),
          th: ({node, ...props}) => (
            <th className="p-2 text-left font-bold" {...props} />
          ),
          td: ({node, ...props}) => (
            <td className="p-2 text-black" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}