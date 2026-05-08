import { Container } from '@/components/ui/Container';

function normalize(faq) {
  if (!Array.isArray(faq)) return [];
  return faq
    .map((entry) => ({
      question: String(entry?.question ?? '').trim(),
      answer: String(entry?.answer ?? '').trim(),
    }))
    .filter((entry) => entry.question && entry.answer);
}

export function PostFaq({ faq }) {
  const entries = normalize(faq);
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="post-faq-heading"
      className="border-t border-[var(--glass-border)] bg-[var(--color-bg)] py-16"
    >
      <Container className="max-w-3xl">
        <h2
          id="post-faq-heading"
          className="mb-8 font-display text-3xl font-black text-[var(--color-fg)] sm:text-4xl"
        >
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-5 py-4 transition-colors open:bg-[var(--color-bg)]"
              open={idx === 0}
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-[var(--color-fg)] marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{entry.question}</span>
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-5 w-5 flex-none rotate-0 text-[var(--color-fg-soft)] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-line text-[var(--color-fg-soft)]">
                {entry.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
