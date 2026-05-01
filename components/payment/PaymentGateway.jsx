'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronLeft, Lock, Shield, CreditCard,
  Zap, Star, Crown, Gem, ArrowRight,
  Globe, RefreshCw, BadgeCheck, BookOpen, Sparkles,
} from 'lucide-react';
import { saveSubscription, saveBookPurchase } from '@/lib/storage/subscriptionDb';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PLAN DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const PLANS = [
  {
    id: 'daily',
    label: 'Daily Pass',
    price: 1.00,
    displayPrice: '$1',
    period: 'day',
    billing: 'Billed daily · cancel anytime',
    badge: null,
    icon: Zap,
    accentColor: '#4ecdc4',
    bgGradient: 'linear-gradient(140deg, #0d3535 0%, #145f58 100%)',
    glowColor: 'rgba(78,205,196,0.25)',
    features: ['All premium articles', 'Full video library', 'Ad-free experience'],
  },
  {
    id: 'weekly',
    label: 'Weekly',
    price: 5.99,
    displayPrice: '$5.99',
    period: 'week',
    billing: 'Billed weekly · cancel anytime',
    badge: null,
    icon: Star,
    accentColor: '#6b9fdb',
    bgGradient: 'linear-gradient(140deg, #0a1f3d 0%, #1a4a8a 100%)',
    glowColor: 'rgba(107,159,219,0.25)',
    features: ['Everything in Daily', 'Early access to new content', 'Offline downloads', 'Field guide access'],
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: 20.00,
    displayPrice: '$20',
    period: 'month',
    billing: 'Billed monthly · cancel anytime',
    badge: 'Most Popular',
    icon: Crown,
    accentColor: '#4caf50',
    bgGradient: 'linear-gradient(140deg, #003300 0%, #006600 100%)',
    glowColor: 'rgba(76,175,80,0.35)',
    features: ['Everything in Weekly', 'Exclusive wildlife reports', 'Priority support', 'Community & forums', 'Monthly almanac PDF'],
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: 150.00,
    displayPrice: '$150',
    period: 'year',
    billing: 'Billed annually · save 37%',
    badge: 'Best Value',
    icon: Gem,
    accentColor: '#d4af37',
    bgGradient: 'linear-gradient(140deg, #2a1f00 0%, #5a4010 100%)',
    glowColor: 'rgba(212,175,55,0.35)',
    features: ['Everything in Monthly', 'Physical wildlife almanac', 'VIP expert Q&A sessions', 'Custom profile badge', '2 months FREE vs monthly', 'Lifetime archive access'],
  },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function fmtCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
}
function fmtExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
function detectCardType(n) {
  const s = n.replace(/\s/g, '');
  if (/^4/.test(s)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(s)) return 'mc';
  if (/^3[47]/.test(s)) return 'amex';
  return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ANIMATION VARIANTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const panelVariants = {
  enter: (dir) => ({
    x: dir >= 0 ? '58%' : '-58%',
    opacity: 0,
    scale: 0.93,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 250, damping: 28, mass: 0.85 },
  },
  exit: (dir) => ({
    x: dir >= 0 ? '-58%' : '58%',
    opacity: 0,
    scale: 0.93,
    transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] },
  }),
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CARD NETWORK ICON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function NetworkIcon({ type }) {
  if (type === 'visa') return (
    <span style={{ fontFamily: 'Georgia,serif', fontWeight: 900, fontSize: 15, color: '#fff', letterSpacing: '-1px' }}>
      VISA
    </span>
  );
  if (type === 'mc') return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 36, height: 22 }}>
      <span style={{ position: 'absolute', left: 0, top: 1, width: 22, height: 22, borderRadius: '50%', background: '#eb001b', opacity: 0.92 }} />
      <span style={{ position: 'absolute', left: 14, top: 1, width: 22, height: 22, borderRadius: '50%', background: '#f79e1b', opacity: 0.92 }} />
    </span>
  );
  if (type === 'amex') return (
    <span style={{ fontFamily: 'Georgia,serif', fontWeight: 900, fontSize: 12, color: '#fff', letterSpacing: '1.5px' }}>
      AMEX
    </span>
  );
  return <CreditCard style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.35)' }} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LIVE CARD PREVIEW (3D FLIP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function LiveCardPreview({ cardNum, cardName, expiry, cvvFocused }) {
  const type = detectCardType(cardNum);
  const cardBg = type === 'visa'
    ? 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)'
    : type === 'mc'
    ? 'linear-gradient(135deg, #1b1b1b 0%, #3a3a3a 50%, #1b1b1b 100%)'
    : type === 'amex'
    ? 'linear-gradient(135deg, #006f9f 0%, #0288d1 50%, #0277bd 100%)'
    : 'linear-gradient(135deg, #0d2b1a 0%, #1a5a2a 40%, #0d2b1a 100%)';

  const rawDigits = cardNum.replace(/\s/g, '');
  const displayNum = [0, 4, 8, 12].map((s) =>
    rawDigits.slice(s, s + 4).padEnd(4, '•')
  ).join('  ');

  const displayName = cardName.trim().toUpperCase() || 'FULL NAME';
  const displayExpiry = expiry || 'MM/YY';

  return (
    <div style={{ perspective: '1000px', width: '100%', maxWidth: 340, margin: '0 auto' }}>
      <motion.div
        animate={{ rotateY: cvvFocused ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', height: 200, width: '100%' }}
      >
        {/* Front */}
        <div style={{
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          position: 'absolute', inset: 0, background: cardBg, borderRadius: 18,
          padding: '22px 26px', boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Chip + Network */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: 40, height: 30, borderRadius: 6,
              background: 'linear-gradient(135deg, #c9a227 0%, #f0d060 50%, #c9a227 100%)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr', gap: 2, padding: 5,
            }}>
              {[...Array(9)].map((_, i) => (
                <div key={i} style={{ background: i === 4 ? 'rgba(0,0,0,0.35)' : 'rgba(180,140,0,0.55)', borderRadius: 1 }} />
              ))}
            </div>
            <NetworkIcon type={type} />
          </div>

          {/* Number */}
          <div style={{
            fontFamily: "'Courier New',monospace", fontSize: 19,
            letterSpacing: '0.14em', color: 'rgba(255,255,255,0.92)',
            fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}>
            {displayNum}
          </div>

          {/* Name + Expiry */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Card Holder</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 700, letterSpacing: '0.06em', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>Expires</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{displayExpiry}</div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div style={{
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
          borderRadius: 18, boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
          transform: 'rotateY(180deg)', overflow: 'hidden',
        }}>
          {/* Magnetic strip */}
          <div style={{ width: '100%', height: 44, background: '#111', marginTop: 30, marginBottom: 20 }} />
          {/* Signature + CVV */}
          <div style={{ padding: '0 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, height: 38, borderRadius: 4,
              background: 'repeating-linear-gradient(45deg, #f5f5f5 0, #f5f5f5 4px, #e0e0e0 4px, #e0e0e0 8px)',
              display: 'flex', alignItems: 'center', paddingLeft: 8,
            }}>
              <span style={{ fontFamily: 'cursive', fontSize: 12, color: '#555' }}>{displayName.toLowerCase()}</span>
            </div>
            <div style={{
              width: 56, height: 38, background: '#fff', borderRadius: 4,
              border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#222', letterSpacing: '0.1em' }}>CVV</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
            3-DIGIT SECURITY CODE ON BACK OF CARD
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PLAN CARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PlanCard({ plan, onSelect, index }) {
  const [hovered, setHovered] = useState(false);
  const Icon = plan.icon;
  const isPopular = plan.badge === 'Most Popular';
  const isBest = plan.badge === 'Best Value';

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 280, damping: 26 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: plan.bgGradient,
        borderRadius: 20,
        padding: '28px 22px 22px',
        border: `1px solid ${hovered || isPopular ? plan.accentColor + '55' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered || isPopular
          ? `0 0 0 1px ${plan.accentColor}25, 0 20px 56px ${plan.glowColor}, 0 4px 24px rgba(0,0,0,0.45)`
          : '0 4px 20px rgba(0,0,0,0.35)',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex', flexDirection: 'column', cursor: 'default',
      }}
    >
      {/* Badge */}
      {plan.badge && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: isPopular ? plan.accentColor : 'linear-gradient(90deg, #b8860b, #d4af37, #b8860b)',
          color: '#000', fontWeight: 800, fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap',
          boxShadow: `0 2px 14px ${plan.glowColor}`,
        }}>
          {plan.badge}
        </div>
      )}

      {/* Icon + Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: `${plan.accentColor}1a`, border: `1px solid ${plan.accentColor}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 22, height: 22, color: plan.accentColor }} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{plan.label}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 2 }}>
            {plan.billing}
          </div>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 46, fontWeight: 900, color: plan.accentColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {plan.displayPrice}
        </span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/{plan.period}</span>
      </div>

      {/* Features */}
      <div style={{ flex: 1, marginBottom: 22 }}>
        {plan.features.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
            <div style={{
              width: 17, height: 17, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: `${plan.accentColor}22`, border: `1px solid ${plan.accentColor}45`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check style={{ width: 9, height: 9, color: plan.accentColor }} />
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect(plan)}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, cursor: 'pointer',
          background: hovered ? plan.accentColor : `${plan.accentColor}1e`,
          border: `1px solid ${plan.accentColor}55`,
          color: hovered ? (plan.id === 'yearly' ? '#1a1000' : '#000') : plan.accentColor,
          fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
          transition: 'all 0.22s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          fontFamily: 'inherit',
          boxShadow: hovered ? `0 4px 20px ${plan.glowColor}` : 'none',
        }}
      >
        Get {plan.label}
        <ArrowRight style={{ width: 15, height: 15 }} />
      </button>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PLAN SELECTOR PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PlanSelector({ onSelect }) {
  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center', marginBottom: 44 }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: '#4caf50', background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.22)',
          borderRadius: 99, padding: '5px 16px', marginBottom: 18,
        }}>
          <Sparkles style={{ width: 11, height: 11 }} />
          Premium Access
        </span>
        <h2 style={{
          fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, color: '#fff',
          lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 14px',
        }}>
          Choose Your Plan
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Unlimited access to premium wildlife content, ad-free experience, and exclusive features.
        </p>
      </motion.div>

      {/* Plan grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, maxWidth: 980, margin: '0 auto',
      }}>
        {PLANS.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} onSelect={onSelect} index={i} />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.05em' }}
      >
        🔒 Secure payments · Cancel anytime · No hidden fees
      </motion.p>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FORM INPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FormInput({ label, id, error, icon: Icon, onFocus: externalFocus, onBlur: externalBlur, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label htmlFor={id} style={{
          display: 'block', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: focused ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.36)',
          marginBottom: 6, transition: 'color 0.18s',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            width: 15, height: 15,
            color: focused ? 'rgba(76,175,80,0.75)' : 'rgba(255,255,255,0.22)',
            transition: 'color 0.18s', pointerEvents: 'none',
          }} />
        )}
        <input
          id={id}
          onFocus={(e) => { setFocused(true); externalFocus?.(e); }}
          onBlur={(e) => { setFocused(false); externalBlur?.(e); }}
          {...rest}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: Icon ? '12px 13px 12px 38px' : '12px 13px',
            background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${error ? '#ef4444' : focused ? 'rgba(76,175,80,0.55)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, color: '#f0f0f0', fontSize: 14,
            outline: 'none', fontFamily: 'inherit',
            boxShadow: focused
              ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.12)' : 'rgba(76,175,80,0.1)'}`
              : 'none',
            transition: 'all 0.18s',
          }}
        />
      </div>
      {error && (
        <p style={{ fontSize: 11, color: '#f87171', marginTop: 4, letterSpacing: '0.02em' }}>{error}</p>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAYMENT FORM PANEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PaymentForm({ plan, bookItem, onBack, onSuccess }) {
  const [cardNum, setCardNum]   = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry]     = useState('');
  const [cvv, setCvv]           = useState('');
  const [email, setEmail]       = useState('');
  const [cvvFocused, setCvvFocused] = useState(false);
  const [errors, setErrors]     = useState({});
  const [processing, setProcessing] = useState(false);

  const orderTitle = bookItem ? bookItem.title : `${plan.label} Subscription`;
  const orderPrice = bookItem ? bookItem.price : plan.price;
  const orderBilling = bookItem ? 'One-time purchase' : plan.billing;
  const orderColor = bookItem ? '#d4af37' : plan?.accentColor;

  function validate() {
    const e = {};
    if (cardNum.replace(/\s/g, '').length < 16) e.cardNum = 'Enter a valid 16-digit card number';
    if (!cardName.trim() || cardName.trim().split(/\s+/).length < 2) e.cardName = 'Enter your full name as on the card';
    const parts = expiry.split('/');
    const mm = parseInt(parts[0]); const yy = parseInt(parts[1]);
    if (!mm || mm < 1 || mm > 12 || !yy) e.expiry = 'Invalid expiry date';
    const cvvMax = detectCardType(cardNum) === 'amex' ? 4 : 3;
    if (cvv.length < 3) e.cvv = `Enter ${cvvMax}-digit CVV`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    return e;
  }

  async function handlePay() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setProcessing(true);
    setErrors({});
    await new Promise((r) => setTimeout(r, 1800));
    if (bookItem) saveBookPurchase(bookItem);
    else saveSubscription(plan);
    setProcessing(false);
    onSuccess();
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.65)', cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.18s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
        >
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
            Secure Checkout
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0', letterSpacing: '0.02em' }}>
            Your payment is protected with 256-bit SSL encryption
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <Lock style={{ width: 12, height: 12, color: '#4caf50' }} />
          <span style={{ fontSize: 11, color: '#4caf50', fontWeight: 600 }}>SSL Secured</span>
        </div>
      </div>

      {/* Breadcrumb steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        {['Choose Plan', 'Payment', 'Confirmation'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: i === 1 ? 1 : 0.4,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i === 0 ? 'rgba(76,175,80,0.2)' : i === 1 ? '#4caf50' : 'rgba(255,255,255,0.1)',
                border: `1.5px solid ${i === 0 ? '#4caf50' : i === 1 ? '#4caf50' : 'rgba(255,255,255,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: i === 1 ? '#fff' : i === 0 ? '#4caf50' : 'rgba(255,255,255,0.4)',
              }}>
                {i === 0 ? <Check style={{ width: 11, height: 11 }} /> : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === 1 ? 700 : 500, color: i === 1 ? '#fff' : 'rgba(255,255,255,0.4)' }}>{s}</span>
            </div>
            {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="wu-payment-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' }}>
        {/* LEFT: Card preview + form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <LiveCardPreview cardNum={cardNum} cardName={cardName} expiry={expiry} cvvFocused={cvvFocused} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormInput id="card-num" label="Card Number" icon={CreditCard}
              placeholder="1234 5678 9012 3456" value={cardNum}
              onChange={(e) => setCardNum(fmtCard(e.target.value))}
              error={errors.cardNum} autoComplete="cc-number" inputMode="numeric"
            />
            <FormInput id="card-name" label="Cardholder Name"
              placeholder="John Doe" value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              error={errors.cardName} autoComplete="cc-name"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormInput id="expiry" label="Expiry Date" placeholder="MM/YY" value={expiry}
                onChange={(e) => setExpiry(fmtExpiry(e.target.value))}
                error={errors.expiry} autoComplete="cc-exp" inputMode="numeric"
              />
              <FormInput id="cvv" label="CVV / CVC" placeholder="•••" value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, detectCardType(cardNum) === 'amex' ? 4 : 3))}
                onFocus={() => setCvvFocused(true)} onBlur={() => setCvvFocused(false)}
                error={errors.cvv} autoComplete="cc-csc" inputMode="numeric"
              />
            </div>
            <FormInput id="email" label="Email Address"
              placeholder="you@example.com" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email} autoComplete="email"
            />
          </div>
        </div>

        {/* RIGHT: Order summary + pay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Order summary */}
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
              Order Summary
            </div>
            <div style={{
              background: `${orderColor}0e`, border: `1px solid ${orderColor}28`,
              borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            }}>
              {!bookItem && plan && (() => {
                const Icon = plan.icon;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon style={{ width: 15, height: 15, color: orderColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{orderTitle}</span>
                  </div>
                );
              })()}
              {bookItem && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <BookOpen style={{ width: 15, height: 15, color: orderColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{orderTitle}</span>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{orderBilling}</div>
            </div>

            {/* Line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Subtotal', value: `$${orderPrice.toFixed(2)}` },
                { label: 'Tax', value: '$0.00' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: orderColor }}>
                  ${orderPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={processing}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 12, cursor: processing ? 'not-allowed' : 'pointer',
              background: processing ? 'rgba(76,175,80,0.28)' : 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
              border: 'none', color: '#fff', fontSize: 15, fontWeight: 800,
              letterSpacing: '0.04em', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: processing ? 'none' : '0 4px 22px rgba(76,175,80,0.38)',
              transition: 'all 0.22s ease',
            }}
            onMouseEnter={(e) => { if (!processing) e.currentTarget.style.boxShadow = '0 6px 30px rgba(76,175,80,0.55)'; }}
            onMouseLeave={(e) => { if (!processing) e.currentTarget.style.boxShadow = '0 4px 22px rgba(76,175,80,0.38)'; }}
          >
            {processing ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}>
                  <RefreshCw style={{ width: 17, height: 17 }} />
                </motion.div>
                Processing…
              </>
            ) : (
              <>
                <Lock style={{ width: 15, height: 15 }} />
                Pay ${orderPrice.toFixed(2)}
              </>
            )}
          </button>

          {/* Trust signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              [Shield, '256-bit SSL encryption'],
              [BadgeCheck, 'PCI DSS compliant'],
              [Globe, 'Cancel anytime, no commitment'],
            ].map(([Icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon style={{ width: 13, height: 13, color: 'rgba(76,175,80,0.65)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Accepted cards */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginBottom: 7, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Accepted Cards
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
              {['VISA', 'MASTERCARD', 'AMEX'].map((n) => (
                <div key={n} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5, padding: '4px 7px', fontSize: 8, fontWeight: 800,
                  color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em',
                }}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .wu-payment-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUCCESS VIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SuccessView({ plan, bookItem, onExplore }) {
  const accentColor = bookItem ? '#d4af37' : (plan?.accentColor ?? '#4caf50');
  const isBook = !!bookItem;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 64, maxWidth: 500, margin: '0 auto' }}
    >
      {/* Animated SVG checkmark */}
      <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 32px' }}>
        <motion.svg viewBox="0 0 96 96" style={{ width: '100%', height: '100%' }}>
          <motion.circle cx="48" cy="48" r="42" fill="none" stroke={accentColor}
            strokeWidth="2.5" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          <motion.path d="M 27 48 L 43 64 L 69 34" fill="none" stroke={accentColor}
            strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.55, ease: 'easeOut' }}
          />
        </motion.svg>
        <div style={{
          position: 'absolute', inset: -24,
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 65%)`,
          borderRadius: '50%', pointerEvents: 'none',
        }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>
          {isBook ? 'Purchase Complete!' : 'You\'re Subscribed!'}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
          {isBook
            ? `"${bookItem.title}" is now in your library. Enjoy your read!`
            : `Welcome to Wildlife Universe Premium. Your ${plan.label} plan is active.`}
        </p>

        <div style={{
          background: `${accentColor}0d`, border: `1px solid ${accentColor}22`,
          borderRadius: 14, padding: '18px 22px', marginBottom: 28, textAlign: 'left',
        }}>
          {(isBook ? [
            '✓ Book unlocked in your library',
            '✓ Download available in your profile',
            '✓ Ad-free experience enabled',
            '✓ Confirmation email sent',
          ] : [
            '✓ All premium articles unlocked',
            '✓ Video library fully accessible',
            '✓ Ad-free experience enabled',
            '✓ Confirmation email sent',
          ]).map((line) => (
            <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
              <span style={{ color: accentColor, fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span>{line.slice(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onExplore}
            style={{
              padding: '13px 32px', borderRadius: 11,
              background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 22px rgba(76,175,80,0.32)',
            }}
          >
            Start Exploring →
          </button>
          <Link
            href="/profile"
            style={{
              padding: '13px 32px', borderRadius: 11,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: 600,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            View Profile
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN EXPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function PaymentGateway({ bookItem = null }) {
  const router = useRouter();
  const [[step, dir], setStepDir] = useState(bookItem ? ['payment', 0] : ['plans', 0]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const goToPayment = (plan) => { setSelectedPlan(plan); setStepDir(['payment', 1]); };
  const goBack      = () => setStepDir(['plans', -1]);
  const goToSuccess = () => setStepDir(['success', 1]);

  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          custom={dir}
          variants={panelVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ width: '100%' }}
        >
          {step === 'plans' && (
            <PlanSelector onSelect={goToPayment} />
          )}
          {step === 'payment' && (
            <PaymentForm
              plan={selectedPlan}
              bookItem={bookItem}
              onBack={bookItem ? () => router.back() : goBack}
              onSuccess={goToSuccess}
            />
          )}
          {step === 'success' && (
            <SuccessView
              plan={selectedPlan}
              bookItem={bookItem}
              onExplore={() => router.push('/')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
