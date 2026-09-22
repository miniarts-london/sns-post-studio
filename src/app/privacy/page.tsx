import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Post Studio",
  description:
    "How Post Studio collects, uses, and deletes data when you draft and publish posts.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-[#0a66c2] hover:underline">
        Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#666]">Last updated: 22 September 2026</p>
      <div className="mt-6 space-y-4 text-sm leading-6 text-[#333]">
        <p>
          This privacy policy is for Post Studio, a personal tool that drafts
          social posts with Claude and publishes them to LinkedIn or a Facebook
          Page you manage.
        </p>
        <h2 className="pt-2 text-base font-semibold text-[#191919]">
          What we collect
        </h2>
        <p>
          The topic you type, an optional photo you attach, and the draft you
          confirm. If you connect LinkedIn or Facebook, we also store an access
          token and your display name in an httpOnly cookie on this app so we
          can publish on your behalf.
        </p>
        <h2 className="pt-2 text-base font-semibold text-[#191919]">
          How we use it
        </h2>
        <p>
          Your topic and photo are sent to Anthropic so Claude can write a
          draft. If you click Post to LinkedIn, the draft and photo are sent to
          LinkedIn’s official API and published as you. If you click Post to
          Facebook, they are sent to Meta’s Graph API and published as the Page
          you select. Facebook posts are not published to a personal profile.
        </p>
        <h2 className="pt-2 text-base font-semibold text-[#191919]">
          Who receives data
        </h2>
        <p>
          Anthropic (draft generation), LinkedIn (if you connect and post), and
          Meta / Facebook (if you connect and post). We do not sell your data.
          Tokens are not written to a database.
        </p>
        <h2 className="pt-2 text-base font-semibold text-[#191919]">
          How to delete your data
        </h2>
        <p>
          Click Disconnect next to LinkedIn or Facebook in the app header. That
          deletes the session cookie for that service. Drafts and photos live
          only in your browser until you generate or post; closing the tab
          removes them. Published posts stay on LinkedIn or Facebook until you
          delete them there.
        </p>
        <p>
          Do not upload photos you do not have the right to share.
        </p>
      </div>
    </main>
  );
}
