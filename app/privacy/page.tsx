import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy · Supagist",
  description: "What Supagist collects, why, who processes it and how long it is kept.",
};

// Every statement here must match what the code and config actually do.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="What Supagist collects, why, and how long it keeps it."
      updated="November 1, 2026"
    >
      <Section title="Who we are">
        <p>
          Supagist (supagist.app) is an open-source tool for turning code into shareable snippets
          and images. It is run by its maintainer, Leandro Pereira. Questions or requests about your
          data: <ContactLink />.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-foreground">Account data.</span> If you sign in with GitHub we
            receive your GitHub username, avatar URL, GitHub user ID and email address. If you sign
            up with email we store your email address and a password hash. Your public profile holds
            a username (your GitHub username, or the part of your email before the @), avatar URL
            and GitHub user ID. Your email is not shown on your profile.
          </li>
          <li>
            <span className="text-foreground">Guest sessions.</span> Every visitor gets an anonymous
            guest session automatically, so presence and reactions work without signing in. It
            creates a guest account and a profile named like guest_1a2b3c, with no email or avatar.
          </li>
          <li>
            <span className="text-foreground">Snippets you publish.</span> The code, filename, an
            optional title, whether it is public or unlisted, language, theme and font, line and
            character counts, when it was created and last viewed, and its view count. We also store
            images of the snippet (PNG and SVG when published from the website, SVG when published
            through the MCP server) and the raw code as a text file.
          </li>
          <li>
            <span className="text-foreground">Comments and reactions</span> you add, with your
            account, the line and the time.
          </li>
          <li>
            <span className="text-foreground">Views.</span> Each time a snippet page is viewed we
            record the snippet, the time, and the viewer&apos;s account ID (including guest
            accounts), to count views and keep the snippet from expiring. We do not store IP
            addresses or browser details with views.
          </li>
          <li>
            <span className="text-foreground">Drafts.</span> Code and annotations you type on the
            home page before publishing are saved only in your browser&apos;s local storage, and are
            cleared when you publish.
          </li>
          <li>
            <span className="text-foreground">Rate-limit counters.</span> To prevent abuse we keep
            short-lived counters keyed by your account ID. For the MCP server the counters also
            include your IP address. Counters whose window started more than a day ago are deleted
            daily.
          </li>
          <li>
            <span className="text-foreground">Logs.</span> When a page errors we log the error
            message, the page path and, for server errors, the request method. Our own logs do not
            include request headers. Our hosting providers also keep standard request logs, which
            include IP addresses, for a limited time.
          </li>
          <li>
            <span className="text-foreground">Usage analytics.</span> Vercel Web Analytics counts
            page views so we can see which pages are used.
          </li>
        </ul>
      </Section>

      <Section title="What is public">
        <p>
          Snippets published from the website are public: anyone with the link can view them, and
          anyone can read them (including their code) through Supagist&apos;s public API.
        </p>
        <p>
          Snippets published through the MCP server are unlisted. Anyone with the link can view one,
          including its code, and share the link further, so unlisted does not mean private.
          Unlisted snippets are not returned by Supagist&apos;s public API listings, are not shown
          in anyone else&apos;s snippet list, and their pages ask search engines not to index them.
          You still see your own unlisted snippets in your list.
        </p>
        <p>
          Comments, reactions and profiles (username, avatar and GitHub user ID) can be read by
          anyone through the public API, including comments and reactions on unlisted snippets. The
          snippet images and raw code file are served from public URLs that are hard to guess. Never
          publish secrets or personal data.
        </p>
        <p>
          While you have a snippet page or the home page open, other people viewing it can see your
          username and avatar (or a guest name) in the list of who is online.
        </p>
      </Section>

      <Section title="The MCP server">
        <p>
          AI assistants can connect to Supagist&apos;s MCP server at supagist.app/mcp after you sign
          in and approve access on a Supagist consent screen. The approval is recorded by our
          authentication provider, and the assistant receives tokens that let it use these tools as
          you. The MCP tools render code into SVG images, list the available options, and publish
          snippets. Code sent only to be rendered is not stored. Publishing saves a new unlisted
          snippet under your account, as described above. The tools can also edit or delete snippets
          you own, and never anyone else&apos;s. Before a published snippet is stored, the server
          replaces common secrets (such as API keys and tokens, private keys, passwords in
          connection strings and password or secret assignments) with visible placeholders, and
          Supagist does not store or log the original values. Detection covers common formats only,
          so check code before you publish it. We log technical details such as the language, image
          size and render time, not the code. MCP requests count toward the rate-limit counters
          described above.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Only to run Supagist: to sign you in, publish and show snippets, comments and reactions,
          show who is online, notify authors about new comments and reactions, count views, delete
          inactive snippets, prevent abuse and fix errors. We do not sell your data, we do not show
          ads, and we do not use your data for advertising or profiling.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          We use cookies only to keep you signed in. Supabase Auth sets session cookies for your
          account or guest session. Your browser&apos;s local storage holds your draft, draft
          annotations and your light or dark theme choice. We do not use advertising or cross-site
          tracking cookies.
        </p>
      </Section>

      <Section title="Who processes your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-foreground">Supabase</span> hosts the database, authentication,
            file storage, realtime presence and the MCP server.
          </li>
          <li>
            <span className="text-foreground">Vercel</span> hosts the website and runs Web Analytics
            and the website logs.
          </li>
          <li>
            <span className="text-foreground">GitHub</span> handles GitHub sign-in. Avatars of
            GitHub users are loaded from GitHub&apos;s servers.
          </li>
        </ul>
        <p>No one else receives your data from us.</p>
      </Section>

      <Section title="How long we keep it">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Snippets that have not been viewed for six months are deleted automatically, together
            with their images, comments, reactions and view records. There is no recovery.
          </li>
          <li>Rate-limit counters are deleted after one day.</li>
          <li>Drafts stay in your browser until you publish or clear your browser data.</li>
          <li>
            Accounts, profiles and guest accounts are kept until you delete them or ask us to. We do
            not yet delete inactive accounts automatically.
          </li>
        </ul>
      </Section>

      <Section title="Your choices and rights">
        <p>
          You can see your snippets at{" "}
          <Link href="/snippets" className="text-foreground underline-offset-2 hover:underline">
            /snippets
          </Link>
          , and edit or delete them there. You can delete your account and all its data at{" "}
          <Link href="/account" className="text-foreground underline-offset-2 hover:underline">
            /account
          </Link>
          . You can delete a comment you wrote from its line on the snippet. To ask what data we
          hold about you, email <ContactLink /> from the address on your account. See{" "}
          <Link href="/help/data" className="text-foreground underline-offset-2 hover:underline">
            Managing your data
          </Link>{" "}
          for what you can do yourself.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We will update this page when our practices change. The date at the top shows the latest
          version.
        </p>
      </Section>
    </LegalPage>
  );
}
