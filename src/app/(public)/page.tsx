import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"
import { buttonVariants } from "@/components/ui/button"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo"

// Answers the questions a discretionary trader actually arrives with, in plain language, so both
// search engines and AI answer engines can lift them directly — rendered as visible copy below and
// mirrored into FAQPage JSON-LD so the same content is machine-readable.
const faqs = [
  {
    question: "Why does replaying a chart you can see the name of not work?",
    answer:
      "Because you already know how it ended. Pull up EUR/USD in March 2023 and some part of you knows the dollar spiked; scroll back to March 2020 and you know what comes next. The setups you take stop being the setups you would have taken. BlindPulse masks the ticker, the dates and the headlines behind a synthetic label like Asset #842 and rebases the prices, so the only thing you can trade is what is on the screen.",
  },
  {
    question: "What is BlindPulse Replay Lab?",
    answer:
      "A market replay simulator for discretionary and aspiring prop traders. You step through real historical price action candle by candle, place orders against a server-side execution engine that enforces your own risk rules, and only after you close the session does it reveal which instrument, which dates, and which macro event you were actually trading.",
  },
  {
    question: "What happens when I blow the account?",
    answer:
      "Nothing is deleted. A reset seals the blown iteration under a chained hash and opens a new one beside it, so iteration 01 through 04 all coexist. Every trade, every journal note and every equity curve from the accounts you destroyed stays queryable — which is the only way to see whether you are actually improving or just getting luckier.",
  },
  {
    question: "How is the risk enforced?",
    answer:
      "Server-side, not in the UI. Every entry requires a hard stop loss before it is accepted, orders below your minimum risk-to-reward are rejected rather than quietly resized, and breaching your daily drawdown gate halts trading for the session. The terminal shows you the rules; the engine is what applies them.",
  },
  {
    question: "What does the post-session reveal show?",
    answer:
      "The real ticker and timeframe, the macro cycle you were trading through, your return against a buy-and-hold benchmark over the same window, and a 0-100 behavioural discipline index broken into its components — stop respect, risk consistency, overtrading and plan adherence — so a low score always points at the behaviour that caused it.",
  },
]

const pillars = [
  {
    label: "Zero hindsight",
    title: "Blinded feeds",
    body: "Normalized tick charts under synthetic identifiers. No ticker, no calendar, no news — until you choose to unblind.",
  },
  {
    label: "Server-side",
    title: "Risk bracket dock",
    body: "A hard stop before every entry, a minimum 1:2 R:R check, and a daily drawdown gate that halts the session rather than warning you.",
  },
  {
    label: "Non-destructive",
    title: "Reset trees",
    body: "A reset forks a new iteration and seals the old one under a hash chain. Your worst accounts stay readable forever.",
  },
  {
    label: "After the fact",
    title: "Mystery reveal",
    body: "The real instrument, the macro cycle, your alpha over buy-and-hold, and a discipline index you can trace to a behaviour.",
  },
]

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />
      <header className="border-b border-seam bg-panel">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <BrandMark />
          <span className="text-base font-semibold tracking-tight">BlindPulse</span>
          <span className="label-caps text-muted-foreground">Replay Lab</span>
          <nav className="ml-auto flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/register" className={buttonVariants({ size: "sm", className: "rounded-sm" })}>
              Start a session
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 md:py-20">
        <section className="max-w-3xl">
          <p className="label-caps text-telemetry">Zero-hindsight market replay</p>
          <h1 className="mt-3 text-4xl leading-[1.1] font-semibold tracking-tight md:text-5xl">
            You cannot practise judgement on a chart you already know the ending of.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">{SITE_DESCRIPTION}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/register" className={buttonVariants({ className: "rounded-sm" })}>
              Create an account
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", className: "rounded-sm" })}>
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-14 grid gap-px border border-seam bg-seam md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="bg-panel p-4">
              <p className="label-caps text-muted-foreground">{pillar.label}</p>
              <h2 className="mt-2 text-[15px] font-semibold tracking-tight">{pillar.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{pillar.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">Questions traders ask first</h2>
          <dl className="mt-6 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="border-t border-seam pt-5">
                <dt className="text-[15px] font-semibold">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-seam bg-panel">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5">
          <p className="metric text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
          <p className="metric text-xs text-muted-foreground">{SITE_URL.replace(/^https?:\/\//, "")}</p>
        </div>
      </footer>
    </>
  )
}
