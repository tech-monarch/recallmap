import type { ReactNode } from "react";

/** Lines that look like Python are set in JetBrains Mono; everything else stays in the reading face. */
const CODE_LINE = /^(\s+\S|(if|elif|else|for|while|def|return|print)\b|[a-z_]\w*\s*=|[a-z_]\w*\()/;

type Block = { code: boolean; text: string };
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  for (const line of text.split("\n")) {
    if (line.trim() === "") { cur = null; continue; }
    const code = CODE_LINE.test(line);
    if (cur && cur.code === code) cur.text += `\n${line}`;
    else { cur = { code, text: line }; blocks.push(cur); }
  }
  return blocks;
}

export default function CodeText({ text, proseClass = "", codeClass = "" }: { text: string; proseClass?: string; codeClass?: string }): ReactNode {
  return toBlocks(text).map((b, i) =>
    b.code ? (
      <pre key={i} className={`overflow-x-auto whitespace-pre rounded-xl border border-line bg-canvas px-4 py-3 font-mono text-[15px] leading-[1.7] text-ink ${codeClass}`}><code>{b.text}</code></pre>
    ) : (
      <p key={i} className={`whitespace-pre-wrap ${proseClass}`}>{b.text}</p>
    ),
  );
}
