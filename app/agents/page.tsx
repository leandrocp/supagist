import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CopyCodeBlock } from "@/components/copy-code-block";
import { LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Supagist for AI agents · Supagist",
  description:
    "Install the Supagist skill and connect the MCP server so Claude Code, Codex, Cursor, Amp and other agents can make branded code images.",
};

const MCP_URL = "https://supagist.app/mcp";

function Client({ name, note, children }: { name: string; note?: ReactNode; children: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-foreground">{name}</h3>
      {note ? <p>{note}</p> : null}
      <CopyCodeBlock>{children}</CopyCodeBlock>
    </div>
  );
}

const PROMPTS = [
  "Make an image of the handleLogin function in src/auth.ts",
  "Render lines 12-40 of lib/db.ts with the Supabase brand for a blog post",
  "Turn my last commit's diff into a 16:9 image for X",
  "Share this snippet as a private Supagist link",
];

// Keep commands in sync with README.md and skills/supagist/reference/mcp.md.
export default function AgentsPage() {
  return (
    <LegalPage
      eyebrow="Agents"
      title="Supagist in your AI agent"
      subtitle="Create branded code images from Claude Code, Codex, Cursor, OpenCode, Amp and more."
      updated="November 5, 2026"
    >
      <Section title="Install the skill">
        <p>
          The skill teaches your agent to make good code images: pick the right lines, match a brand
          preset to your project, render with the CLI or the MCP server, check the result, and
          publish a link only when you ask.
        </p>
        <CopyCodeBlock>npx skills add leandrocp/supagist --skill supagist</CopyCodeBlock>
        <p>
          Read the{" "}
          <a
            href="https://github.com/leandrocp/supagist/blob/main/skills/supagist/SKILL.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            skill on GitHub
          </a>
          . With a shell, the skill renders through the <code>supagist</code> CLI and needs Node.js
          22 or later. Nothing else to set up.
        </p>
      </Section>

      <Section title="Connect the MCP server">
        <p>
          Optional. Connect the MCP server when your agent has no shell, or to publish, edit and
          delete snippets on your account. It speaks Streamable HTTP and signs you in with OAuth, so
          there is no API key to copy.
        </p>
        <CopyCodeBlock>{MCP_URL}</CopyCodeBlock>
        <Client
          name="Claude Code"
          note={
            <>
              Then run <code>/mcp</code>, pick <code>supagist</code> and authenticate.
            </>
          }
        >
          {`claude mcp add --transport http supagist ${MCP_URL}`}
        </Client>
        <Client name="Codex">
          {`codex mcp add supagist --url ${MCP_URL}\ncodex mcp login supagist`}
        </Client>
        <Client name="Amp">{`amp mcp add supagist ${MCP_URL}`}</Client>
        <Client
          name="Cursor"
          note={
            <>
              Add to <code>~/.cursor/mcp.json</code> (or <code>.cursor/mcp.json</code> in a
              project):
            </>
          }
        >
          {`{\n  "mcpServers": {\n    "supagist": { "url": "${MCP_URL}" }\n  }\n}`}
        </Client>
        <Client
          name="VS Code"
          note={
            <>
              Add to <code>.vscode/mcp.json</code>:
            </>
          }
        >
          {`{\n  "servers": {\n    "supagist": { "type": "http", "url": "${MCP_URL}" }\n  }\n}`}
        </Client>
        <p>Other clients: add the same URL as a remote (HTTP) server and choose OAuth.</p>
      </Section>

      <Section title="Try it">
        <p>Ask your agent in plain words. For example:</p>
        <ul className="list-disc space-y-2 pl-5">
          {PROMPTS.map((prompt) => (
            <li key={prompt} className="text-foreground">
              {prompt}
            </li>
          ))}
        </ul>
        <p>Or run the CLI yourself:</p>
        <CopyCodeBlock>
          {`npx supagist src/lib/auth.ts --lines 12-40 --brand supabase --out auth.png\nnpx supagist options`}
        </CopyCodeBlock>
      </Section>

      <Section title="What gets stored">
        <p>
          Rendering an image stores nothing. Publishing creates a private snippet unless you ask for
          public, and common secrets are replaced with placeholders first. Your agent should ask you
          before it publishes, edits or deletes. See{" "}
          <Link href="/help/data">Managing your data</Link> to disconnect an agent or remove
          snippets.
        </p>
      </Section>
    </LegalPage>
  );
}
