export interface HomeFaqItem {
  question: string;
  answer: string;
}

/**
 * Homepage FAQ — 보강판 2-7-B 확정 10문항.
 * Visible copy and FAQPage JSON-LD must stay in sync.
 */
export const HOME_FAQ: HomeFaqItem[] = [
  {
    question: 'What is Anytap?',
    answer:
      'Anytap is a cryptocurrency debit card service. Load USDT onto your card and use it at Visa merchants worldwide for online payments, offline purchases, and ATM withdrawals. No bank account required.',
  },
  {
    question: 'What cryptocurrency is supported for top-up?',
    answer:
      'USDT via the TRC-20 network is supported, with a minimum top-up of 30 USDT. TRC-20 offers low network fees and fast processing.',
  },
  {
    question: 'What is the virtual card issuance fee?',
    answer: 'The virtual card issuance fee is 20 USDT.',
  },
  {
    question: 'How long does a top-up take to appear?',
    answer:
      'TRC-20 transactions are typically reflected within 1 to 2 minutes after on-chain confirmation. Delays may occur during network congestion.',
  },
  {
    question: 'Can I withdraw cash from ATMs?',
    answer:
      'Yes. ATM withdrawals are available with the physical Visa card. The withdrawal fee is 2% (minimum $1). Daily withdrawal limit: $1,500 (up to 30 transactions). Monthly limit: $15,000. Singapore does not support ATM withdrawal.',
  },
  {
    question: 'Is a bank account required to apply?',
    answer:
      'No. You can apply for and use an Anytap card with just an email address and cryptocurrency. No bank account is required.',
  },
  {
    question: 'What is the cross-border transaction fee?',
    answer:
      'A cross-border transaction fee of 1% plus $0.30 applies per transaction when spending in currencies other than USD.',
  },
  {
    question: 'Can I send USDT from a Korean domestic exchange?',
    answer:
      'Direct transfers from Korean domestic exchanges may be restricted under Travel Rule regulations depending on the exchange and amount. Please check the exchange policy before transferring.',
  },
  {
    question: 'How does the referral program work?',
    answer:
      'The Anytap referral program pays a portion of card issuance and top-up fees to referrers when referred members issue cards and top up. Silver and Premium tiers are available, with higher rewards at Premium. Commissions are settled monthly in USDT, with a minimum payout of $1.',
  },
  {
    question: 'Which countries are restricted?',
    answer:
      'Card issuance is unavailable in a defined list of restricted countries due to compliance requirements. Details are available in the Terms of Service.',
  },
];

export function faqPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HOME_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
