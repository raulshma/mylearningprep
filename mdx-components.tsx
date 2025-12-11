import type { MDXComponents } from 'mdx/types';
import {
  AnimatedDiagram,
  InteractiveDemo,
  InfoBox,
  Quiz,
  Question,
  Answer,
  CodeExample,
  ProgressCheckpoint,
  KeyConcept,
  Comparison,
} from '@/components/learn/mdx-components';

import { HttpConversation } from '@/components/learn/interactive/http/HttpConversation';
import { HttpRequestBuilder } from '@/components/learn/interactive/http/HttpRequestBuilder';
import { PacketInspector } from '@/components/learn/interactive/http/PacketInspector';

import { AddressBarDeconstruction } from '@/components/learn/interactive/domain/AddressBarDeconstruction';
import { DnsResolutionFlow } from '@/components/learn/interactive/domain/DnsResolutionFlow';
import { DnsRecordExplorer } from '@/components/learn/interactive/domain/DnsRecordExplorer';

/**
 * MDX Components Configuration
 * This file provides custom components for MDX content rendering.
 * These components enable interactive, animated learning experiences.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Interactive learning components
    AnimatedDiagram,
    InteractiveDemo,
    InfoBox,
    Quiz,
    Question,
    Answer,
    CodeExample,
    ProgressCheckpoint,
    KeyConcept,
    Comparison,

    // HTTP Lesson Components
    HttpConversation,
    HttpRequestBuilder,
    PacketInspector,

    // Domain Lesson Components
    AddressBarDeconstruction,
    DnsResolutionFlow,
    DnsRecordExplorer,

    // Enhanced HTML elements with proper styling
    h1: ({ children, ...props }) => (
      <h1
        className="text-3xl font-bold mt-8 mb-4 text-foreground scroll-mt-20"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-2xl font-semibold mt-8 mb-3 text-foreground border-b border-border pb-2 scroll-mt-20"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className="text-xl font-semibold mt-6 mb-2 text-foreground scroll-mt-20"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        className="text-lg font-medium mt-4 mb-2 text-foreground scroll-mt-20"
        {...props}
      >
        {children}
      </h4>
    ),
    p: ({ children, ...props }) => (
      <p className="text-base text-muted-foreground leading-7 mb-4" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-muted-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-muted-foreground" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-7" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4"
        {...props}
      >
        {children}
      </blockquote>
    ),
    code: ({ children, ...props }) => (
      <code
        className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono text-primary"
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre
        className="bg-secondary/50 border border-border rounded-xl p-4 overflow-x-auto my-4"
        {...props}
      >
        {children}
      </pre>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    hr: (props) => <hr className="border-border my-8" {...props} />,
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic text-foreground" {...props}>
        {children}
      </em>
    ),
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-border" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        className="border border-border bg-secondary/50 px-4 py-2 text-left font-semibold text-foreground"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border border-border px-4 py-2 text-muted-foreground" {...props}>
        {children}
      </td>
    ),
    ...components,
  };
}
