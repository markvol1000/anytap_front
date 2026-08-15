export interface HomeFaqItem {
  question: string;
  answer: string;
}

/**
 * Homepage FAQ copy.
 * Source of truth pending final review from the team Telegram FAQ document —
 * entries below mirror portal support FAQ + card marketing Q&A until that doc is pasted in.
 */
export const HOME_FAQ: HomeFaqItem[] = [
  {
    question: 'What is Anytap?',
    answer:
      'Anytap is a crypto debit card that lets you spend USDT and USDC anywhere Visa is accepted — online, in-store, and via Apple Pay, Google Pay, or Samsung Pay.',
  },
  {
    question: 'How long does a USDT top-up take?',
    answer:
      'Most deposits credit your card within 1–5 minutes after on-chain confirmation. TRC-20 (TRON) is recommended for the fastest and cheapest settlement.',
  },
  {
    question: 'Which network should I use for deposits?',
    answer:
      'Only TRC-20 (TRON) for USDT. Deposits sent on any other network may be permanently lost. Always copy your Anytap deposit address carefully.',
  },
  {
    question: 'What is the difference between virtual and physical cards?',
    answer:
      'The Physical Card uses the Visa network for offline payments and ATM withdrawals. The virtual card is scheduled to launch after November.',
  },
  {
    question: 'Who can apply for an Anytap card?',
    answer:
      'Anyone 18 or older with a valid passport or driver’s license can apply. No traditional bank account is required — just complete KYC and apply for a physical Visa card.',
  },
  {
    question: 'Why was my deposit not credited?',
    answer:
      'Some exchanges restrict withdrawals to non-whitelisted wallets. Confirm your exchange allows transfers to your Anytap deposit address, and that you used TRC-20.',
  },
  {
    question: 'Is Apple Pay / Google Pay / Samsung Pay supported?',
    answer:
      'Google Pay is supported on the physical Visa card. Apple Pay support is under review. Samsung Pay is planned starting November 2026.',
  },
];
