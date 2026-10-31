import type { Metadata } from "next";
import Link from "next/link";
import { Clause, ContactLink, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use · Supagist",
  description: "The terms for using Supagist.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      subtitle="Simple terms for a simple tool."
      updated="October 31, 2026"
    >
      <ol className="space-y-6 text-sm">
        <Clause n={1} title="Supagist is open source.">
          <p>
            The full source code is publicly available. You are free to inspect, fork, and run your
            own instance.
          </p>
        </Clause>
        <Clause n={2} title="No data is sold or shared with third parties.">
          <p>
            Your code and activity are used only to operate this service. The service providers that
            run Supagist, listed in the{" "}
            <Link href="/privacy" className="text-foreground underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            , process it only on our behalf.
          </p>
        </Clause>
        <Clause n={3} title="Inactive snippets may be deleted after 6 months.">
          <p>
            Snippets that have not been viewed for six months are automatically removed. There is no
            recovery.
          </p>
        </Clause>
        <Clause n={4} title="Published snippets are public.">
          <p>
            Anyone can view a published snippet, its comments and its reactions, together with the
            author&apos;s username and avatar. Do not publish secrets, credentials, personal data or
            anything you are not allowed to share.
          </p>
        </Clause>
        <Clause n={5} title="Acceptable use.">
          <p>You may not use Supagist, including its MCP server, to publish or create:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>illegal content, or content that promotes or facilitates illegal activity;</li>
            <li>sexual content involving minors, in any form;</li>
            <li>harassment, threats, hate speech or content that incites violence;</li>
            <li>sexually explicit, violent or otherwise objectionable content;</li>
            <li>
              malware, phishing, or code meant to damage, break into or disrupt systems you do not
              own;
            </li>
            <li>
              other people&apos;s private or personal data, or content that infringes copyright,
              trademarks or other rights;
            </li>
            <li>spam or misleading impersonation of a person or organization.</li>
          </ul>
          <p>
            You may not get around rate limits or other protections, for example by using several
            accounts, or interfere with the service or other users.
          </p>
        </Clause>
        <Clause n={6} title="Your content and our right to remove it.">
          <p>
            You keep ownership of what you publish. You allow Supagist to store, render and display
            it so the service can work. We may remove any content, or suspend or delete any account,
            that breaks these terms or that we consider objectionable, at any time and without
            notice.
          </p>
          <p>
            To report content, email <ContactLink /> with the snippet link and the reason.
          </p>
        </Clause>
        <Clause n={7} title="No warranty and limited liability.">
          <p>
            Supagist is provided as is and as available, without warranties of any kind. It may
            change, break, lose data or shut down. To the extent the law allows, Supagist and its
            maintainer are not liable for any damages arising from your use of it. Keep your own
            copy of anything you care about.
          </p>
        </Clause>
        <Clause n={8} title="Changes to these terms.">
          <p>
            We may update these terms. The date at the top shows the latest version. Using Supagist
            after a change means you accept the updated terms.
          </p>
        </Clause>
        <Clause n={9} title="Contact.">
          <p>
            Questions about these terms: <ContactLink />.
          </p>
        </Clause>
      </ol>
    </LegalPage>
  );
}
