import { Fragment, type ReactNode } from "react";

const INLINE_TOKEN_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));

    if (match[1] && match[2]) {
      nodes.push(
        <a href={match[2]} key={`${index}-${match[2]}`} rel="noreferrer" target="_blank">
          {match[1]}
        </a>,
      );
    } else if (match[3]) {
      nodes.push(<code key={`${index}-${match[3]}`}>{match[3]}</code>);
    }

    cursor = index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderLines(text: string): ReactNode[] {
  return text.split("\n").flatMap((line, index, lines) => [
    <Fragment key={`${index}-${line}`}>{renderInline(line)}</Fragment>,
    index < lines.length - 1 ? <br key={`break-${index}`} /> : null,
  ]);
}

export function JourneyBody({ body, className }: { body: string; className?: string }) {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return <h3 key={`${index}-${block}`}>{renderInline(block.slice(3))}</h3>;
        }

        const lines = block.split("\n");
        if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={`${index}-${block}`}>
              {lines.map((line) => <li key={line}>{renderInline(line.slice(2))}</li>)}
            </ul>
          );
        }

        return <p key={`${index}-${block}`}>{renderLines(block)}</p>;
      })}
    </div>
  );
}
