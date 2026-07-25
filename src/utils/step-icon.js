import {
  Bank,
  CheckCircle,
  ClipboardText,
  Coins,
  CreditCard,
  Gift,
  IdentificationCard,
  MagnifyingGlass,
  QrCode,
  ShieldCheck,
  Storefront,
  UserPlus,
  Wallet,
} from '@phosphor-icons/react';

const FALLBACKS = [UserPlus, ShieldCheck, CreditCard, Wallet];

const RULES = [
  { re: /\b(kyc|identity|selfie|government id|verify your identity|identification)\b/i, Icon: IdentificationCard },
  { re: /\b(sign up|register|create account|join the)\b/i, Icon: UserPlus },
  { re: /\b(referral code|your code|get your code)\b/i, Icon: Gift },
  { re: /\b(approve|approved|confirmation by email)\b/i, Icon: CheckCircle },
  { re: /\b(review|reviews your)\b/i, Icon: MagnifyingGlass },
  { re: /\b(apply|application form|fill out)\b/i, Icon: ClipboardText },
  { re: /\b(settlement|settle|settled)\b/i, Icon: Bank },
  { re: /\b(350\+|coin sent|cryptocurrenc|usdt|usdc)\b/i, Icon: Coins },
  { re: /\b(address generated|wallet address|unique wallet)\b/i, Icon: QrCode },
  { re: /\b(choose payment|checkout page|customer selects)\b/i, Icon: Storefront },
  { re: /\b(virtual|physical card|get virtual)\b/i, Icon: CreditCard },
  { re: /\b(top up|top-up|spend anywhere|spending)\b/i, Icon: Wallet },
  { re: /\b(shield|secure|compliant)\b/i, Icon: ShieldCheck },
  { re: /\b(card)\b/i, Icon: CreditCard },
  { re: /\b(pay|payment)\b/i, Icon: Storefront },
];

function resolveStepIcon(step, index = 0) {
  const text = [step.title, step.body, step.note].filter(Boolean).join(' ');
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.Icon;
  }
  return FALLBACKS[index % FALLBACKS.length];
}

export { resolveStepIcon };
