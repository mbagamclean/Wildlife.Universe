'use client';

/**
 * Homepage "What Our Readers Say" section. Mirrors the Mayobe Bros
 * ReviewsSection flow (random 6 of latest 20 reviews, shuffled every
 * 8 s; inline submit form with honeypot + 60 s client cooldown +
 * server rate-limit) but themed with --color-primary and the WU
 * green palette instead of Mayobe's blue.
 *
 * Renders on the homepage just before the footer.
 */

import { useEffect, useRef, useState } from 'react';
import { Star, CheckCircle2, AlertCircle } from 'lucide-react';

function generateToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={16}
      className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--color-fg-soft)]/40'}
    />
  ));
}

export function ReviewsSection() {
  const [allReviews, setAllReviews] = useState([]);
  const [displayed, setDisplayed] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ user_name: '', rating: 5, comment: '' });
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const tokenRef = useRef(generateToken());
  const lastSubmitRef = useRef(0);

  // Load + reshuffle every 8s (Mayobe parity)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reviews', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.ok) setAllReviews(json.reviews || []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (allReviews.length === 0) return;
    const pick = () => {
      const shuffled = [...allReviews].sort(() => Math.random() - 0.5);
      setDisplayed(shuffled.slice(0, 6));
    };
    pick();
    const t = setInterval(pick, 8000);
    return () => clearInterval(t);
  }, [allReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (honeypot) return;          // bot trap — drop silently

    const now = Date.now();
    const cooldown = 60_000;
    if (now - lastSubmitRef.current < cooldown) {
      const wait = Math.ceil((cooldown - (now - lastSubmitRef.current)) / 1000);
      setErrorMsg(`Please wait ${wait} seconds before submitting again.`);
      return;
    }
    if (!formData.user_name.trim() || !formData.comment.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (formData.comment.trim().length < 10) {
      setErrorMsg('Review is too short. Please write at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: formData.user_name.trim(),
          comment: formData.comment.trim(),
          rating: formData.rating,
          token: tokenRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Submission failed');

      lastSubmitRef.current = Date.now();
      tokenRef.current = generateToken();

      // Optimistically prepend the new review so the writer sees it
      const optimistic = {
        id: data.id,
        user_name: formData.user_name.trim(),
        rating: formData.rating,
        comment: formData.comment.trim(),
        is_verified: false,
        created_at: new Date().toISOString(),
      };
      setAllReviews((prev) => [optimistic, ...prev]);

      setIsSubmitted(true);
      setFormData({ user_name: '', rating: 5, comment: '' });
      setTimeout(() => { setIsSubmitted(false); setShowForm(false); }, 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16" style={{ background: 'var(--color-bg-deep)' }}>
      <div className="mx-auto w-full max-w-[1560px] sm:w-[90%] lg:w-[85%] px-4 sm:px-0">
        {/* Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <h2 className="font-display text-3xl font-black text-[var(--color-fg)] sm:text-4xl">
            What Our Readers Say
          </h2>
          <p className="mt-3 mx-auto max-w-2xl text-sm text-[var(--color-fg-soft)] sm:text-base">
            Join thousands of wildlife enthusiasts who trust Wildlife Universe for
            stories that bring nature closer.
          </p>
        </div>

        {/* Cards grid */}
        {displayed.length > 0 && (
          <div className="mb-10 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayed.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#008000]/30 hover:shadow-[0_12px_32px_rgba(0,128,0,0.10)]"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#008000] text-lg font-bold text-white">
                    {(r.user_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate font-semibold text-[var(--color-fg)]">{r.user_name}</h4>
                      {r.is_verified && (
                        <CheckCircle2 size={15} className="flex-shrink-0 text-[#008000]" aria-label="Verified" />
                      )}
                    </div>
                    <div className="mt-1 flex gap-0.5">{renderStars(r.rating)}</div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-fg-soft)]">{r.comment}</p>
                {r.created_at && (
                  <p className="mt-4 text-xs text-[var(--color-fg-soft)]/70">
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA + Form */}
        <div className="text-center">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-[#008000] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#008000]/20 transition-all hover:-translate-y-0.5 hover:bg-[#006600] hover:shadow-xl hover:shadow-[#008000]/30"
            >
              Write a Review
            </button>
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--glass-border)] bg-[var(--color-bg)] p-6 sm:p-8 text-left">
              {isSubmitted ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={56} className="mx-auto mb-3 text-[#008000]" />
                  <h3 className="text-xl font-bold text-[var(--color-fg)]">Thank you!</h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-soft)]">
                    Your review is live now — refresh the page to see it in the rotation.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="mb-6 text-2xl font-bold text-[var(--color-fg)]">Share Your Experience</h3>

                  {errorMsg && (
                    <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-300">{errorMsg}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Honeypot — invisible to humans, often filled by bots */}
                    <input
                      type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
                    />

                    <div>
                      <label htmlFor="rv_name" className="mb-1 block text-sm font-medium text-[var(--color-fg)]">
                        Your Name
                      </label>
                      <input
                        type="text"
                        id="rv_name"
                        required
                        maxLength={80}
                        value={formData.user_name}
                        onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                        className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-2 text-sm text-[var(--color-fg)] focus:border-[#008000] focus:outline-none focus:ring-1 focus:ring-[#008000]"
                        placeholder="Jane Doe"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--color-fg)]">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData({ ...formData, rating: star })}
                            className="rounded p-1 transition-transform hover:scale-110"
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              size={30}
                              className={star <= formData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--color-fg-soft)]/40'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="rv_comment" className="mb-1 block text-sm font-medium text-[var(--color-fg)]">
                        Your Review
                      </label>
                      <textarea
                        id="rv_comment"
                        required
                        rows={4}
                        maxLength={2000}
                        value={formData.comment}
                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                        className="w-full resize-none rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-deep)] px-4 py-2 text-sm text-[var(--color-fg)] focus:border-[#008000] focus:outline-none focus:ring-1 focus:ring-[#008000]"
                        placeholder="What did you enjoy most about Wildlife Universe?"
                      />
                      <p className="mt-1 text-right text-xs text-[var(--color-fg-soft)]/70">
                        {formData.comment.length}/2000
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-[#008000] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#006600] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? 'Submitting…' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setErrorMsg(''); }}
                        className="flex-1 rounded-lg border border-[var(--glass-border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-deep)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
