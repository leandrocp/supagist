import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Managing your data · Supagist",
  description: "How to view, change and delete your Supagist snippets and account.",
};

const link = "text-foreground underline-offset-2 hover:underline";

// Document only controls that exist. Everything else goes through email.
export default function DataHelpPage() {
  return (
    <LegalPage
      eyebrow="Help"
      title="Managing your data"
      subtitle="How to view, change and delete your snippets and account."
      updated="November 1, 2026"
    >
      <Section title="See your snippets">
        <p>
          Sign in and open{" "}
          <Link href="/snippets" className={link}>
            Your snippets
          </Link>{" "}
          (/snippets). It lists your 20 most recent snippets, public and unlisted, with their
          language, date and view count. For older snippets, or a full list, email us.
        </p>
      </Section>

      <Section title="Edit a snippet">
        <p>
          Published snippets cannot be edited. To change one, publish a new snippet from the home
          page and ask us to delete the old one.
        </p>
      </Section>

      <Section title="Delete a snippet">
        <p>
          There is no delete button yet. Email <ContactLink /> from the address on your account with
          the link of each snippet to delete. We delete the snippet together with its images,
          comments, reactions and view records.
        </p>
        <p>
          Snippets that nobody has viewed for six months are also deleted automatically, with no
          recovery.
        </p>
      </Section>

      <Section title="Comments and reactions">
        <p>
          To remove a line reaction you added, open the snippet, open the reaction picker on that
          line and choose Remove reaction. Comments cannot be edited or deleted from the site yet;
          email us with the snippet link and the comment to remove.
        </p>
      </Section>

      <Section title="Drafts and settings in your browser">
        <p>
          Your unpublished draft and your light or dark theme are stored only in your browser.
          Publishing clears the draft. To remove them, clear this site&apos;s data in your browser
          settings.
        </p>
      </Section>

      <Section title="AI assistants and MCP">
        <p>
          An assistant connected to Supagist&apos;s MCP server can render images and publish new
          snippets as you. Published snippets are unlisted, and common secrets in the code are
          replaced with placeholders before anything is stored. The assistant cannot read, edit or
          delete your existing snippets; to delete one it published, follow Delete a snippet above.
          To stop an assistant from using your account, disconnect Supagist in that assistant. To
          revoke its access on our side as well, email us.
        </p>
      </Section>

      <Section title="Delete your account">
        <p>
          There is no self-serve account deletion yet. Email <ContactLink /> from the address on
          your account and ask us to delete it. We delete your account and profile together with
          your snippets, comments, reactions and view records. You can also ask for a copy of the
          data we hold about you.
        </p>
        <p>
          Log out (in the menu under your avatar) ends your session but does not delete anything.
        </p>
      </Section>

      <Section title="More">
        <p>
          The{" "}
          <Link href="/privacy" className={link}>
            Privacy Policy
          </Link>{" "}
          explains what we collect and who processes it.
        </p>
      </Section>
    </LegalPage>
  );
}
