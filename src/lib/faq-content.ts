export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
export interface FaqSection {
  title: string;
  items: FaqItem[];
}
/** Full FAQ — sourced from Anytap FAQ document (November 2026). */
export const FAQ_SECTIONS: FaqSection[] = [
  {
    "title": "Service Overview (Q1–Q10)",
    "items": [
      {
        "id": "Q1",
        "question": "What is Anytap?",
        "answer": "Anytap is a cryptocurrency prepaid card service. Top up your Visa card with USDT (TRC-20) — or with local currency through Easy Top Up — and use it for online payments, in-store payments and ATM withdrawals at merchants worldwide. You can start with just an online application. No bank account link is required."
      },
      {
        "id": "Q2",
        "question": "What network does the Anytap card use?",
        "answer": "All Anytap cards — both virtual and physical — are issued on the Visa network.\nType — Network — Main use\nVirtual Card — Visa — Online payments, mobile wallets (Apple Pay, Google Pay, Samsung Pay)\nPhysical Card — Visa — In-store payments, ATM withdrawals, mobile wallets"
      },
      {
        "id": "Q3",
        "question": "Which cryptocurrencies are supported?",
        "answer": "Only USDT on the TRC-20 (TRON) network is supported. USDC, BTC, ETH and other cryptocurrencies are not supported. You can also top up in your local currency with Easy Top Up."
      },
      {
        "id": "Q4",
        "question": "Do I need to install an app?",
        "answer": "No separate app installation is required. The service can be used entirely through a web browser. Anytap is provided as a Progressive Web App (PWA), so you can add it to your smartphone home screen and use it like an app."
      },
      {
        "id": "Q5",
        "question": "Which countries can use the service?",
        "answer": "Card payments are available anywhere Visa is accepted. However, card issuance is not available in the following countries and regions due to regulatory and sanctions policies:\nCuba\nIran\nNorth Korea\nRussia\nSyria\nSudan\nCrimea region\nDonetsk and Luhansk regions (DNR / LNR)\nAll countries and regions subject to U.S. Treasury OFAC sanctions\nThere may be additional restricted countries beyond this list. If issuance eligibility for a specific country is unclear, contact support@anytap.io before applying."
      },
      {
        "id": "Q6",
        "question": "Can I use the service without a bank account?",
        "answer": "Yes. Anytap lets you receive and use a card through an online application alone, without linking a bank account."
      },
      {
        "id": "Q7",
        "question": "Where can I use my Anytap card for payments?",
        "answer": "It can be used at any Visa merchant worldwide, both online and in store. ATM withdrawals are supported with the physical card.\nRepresentative merchants: Netflix, Amazon, ChatGPT Plus, AWS, Booking.com, Adobe, and others."
      },
      {
        "id": "Q8",
        "question": "What is Anytap's security framework?",
        "answer": "Anytap operates a 3-layer risk management framework.\nLayer 1 — Real-time rule engine: analyzes every transaction in real time using 200+ rules, automatically blocking high-risk merchants\nLayer 2 — Behavior-based model: detects anomalous transactions based on region, payment patterns and device information\nLayer 3 — AI detection system: assigns a risk score of 0–100 to each transaction, then automatically approves, declines or requests additional authentication\nExternal security partners: Chainalysis, TRM Labs, Elliptic, Sumsub."
      },
      {
        "id": "Q9",
        "question": "How many cards can I hold per person?",
        "answer": "You can hold up to 3 physical cards per person. Limits apply per card, so with 3 physical cards you can spend and withdraw up to 3x the single-card limits. There is no annual fee on any card."
      },
      {
        "id": "Q10",
        "question": "How can I get customer support?",
        "answer": "Email inquiries: support@anytap.io\nBusiness and partnership inquiries: biz@anytap.io\nCustomer support is provided in English only.\nWe respond within a maximum of 72 hours of receiving your inquiry. Lost-card reports are prioritized 24/7."
      }
    ]
  },
  {
    "title": "Sign-up and KYC (Q11–Q21)",
    "items": [
      {
        "id": "Q11",
        "question": "How do I sign up?",
        "answer": "Sign up on the Anytap website with your email address and password. Registration is completed once email verification and the KYC (identity verification) process are confirmed."
      },
      {
        "id": "Q12",
        "question": "Where do I enter a referral code?",
        "answer": "Enter your referrer's code in the Referral Code field on the sign-up screen. It cannot be entered after registration is complete, so be sure to confirm it at the time of sign-up."
      },
      {
        "id": "Q13",
        "question": "What is KYC (identity verification) and why is it needed?",
        "answer": "KYC (Know Your Customer) is a mandatory identity verification procedure required under international anti-money laundering (AML) regulations. Card issuance and top-up services cannot be used until it is complete."
      },
      {
        "id": "Q14",
        "question": "What documents are needed to apply for KYC?",
        "answer": "A valid government-issued ID (a passport is strongly recommended — national ID cards may cause recognition errors or review delays)\nProof of residence may be additionally requested if needed"
      },
      {
        "id": "Q15",
        "question": "How long does KYC approval take?",
        "answer": "It is generally processed immediately, though it may take up to 2 business days."
      },
      {
        "id": "Q16",
        "question": "My KYC was rejected. What should I do?",
        "answer": "It may be rejected if the ID photo is unclear or the ID information does not match. After checking the reason for rejection, resubmit your documents or contact support@anytap.io."
      },
      {
        "id": "Q17",
        "question": "Can someone under 18 apply?",
        "answer": "No. Anytap cards are only available to applicants aged 18 and older."
      },
      {
        "id": "Q18",
        "question": "How is personal information collected during KYC managed?",
        "answer": "Personal information collected during the KYC process is securely managed in accordance with the legally required retention period. See the Privacy Policy for details."
      },
      {
        "id": "Q19",
        "question": "I forgot my password. How do I reset it?",
        "answer": "Click \"Forgot Password?\" on the login screen, and a reset link will be sent to your registered email address. Use the link to set a new password."
      },
      {
        "id": "Q20",
        "question": "Can I change my email address?",
        "answer": "Email address changes are handled by the customer support team. Contact support@anytap.io."
      },
      {
        "id": "Q21",
        "question": "I want to close my account. How do I do that?",
        "answer": "To request account closure, email support@anytap.io with the following information:\nFull legal name (as used for KYC registration)\nRegistered email address\nCopy of the ID used for KYC (e.g., passport)\nProcessing instructions will be provided within a maximum of 72 hours of receipt. If a balance remains, separate instructions for handling it will be provided before the account closure is processed."
      }
    ]
  },
  {
    "title": "Card Issuance (Q22–Q30)",
    "items": [
      {
        "id": "Q22",
        "question": "How do I apply for a card?",
        "answer": "After completing registration and KYC, you can apply for a virtual or physical Visa card from the dashboard."
      },
      {
        "id": "Q23",
        "question": "How much does card issuance cost?",
        "answer": "Card — Issuance fee\nVirtual Card — 20 USDT\nPhysical Card — 100 USDT\nYou can hold up to 3 physical cards per person. There is no annual fee."
      },
      {
        "id": "Q24",
        "question": "How long does physical card delivery take?",
        "answer": "Physical cards are typically delivered around 7–14 days after application. All cards are shipped directly by Anytap."
      },
      {
        "id": "Q25",
        "question": "Can I add my card to Apple Pay?",
        "answer": "Yes. Since November 2026, both virtual and physical cards can be added to Apple Pay."
      },
      {
        "id": "Q26",
        "question": "How do I register for Google Pay?",
        "answer": "Both virtual and physical cards support Google Pay. In the Google Wallet app, select \"Add card\" and enter the card number, expiration date and CVV."
      },
      {
        "id": "Q27",
        "question": "Is Samsung Pay supported?",
        "answer": "Yes. Since November 2026, both virtual and physical cards can be added to Samsung Pay."
      },
      {
        "id": "Q28",
        "question": "What happens when my card expires?",
        "answer": "Cards are not automatically renewed after expiration. After expiration, you must submit a new card issuance application. Advance notice will be sent via dashboard notification before the expiration date."
      },
      {
        "id": "Q29",
        "question": "Where can I check my card number and CVV?",
        "answer": "You can check them in the Card Management tab of the dashboard. For security, card details are only displayed when you tap directly on that screen."
      },
      {
        "id": "Q30",
        "question": "What if I lose or damage my physical card?",
        "answer": "If your card is lost or damaged, the existing card cannot be reused. You must submit a new issuance application.\nStep 1: Immediately lock the card in the Card Management tab of the dashboard\nStep 2: Apply for new card issuance (the physical card issuance fee of 100 USDT applies again)\nIf theft is suspected, after locking the card, email support@anytap.io with your full legal name, registered email and the circumstances of the loss."
      }
    ]
  },
  {
    "title": "Top-up (Q31–Q45)",
    "items": [
      {
        "id": "Q31",
        "question": "How do I top up my card?",
        "answer": "There are two ways to top up:\nUSDT: Check your personal USDT deposit address (TRC-20) in the Wallet tab of the dashboard, then send USDT to that address from an exchange or a personal wallet. Enter the desired amount and press the card top-up button.\nEasy Top Up: Send local currency through a remittance provider or bank in your country. It is converted to USDT and added to your card. See the Easy Top Up page and Q46–Q50."
      },
      {
        "id": "Q32",
        "question": "Where can I find my TRC-20 address?",
        "answer": "Your personal TRC-20 USDT deposit address is shown in the Wallet tab of the dashboard. This address is for your use only — do not share it with anyone else."
      },
      {
        "id": "Q33",
        "question": "How long after topping up does it reflect on the card?",
        "answer": "Under normal conditions, it reflects on the card after on-chain confirmation. The TRC-20 network typically processes within 1–2 minutes. It may be delayed during network congestion."
      },
      {
        "id": "Q34",
        "question": "Is there a minimum top-up amount?",
        "answer": "The minimum top-up amount is 50 USDT."
      },
      {
        "id": "Q35",
        "question": "Is there a maximum top-up amount?",
        "answer": "No. There is no maximum limit on the amount of a single top-up."
      },
      {
        "id": "Q36",
        "question": "What is the top-up fee?",
        "answer": "The top-up fee is 2% of the deposit amount, deducted in USDT at the time of top-up. The net amount is reflected in the card balance.\nExample: Depositing 100 USDT incurs a 2 USDT fee, so 98 USDT is credited."
      },
      {
        "id": "Q37",
        "question": "Can I deposit using a network other than TRC-20?",
        "answer": "Only the TRC-20 network is supported. Sending via other networks such as ERC-20 or BEP-20 may result in loss of funds. Always send via TRC-20 (TRON network)."
      },
      {
        "id": "Q38",
        "question": "Can I send money to another Anytap member?",
        "answer": "Yes. You can transfer balance between Anytap cards using only the recipient's email address — no wallet address is needed. Card-to-card transfers are free, and wallet transfers between Anytap members are also free."
      },
      {
        "id": "Q39",
        "question": "I sent USDT to the wrong address. Can it be recovered?",
        "answer": "Due to the nature of blockchain transactions, assets sent to the wrong address cannot be recovered. Always verify the address carefully before sending."
      },
      {
        "id": "Q40",
        "question": "I accidentally sent via ERC-20. What happens?",
        "answer": "Sending ERC-20 USDT to a TRC-20 address may result in loss of funds and may not be recoverable. Contact support@anytap.io immediately with the transaction hash (TXID)."
      },
      {
        "id": "Q41",
        "question": "My deposited USDT is not reflected.",
        "answer": "Check the following items in order:\nConfirm the on-chain transaction has received at least 1–2 confirmations\nConfirm the deposit address is a TRC-20 network address\nIf it is still not reflected after more than 30 minutes, contact support@anytap.io with the transaction hash (TXID)."
      },
      {
        "id": "Q42",
        "question": "Where can I view my top-up history?",
        "answer": "You can check deposit status and history in the Wallet tab or Transactions tab of the dashboard."
      },
      {
        "id": "Q43",
        "question": "Can I withdraw my balance to an external wallet?",
        "answer": "Yes. You can withdraw to an external TRC-20 wallet from the Wallet tab of the dashboard.\nExternal wallet transfer fee: 3% of the amount, plus a network gas fee of 3 USDT per transaction\nThe withdrawal address must support TRC-20 USDT\nOnly KYC-completed customers may request external withdrawals"
      },
      {
        "id": "Q44",
        "question": "Can I top up with USDC?",
        "answer": "No. USDC is not supported. Only USDT on the TRC-20 network can be used for crypto top-ups."
      },
      {
        "id": "Q45",
        "question": "Can my top-up address change?",
        "answer": "Anytap assigns each customer a dedicated TRC-20 deposit address. If the address changes, you will be notified separately via the dashboard."
      }
    ]
  },
  {
    "title": "Easy Top Up (Q46–Q50)",
    "items": [
      {
        "id": "Q46",
        "question": "Why does Anytap offer Easy Top Up?",
        "answer": "In some countries there is no easy access to crypto exchanges, which makes buying USDT difficult. Easy Top Up solves this. When you deposit local currency (fiat), Anytap helps you buy USDT through a virtual account issued overseas and tops up your Anytap card. You do not need a crypto exchange account or a personal wallet.\nEasy Top Up is coming soon. The launch will be announced on the Anytap website."
      },
      {
        "id": "Q47",
        "question": "How does Easy Top Up work?",
        "answer": "Send local currency through a remittance provider or bank in your country to your personal virtual account. The funds arrive in USD, are converted to USDT through an on-ramp service, and are added to your Anytap card. Each member gets one personal virtual account. If you have one card, it is topped up automatically; if you have two or more, you choose which card to top up."
      },
      {
        "id": "Q48",
        "question": "Who provides the on-ramp service? Is it licensed?",
        "answer": "Anytap receives on-ramp services from legally licensed companies located in Singapore, Hong Kong or Dubai. Anytap partnered with each company only after a thorough KYB (Know Your Business) review."
      },
      {
        "id": "Q49",
        "question": "Is my money safe with Easy Top Up?",
        "answer": "Yes. Anytap applies strict KYC standards to every customer, and customer assets are kept safely throughout the top-up process. The USDT purchased for you is delivered directly to your Anytap card."
      },
      {
        "id": "Q50",
        "question": "What are the fees and the minimum amount for Easy Top Up?",
        "answer": "The Anytap top-up fee is 2%, deducted in USDT. The minimum top-up is 50 USDT. Your remittance provider or bank may charge its own transfer fees and applies its own exchange rate."
      }
    ]
  },
  {
    "title": "Card Use and Payments (Q51–Q62)",
    "items": [
      {
        "id": "Q51",
        "question": "Can I withdraw cash from an ATM?",
        "answer": "Yes, with the physical card at ATMs that accept Visa. ATMs in Singapore are currently not supported."
      },
      {
        "id": "Q52",
        "question": "What are the ATM withdrawal limits and fees?",
        "answer": "Item — Limit / Fee (per card)\nPer withdrawal — $1,500\nDaily — $1,500 (up to 30 transactions)\nMonthly — $15,000\nATM withdrawal fee — 2% (minimum $1)\nLimits apply per card. With 3 physical cards, you can withdraw up to $4,500 per day and $45,000 per month. Local ATM operators may charge their own fees separately."
      },
      {
        "id": "Q53",
        "question": "What are the card payment limits?",
        "answer": "Card — Per transaction — Daily — Monthly\nVirtual Card — $150,000 — $200,000 — $1,000,000\nApple Pay / Google Pay — $100,000 — $200,000 — $5,000,000\nPhysical Card — $20,000 — $250,000 (up to 100 transactions) — $1,000,000\nLimits apply per card. With 3 physical cards, you can spend up to 3x the single-card limits (for example, up to $3,000,000 per month)."
      },
      {
        "id": "Q54",
        "question": "What happens if I exceed a limit?",
        "answer": "Payments are automatically declined if a limit is exceeded. Limits reset on a daily and monthly basis. If you need a higher limit, contact support@anytap.io."
      },
      {
        "id": "Q55",
        "question": "What currency are payments processed in?",
        "answer": "Card balances are managed in USD. Payments made in a currency other than USD are converted at the real-time exchange rate, and a foreign transaction fee applies."
      },
      {
        "id": "Q56",
        "question": "My payment was declined. Why?",
        "answer": "Insufficient card balance\nPayment limit exceeded\nCard is locked\nKYC incomplete or pending\nAutomatic block due to risk rules (suspicious transaction detected)\nMerchant country or industry restriction\nIf you cannot determine the cause, contact support@anytap.io."
      },
      {
        "id": "Q57",
        "question": "Can I lock or unlock my card?",
        "answer": "You can lock or unlock your card at any time from the Card Management tab of the dashboard. All payments are blocked immediately upon locking."
      },
      {
        "id": "Q58",
        "question": "How are refunds processed?",
        "answer": "If the merchant approves a refund, the amount is returned to the card balance. Refund processing may take 2–5 business days, and a 2% fee applies per refund."
      },
      {
        "id": "Q59",
        "question": "I want to dispute a transaction. How do I do that?",
        "answer": "Submit the disputed transaction details to support@anytap.io, and you will be guided through the process. A $30 fee applies per dispute."
      },
      {
        "id": "Q60",
        "question": "Is there a fee for payments made overseas?",
        "answer": "A fee of 1% + $0.30 per transaction applies to payments in a currency other than USD. This is the standard Visa network cross-border rate."
      },
      {
        "id": "Q61",
        "question": "Is a fee charged even if a payment is declined?",
        "answer": "Yes. A decline fee of $0.50 per transaction applies. Always check your balance and limits before making a payment."
      },
      {
        "id": "Q62",
        "question": "Can I download my transaction history?",
        "answer": "You can view your history by date, amount and merchant name in the Transactions tab of the dashboard, and CSV download is supported."
      }
    ]
  },
  {
    "title": "Fee Summary (Q63–Q68)",
    "items": [
      {
        "id": "Q63",
        "question": "Can you give me a full overview of the fees?",
        "answer": "Fee item — Amount — Notes\nVirtual card issuance — 20 USDT per card — Charged at application\nPhysical card issuance — 100 USDT per card — Charged at application\nTop-up fee — 2% of deposit amount — Deducted in USDT at top-up (USDT and Easy Top Up)\nForeign transaction fee — 1% + $0.30 per transaction — Standard Visa network rate, non-USD payments\nATM withdrawal fee — 2% (minimum $1) — Local ATM operator fees may apply separately\nCard-to-card transfer — Free — By recipient email\nTransfer between Anytap members — Free\nExternal wallet transfer — 3% + 3 USDT gas fee per transaction — TRC-20 only\nRefund fee — 2% per refund — Charged on merchant refunds\nDispute processing fee — $30 per dispute — Charged when a dispute is filed\nDecline fee — $0.50 per transaction — Charged when a payment is declined\nCancellation fee — $1.00 per transaction — Charged when a transaction is cancelled\nAnnual fee — None"
      },
      {
        "id": "Q64",
        "question": "What is the ATM withdrawal fee?",
        "answer": "The ATM withdrawal fee is 2% of the withdrawal amount, with a minimum of $1. Local ATM operators may charge their own fees separately. Check the fee notice on the ATM screen before withdrawing."
      },
      {
        "id": "Q65",
        "question": "Is there an annual fee?",
        "answer": "No."
      },
      {
        "id": "Q66",
        "question": "When are fees deducted?",
        "answer": "The top-up fee is deducted from the deposit amount at the time of top-up, and the net amount is reflected in the card balance. Other fees are deducted from the card balance when the relevant transaction occurs."
      },
      {
        "id": "Q67",
        "question": "Can fees change?",
        "answer": "Fees may change with prior notice. Changes will be announced via dashboard notification and email."
      },
      {
        "id": "Q68",
        "question": "How much do I need to send to load a specific card amount?",
        "answer": "Amount to send = desired card balance ÷ 0.98 (based on the 2% top-up fee, rounded up to the cent).\nDesired card balance — USDT amount to send (fee included)\n$50 — 51.03 USDT\n$100 — 102.05 USDT\n$200 — 204.09 USDT\n$500 — 510.21 USDT\n$1,000 — 1,020.41 USDT"
      }
    ]
  },
  {
    "title": "Security and Privacy (Q69–Q76)",
    "items": [
      {
        "id": "Q69",
        "question": "I suspect my card details (card number, CVV) have been leaked. What should I do?",
        "answer": "Immediately lock your card on the dashboard, then report it to support@anytap.io. Your card number and CVV are not stored on our servers and are displayed in encrypted form only on your device."
      },
      {
        "id": "Q70",
        "question": "What should I do if I suspect unauthorized access to my account?",
        "answer": "Change your password immediately and contact support@anytap.io."
      },
      {
        "id": "Q71",
        "question": "Does Anytap hold my crypto assets directly?",
        "answer": "No. After a USDT deposit is processed, it is converted into a card balance (USD) managed on the card system ledger. USDT on the blockchain and the card balance are operated separately."
      },
      {
        "id": "Q72",
        "question": "Is my personal information shared with third parties?",
        "answer": "Anytap does not disclose customers' personal information to third parties without authorization, except where legally required (for example, reporting to authorities in connection with AML/KYC). See the Privacy Policy for details."
      },
      {
        "id": "Q73",
        "question": "Does Anytap use cookies for advertising purposes?",
        "answer": "No. Only essential, functional and analytics cookies necessary for service operation are used. See the Cookie Policy for details."
      },
      {
        "id": "Q74",
        "question": "What happens if a suspicious transaction occurs?",
        "answer": "Anytap's risk engine automatically detects suspicious transactions and may decline the transaction or request additional authentication. Accounts confirmed to have fraudulent use may be suspended without prior notice."
      },
      {
        "id": "Q75",
        "question": "How is the AML (anti-money laundering) policy operated?",
        "answer": "Anytap complies with international AML and counter-terrorist financing (CFT) regulations. Suspicious transactions must be reported to the relevant authorities, and only KYC-completed customers may use card services."
      },
      {
        "id": "Q76",
        "question": "Can I request to view or delete my personal information?",
        "answer": "Yes. Contact support@anytap.io. Deletion may be restricted for information subject to a legally required retention period under AML/KYC regulations."
      }
    ]
  },
  {
    "title": "Referral Program (Q77–Q91)",
    "items": [
      {
        "id": "Q77",
        "question": "What is the referral program?",
        "answer": "The Anytap Referral Partner program lets you recruit new members through your referral link and earn income when those members issue a physical card or top up. It is a referral-based recurring income model, not direct sales."
      },
      {
        "id": "Q78",
        "question": "Can anyone join the referral program?",
        "answer": "Anyone may apply. Bloggers, YouTubers, social media operators, community managers, crypto investors and others may participate regardless of channel type."
      },
      {
        "id": "Q79",
        "question": "How does the program work?",
        "answer": "There is one program: Anytap Referral Partner. You apply, and your participation begins after admin approval."
      },
      {
        "id": "Q80",
        "question": "What is the card issuance commission?",
        "answer": "You earn 10 USDT for each physical card issued by a referred member. The commission is confirmed once the referred member's KYC is approved and the card is issued, and it is paid with that week's settlement."
      },
      {
        "id": "Q81",
        "question": "How is the top-up commission calculated?",
        "answer": "Each time a referred member tops up, you earn 0.2% of the top-up amount. This income continues for as long as the member keeps topping up."
      },
      {
        "id": "Q82",
        "question": "Can you give me income examples?",
        "answer": "Scenario — Maximum estimated monthly income\n10 referred members × $1,000 monthly top-up each — Up to 20 USDT per month\n50 referred members × $1,000 monthly top-up each — Up to 100 USDT per month\n100 referred members × $1,000 monthly top-up each — Up to 200 USDT per month\nThese figures are examples and are not guaranteed income."
      },
      {
        "id": "Q83",
        "question": "I represent a business or an offline community. How can we join?",
        "answer": "Businesses, offline groups and community operators who want to take part in the referral program should contact support@anytap.io."
      },
      {
        "id": "Q84",
        "question": "What is the settlement cycle and payment method?",
        "answer": "Item — Details\nSettlement cycle — Weekly\nPayment — Paid in USDT the following week\nCard issuance commission — Included in the week the card is issued after KYC approval\nTop-up commission — Weekly total\nMinimum settlement amount — 1 USDT"
      },
      {
        "id": "Q85",
        "question": "How do I get a referral code?",
        "answer": "Apply on the Referral \"Apply Now\" page. After admin approval, Anytap issues you a separate referral code. Your referral code is not your member ID — it is a dedicated code issued by Anytap."
      },
      {
        "id": "Q86",
        "question": "Can I check whether a referred member entered my referral code?",
        "answer": "You can view the number of referred members, cumulative income and this week's income in real time in the Referral tab of the referrer dashboard."
      },
      {
        "id": "Q87",
        "question": "Does referral income have an expiration period?",
        "answer": "No. Commission continues to accrue for as long as the referred member keeps topping up."
      },
      {
        "id": "Q88",
        "question": "How do I withdraw my referral income?",
        "answer": "Submit a withdrawal request from the referral dashboard. After review, commissions settled for the week are paid in USDT the following week to your designated wallet. The minimum settlement amount is 1 USDT."
      },
      {
        "id": "Q89",
        "question": "I'm already an Anytap member — do I need to apply separately for the referral program?",
        "answer": "Yes. Membership registration and the referral program application are separate procedures."
      },
      {
        "id": "Q90",
        "question": "If I sign up without a referrer, can I add one later?",
        "answer": "No. A referral code can only be entered at sign-up."
      },
      {
        "id": "Q91",
        "question": "Is referral income taxed?",
        "answer": "Tax treatment of crypto income may vary depending on the tax laws of your country of residence. Anytap does not provide tax advice; please consult a tax professional."
      }
    ]
  },
  {
    "title": "Account Management and Troubleshooting (Q92–Q97)",
    "items": [
      {
        "id": "Q92",
        "question": "I can't log in to the dashboard.",
        "answer": "Check that your ID and password are correct. If you forgot your password, click \"Forgot Password?\" on the login screen to reset it. If the problem persists, contact support@anytap.io."
      },
      {
        "id": "Q93",
        "question": "My card balance shown is different from the actual balance.",
        "answer": "Refresh the dashboard and check again. If a recent top-up or payment is still processing, it may take a moment to reflect. If the discrepancy persists for more than 30 minutes, contact support@anytap.io."
      },
      {
        "id": "Q94",
        "question": "My physical card is not working at an ATM.",
        "answer": "Check on the dashboard that the card is active\nCheck that you have not exceeded the ATM withdrawal limit ($1,500 per day per card)\nCheck that the ATM supports the Visa network and is not located in Singapore\nCheck that the PIN is correct (the first 4 digits of the 6-digit PIN set when registering the card)\nIf the problem persists, contact support@anytap.io."
      },
      {
        "id": "Q95",
        "question": "There is an unrecognized charge in my transaction history.",
        "answer": "Immediately lock your card on the dashboard, then report the transaction to support@anytap.io. An investigation will begin once the dispute is filed."
      },
      {
        "id": "Q96",
        "question": "Is card use suspended during system maintenance?",
        "answer": "Payments on already-issued cards may still be possible during maintenance, but top-ups, balance inquiries and dashboard access may be temporarily suspended. Maintenance notices are announced in advance."
      },
      {
        "id": "Q97",
        "question": "How do I submit a complaint or suggestion?",
        "answer": "Send your feedback to support@anytap.io. For partnership or business proposals, contact biz@anytap.io."
      }
    ]
  }
];

export const EASY_TOPUP_FAQ: FaqItem[] =
  FAQ_SECTIONS.find((s) => s.title.startsWith('Easy Top Up'))?.items ?? [];
