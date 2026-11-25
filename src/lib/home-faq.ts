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
      'Anytap is a crypto Visa card. Top up with USDT (TRC-20) or with local currency via Easy Top Up, then pay online, in store, or withdraw cash at ATMs worldwide. No bank account is needed to apply.',
  },
  {
    question: 'What cryptocurrency is supported for top-up?',
    answer:
      'USDT on the TRC-20 network is supported, with a minimum top-up of 50 USDT. USDC is not supported. You can also top up in local currency with Easy Top Up.',
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
      'Yes. ATM withdrawals are available with the physical Visa card. The withdrawal fee is 2% (minimum $1). Daily withdrawal limit: $1,500 (up to 30 transactions). Monthly limit: $15,000. Singapore does not support ATM withdrawal. Limits apply per card. With up to 3 physical cards, you can withdraw up to 3x these limits.',
  },
  {
    question: 'Is a bank account required to apply?',
    answer:
      'No. You can apply for and use an Anytap card with just an email address and cryptocurrency. No bank account is required.',
  },
  {
    question: 'What is the cross-border transaction fee?',
    answer:
      'A fee of 1% + $0.30 per transaction applies to non-USD spending. This is the standard Visa network cross-border rate.',
  },
  {
    question: 'Can I send USDT from a Korean domestic exchange?',
    answer:
      'Direct transfers from Korean domestic exchanges may be restricted under Travel Rule regulations depending on the exchange and amount. Please check the exchange policy before transferring. Prefer not to use an exchange? With Easy Top Up you can send local currency through a remittance provider or bank in your country, and it arrives on your card as USDT.',
  },
  {
    question: 'How does the referral program work?',
    answer:
      'The Anytap referral program pays Referral Partners a card issuance bonus of $10 USDT per card and 0.2% of every top-up when referred members issue cards and top up. Commissions are calculated every week and paid in USDT the following week, with a minimum payout of 1 USDT.',
  },
  {
    question: 'Which countries are restricted?',
    answer:
      'Card issuance is not available in Cuba, Iran, North Korea, Russia, Syria, Sudan, the Crimea region, the Donetsk and Luhansk regions, and all countries and regions subject to U.S. Treasury OFAC sanctions. See the FAQ for details.',
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
