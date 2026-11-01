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
          Open the snippet while signed in and choose Edit, or choose Edit from its menu in{" "}
          <Link href="/snippets" className={link}>
            Your snippets
          </Link>
          . You can change the code, title, language, theme and visibility (public or unlisted); the
          link stays the same. Changing the code, language or theme removes the images stored for
          the old version.
        </p>
      </Section>

      <Section title="Delete a snippet">
        <p>
          Open the snippet while signed in and choose Delete, or choose Delete from its menu in Your
          snippets, then confirm. We delete the snippet together with its images, comments,
          reactions and view records. There is no recovery.
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
          replaced with placeholders before anything is stored. It can also edit or delete snippets
          you own, and never anyone else&apos;s. To stop an assistant from using your account,
          disconnect Supagist in that assistant. To revoke its access on our side as well, email us.
        </p>
      </Section>

      <Section title="Delete your account">
        <p>
          Sign in, open{" "}
          <Link href="/account" className={link}>
            Account
          </Link>{" "}
          in the menu under your avatar, choose Delete account and confirm. We delete your account
          and profile right away, together with your snippets, comments, reactions and view records.
          If you cannot sign in, email <ContactLink /> from the address on your account instead. You
          can also ask for a copy of the data we hold about you.
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
