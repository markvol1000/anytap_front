export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
export interface FaqSection {
  title: string;
  items: FaqItem[];
}
/** Full FAQ — sourced from Anytap FAQ document (July 2026). */
export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "SECTION 1 \u2014 Service Overview (Q1\u2013Q10)",
    items: [
      {
        id: "Q1",
        question: "What is Anytap?",
        answer: "Anytap is a cryptocurrency prepaid card service that lets you load USDT directly onto a card and use it for online payments, offline payments, and ATM withdrawals at merchants worldwide. You can start immediately with just an online application \u2014 no separate bank account link is required.",
      },
      {
        id: "Q2",
        question: "What network does the Anytap card use?",
        answer: "The Physical Card uses the Visa network. The two cards serve different purposes.\nThe virtual card is scheduled to launch after November.",
      },
      {
        id: "Q3",
        question: "Which cryptocurrencies are supported?",
        answer: "Currently USDT (TRC-20) and USDC are supported. Using the TRC-20 network is recommended since it has the lowest fees. Other cryptocurrencies such as BTC and ETH are not currently supported.",
      },
      {
        id: "Q4",
        question: "Do I need to install an app?",
        answer: "No separate app installation is required \u2014 the service can be used entirely through a web browser. Anytap is provided as a Progressive Web App (PWA), so you can add it to your smartphone home screen and use it like an app.",
      },
      {
        id: "Q5",
        question: "Which countries can use the service?",
        answer: "Card payments and service use are available anywhere in the world. However, card issuance is not available in the following countries due to regulatory and sanctions policies.\nThere may be additional restricted countries beyond this list. If issuance eligibility for a specific country is unclear, contact support@anytap.io before applying. Further updates will follow once the responsible team confirms with the card infrastructure partner.\n\nRestricted countries include: Cuba, Iran, North Korea, Russia, Syria, Sudan, Crimea Region, Donetsk/Luhansk People\u2019s Republics, and all countries/regions subject to U.S. Treasury OFAC sanctions. There may be additional restricted countries.",
      },
      {
        id: "Q6",
        question: "Can I use the service without a bank account?",
        answer: "Yes. Anytap lets you receive and use a card through an online application alone, without linking a bank account. If you hold cryptocurrency, you can start right away.",
      },
      {
        id: "Q7",
        question: "Where can I use my Anytap card for payments?",
        answer: "It can be used at any Visa merchant worldwide, and ATM withdrawals are also supported.\nRepresentative merchants: Netflix, Amazon, ChatGPT Plus, AWS, Booking.com, Adobe, and others.",
      },
      {
        id: "Q8",
        question: "What is Anytap's security framework?",
        answer: "Anytap operates a 3-layer risk management framework.\n\u2022  Layer 1 \u2014 Real-time rule engine: analyzes every transaction in real time using 200+ rules, automatically blocking high-risk merchants\n\u2022  Layer 2 \u2014 Behavior-based model: detects anomalous transactions based on region, payment patterns, and device information\n\u2022  Layer 3 \u2014 AI detection system: assigns a risk score of 0\u2013100 to each transaction, then automatically approves, declines, or requests additional authentication\nExternal security partners: Chainalysis, TRM Labs, Elliptic, Sumsub.",
      },
      {
        id: "Q9",
        question: "How many physical cards can I hold per person?",
        answer: "You may apply for and hold up to 3 cards per person.",
      },
      {
        id: "Q10",
        question: "How can I get customer support?",
        answer: "\u2022  Email inquiries: support@anytap.io\n\u2022  Business/partnership inquiries: biz@anytap.io\n\u2022  Customer support is provided in English only.\n\u2022  Responses are provided within a maximum of 72 hours of receiving your inquiry.",
      },
    ],
  },
  {
    title: "SECTION 2 \u2014 Sign-up and KYC (Q11\u2013Q22)",
    items: [
      {
        id: "Q11",
        question: "How do I sign up?",
        answer: "You sign up on the Anytap website by entering your email address and password. Registration is completed once email verification and the KYC (identity verification) process are confirmed.",
      },
      {
        id: "Q12",
        question: "Where do I enter a referral code?",
        answer: "Enter your referrer's code in the Referral Code field on the sign-up screen. It cannot be entered retroactively after registration is complete, so be sure to confirm it at the time of sign-up.",
      },
      {
        id: "Q13",
        question: "What is KYC (identity verification) and why is it needed?",
        answer: "KYC (Know Your Customer) is a mandatory identity verification procedure required under international anti-money laundering (AML) regulations. It must be completed to use the Visa and Mastercard networks, and card issuance and top-up services cannot be used until it is complete.",
      },
      {
        id: "Q14",
        question: "What documents are needed to apply for KYC?",
        answer: "\u2022  A valid government-issued ID (a passport is strongly recommended \u2014 national ID cards may cause recognition errors or review delays)\n\u2022  Proof of residence may be additionally requested if needed",
      },
      {
        id: "Q15",
        question: "How long does KYC approval take?",
        answer: "It is generally processed immediately, though it may take up to 2 business days.",
      },
      {
        id: "Q16",
        question: "My KYC was rejected. What should I do?",
        answer: "It may be rejected if the ID photo is unclear or the ID information does not match. After checking the reason for rejection, resubmit your documents or contact support@anytap.io.",
      },
      {
        id: "Q17",
        question: "Can someone under 18 apply?",
        answer: "No. Anytap cards are only available to applicants aged 18 and older.",
      },
      {
        id: "Q18",
        question: "How is personal information collected during KYC managed?",
        answer: "Personal information collected during the KYC process is securely managed in accordance with the legally required retention period. For KYC verification, personal information is not stored in encrypted form.",
      },
      {
        id: "Q19",
        question: "I forgot my password. How do I reset it?",
        answer: "Click 'Forgot Password?' on the login screen, and a reset link will be sent to your registered email address. Use the link to set a new password.",
      },
      {
        id: "Q20",
        question: "Can I change my email address?",
        answer: "Email address changes are handled by the customer support team. Contact support@anytap.io.",
      },
      {
        id: "Q22",
        question: "I want to close my account. How do I do that?",
        answer: "To request account closure, email support@anytap.io. The email must include the following information:\n\u2022  Full legal name (as used for KYC registration)\n\u2022  Registered email address\n\u2022  Copy of the ID used for KYC (e.g., passport)\nProcessing instructions will be provided within a maximum of 72 hours of receipt. If a balance remains, separate instructions for handling it will be provided before the account closure is processed.",
      },
    ],
  },
  {
    title: "SECTION 3 \u2014 Card Issuance (Q23\u2013Q34)",
    items: [
      {
        id: "Q25",
        question: "How do I apply for a physical card?",
        answer: "After completing registration, you can apply for physical card (Visa) issuance from the dashboard.",
      },
      {
        id: "Q26",
        question: "How much does physical card issuance cost?",
        answer: "The virtual card issuance fee is 20 USDT. The physical card issuance fee is shown in the application flow before you pay. After applying for a physical card, deposit the issuance fee to Anytap's designated wallet; once the deposit is confirmed, the card will be shipped.",
      },
      {
        id: "Q27",
        question: "How long does physical card delivery take?",
        answer: "Delivery typically takes around 10 days after application. This may vary by country.",
      },
      {
        id: "Q29",
        question: "Can I add my physical card to Apple Pay?",
        answer: "Whether the physical card (Visa) supports Apple Pay is currently under review. The responsible team will update the confirmed details after consulting with the card infrastructure partner. Once confirmed, this will be announced through official channels.",
      },
      {
        id: "Q30",
        question: "How do I register for Google Pay?",
        answer: "The physical card (Visa) supports Google Pay registration. In the Google Wallet app, select 'Add card' and enter the card number, expiration date, and CVV.",
      },
      {
        id: "Q31",
        question: "Is Samsung Pay supported?",
        answer: "Not currently supported. Support is planned starting November 2026. When support begins, this will be announced separately via dashboard notification and official channels.",
      },
      {
        id: "Q32",
        question: "What happens when my card expires?",
        answer: "Cards are not automatically renewed after expiration. After expiration, you must submit a new card issuance application. Advance notice will be sent via dashboard notification before the expiration date.",
      },
      {
        id: "Q33",
        question: "Where can I check my card number and CVV?",
        answer: "You can check them in the Card Management tab of the dashboard. For security, card details are only displayed when you tap (click) directly on that screen.",
      },
      {
        id: "Q34",
        question: "What if I lose or damage my physical card?",
        answer: "If your card is lost or damaged, the existing card cannot be reused. You must submit a new issuance application.\n\u2022  Step 1: Immediately lock the card in the Card Management tab of the dashboard\n\u2022  Step 2: Apply for new card issuance (the current issuance fee is charged again)\nIf theft is suspected, after locking the card, be sure to email support@anytap.io to report the theft. Include your full legal name, registered email, and the circumstances of the loss in the report.",
      },
    ],
  },
  {
    title: "SECTION 4 \u2014 Top-up (Q35\u2013Q50)",
    items: [
      {
        id: "Q35",
        question: "How do I top up my card?",
        answer: "Check your personal USDT deposit address (TRC-20) in the Wallet tab of the dashboard, then send USDT to that address from an exchange (Binance, OKX, Bybit, etc.) or a personal wallet. Enter the desired amount from your dedicated wallet and press the card top-up button to load funds onto your card.",
      },
      {
        id: "Q36",
        question: "Where can I find my TRC-20 address?",
        answer: "Your personal, dedicated TRC-20 USDT deposit address is shown in the Wallet tab of the dashboard. This address is for your use only \u2014 do not share it with anyone else.",
      },
      {
        id: "Q37",
        question: "How long after topping up does it reflect on the card?",
        answer: "Under normal conditions, it reflects on the card immediately after on-chain confirmation. The TRC-20 network typically processes within 1\u20132 minutes. It may be delayed during network congestion, and status can be checked on the web page.",
      },
      {
        id: "Q38",
        question: "Is there a minimum top-up amount?",
        answer: "The minimum top-up amount is 30 USDT on the TRC-20 network.",
      },
      {
        id: "Q39",
        question: "Is there a maximum top-up amount?",
        answer: "The maximum top-up amount is being confirmed and will be announced.",
      },
      {
        id: "Q40",
        question: "What is the top-up fee?",
        answer: "Anytap does not publish a separate percentage top-up fee. The minimum top-up is 30 USDT via TRC-20. TRC-20 network fees are typically low. Check the dashboard top-up screen for the amount that will be credited.",
      },
      {
        id: "Q41",
        question: "Can I deposit using a network other than TRC-20?",
        answer: "Only the TRC-20 network is supported. Sending via other networks such as ERC-20 (Ethereum) or BEP-20 (Binance Smart Chain) may result in loss of funds. Always send via TRC-20 (TRON network).",
      },
      {
        id: "Q43",
        question: "I sent USDT to the wrong address. Can it be recovered?",
        answer: "Due to the nature of blockchain transactions, assets sent to the wrong address cannot be recovered. Always verify the address carefully before sending.",
      },
      {
        id: "Q44",
        question: "I accidentally sent via ERC-20. What happens?",
        answer: "Sending ERC-20 USDT to a TRC-20 address may result in loss of funds. This is a transfer error caused by a network mismatch and may not be recoverable. Contact support@anytap.io immediately with the transaction hash (TXID).",
      },
      {
        id: "Q45",
        question: "My deposited USDT is not reflected in my dedicated wallet.",
        answer: "Check the following items in order:\n\u2022  Confirm the on-chain transaction has received at least 1\u20132 confirmations\n\u2022  Confirm the deposit address is a TRC-20 network address (depositing via ERC-20 may result in loss of funds)\nIf it is still not reflected after more than 30 minutes, contact support@anytap.io with the transaction hash (TXID).",
      },
      {
        id: "Q46",
        question: "Where can I view my top-up history?",
        answer: "You can check deposit status and history in the Wallet tab or Transactions tab of the dashboard.",
      },
      {
        id: "Q47",
        question: "Can I withdraw my card balance to an external wallet?",
        answer: "Yes. You can withdraw your card balance to an external TRC-20 wallet. Submit a withdrawal request from the Wallet tab of the dashboard.\n\u2022  Withdrawal fee: 3% of the withdrawal amount, plus a separate $1 USDT per transaction\n\u2022  The withdrawal address must be a wallet address that supports TRC-20 USDT.\n\u2022  Only KYC-completed customers may request external withdrawals.\nContact support@anytap.io for withdrawal processing time and minimum withdrawal amount.",
      },
      {
        id: "Q48",
        question: "Can I also top up with USDC?",
        answer: "USDC is also supported. However, using USDT on TRC-20 is recommended, as it is more favorable in terms of fees and processing speed.",
      },
      {
        id: "Q49",
        question: "Can my top-up address change?",
        answer: "Anytap permanently assigns each customer a dedicated TRC-20 deposit address. If the address does change, you will be notified separately via the dashboard.",
      },
    ],
  },
  {
    title: "SECTION 5 \u2014 Card Use and Payments (Q51\u2013Q63)",
    items: [
      {
        id: "Q51",
        question: "Can I withdraw cash from an ATM?",
        answer: "Yes. ATM withdrawals are available with the physical Visa card. The withdrawal fee is 2% (minimum $1). Daily withdrawal limit: $1,500 (up to 30 transactions). Monthly limit: $15,000. Singapore does not support ATM withdrawal.",
      },
      {
        id: "Q52",
        question: "What are the ATM withdrawal limits?",
        answer: "\n\nPayment limits: per transaction $20,000 \u00b7 daily count 100 \u00b7 daily $250,000 \u00b7 monthly $1,000,000.",
      },
      {
        id: "Q53",
        question: "What are the card payment limits?",
        answer: "[Physical Card]",
      },
      {
        id: "Q54",
        question: "What happens if I exceed a limit?",
        answer: "Payments are automatically declined if a limit is exceeded. Limits reset on a daily/monthly basis. If you need a higher limit, contact support@anytap.io.",
      },
      {
        id: "Q55",
        question: "What currency are payments processed in?",
        answer: "Card balances are managed in USD. Payments made in a currency other than USD use a real-time exchange rate, and a foreign transaction fee applies.\n\nFee schedule:\n\u2022 Virtual card issuance: 20 USDT\n\u2022 Physical card issuance: shown in the application flow\n\u2022 Top-up: minimum 30 USDT on TRC-20 (no published percentage fee)\n\u2022 Cross-border / foreign transaction fee: 1% + $0.30 per transaction\n\u2022 ATM withdrawal: 2% (minimum $1); not available in Singapore\n\u2022 Small-transaction fee: 0.3 USDT (under 30 USDT)\n\u2022 Decline fee: $0.50\n\u2022 Refund fee: 2%\n\u2022 Dispute processing fee: $30\n\u2022 Cancellation fee: $1.00\n\u2022 Annual fee: None",
      },
      {
        id: "Q56",
        question: "My payment was declined. Why?",
        answer: "\u2022  Insufficient card balance\n\u2022  Payment limit exceeded\n\u2022  Card is locked\n\u2022  KYC incomplete or pending\n\u2022  Automatic block due to risk rules (suspicious transaction detected)\n\u2022  Merchant country or industry restriction\nIf you cannot determine the cause, contact support@anytap.io.",
      },
      {
        id: "Q57",
        question: "Can I lock or unlock my card?",
        answer: "You can lock or unlock your card at any time from the Card Management tab of the dashboard. All payments are blocked immediately upon locking.",
      },
      {
        id: "Q58",
        question: "Is there an extra fee for small transactions?",
        answer: "A small-transaction fee of 0.3 USDT per transaction applies to transactions under 30 USDT.",
      },
      {
        id: "Q59",
        question: "How are refunds processed?",
        answer: "If the merchant approves a refund, the amount is returned to the card balance. Refund processing may take 2\u20135 business days, and a 2% fee applies per refund.",
      },
      {
        id: "Q60",
        question: "I want to dispute a transaction. How do I do that?",
        answer: "Submit the disputed transaction details to support@anytap.io, and you will be guided through the process. A $30 fee applies per dispute.",
      },
      {
        id: "Q61",
        question: "Is there a fee for payments made overseas?",
        answer: "A cross-border transaction fee of 1% plus $0.30 applies per transaction when spending in currencies other than USD. The payment amount is converted at the real-time exchange rate before being deducted from the USD balance.",
      },
      {
        id: "Q62",
        question: "Is a fee charged even if a payment is declined?",
        answer: "A decline fee of $0.50 per transaction may apply when a payment is declined. Always check your balance and limits before making a payment.",
      },
      {
        id: "Q63",
        question: "Can I download my transaction history?",
        answer: "You can view your history by date, amount, and merchant name in the Transactions tab of the dashboard, and CSV download is also supported.",
      },
    ],
  },
  {
    title: "SECTION 6 \u2014 Fee Summary (Q64\u2013Q69)",
    items: [
      {
        id: "Q64",
        question: "Can you give me a full overview of the fees involved in using an Anytap card?",
        answer: "",
      },
      {
        id: "Q65",
        question: "What is the ATM withdrawal fee?",
        answer: "ATM withdrawals with the physical Visa card incur a 2% fee (minimum $1). Local ATM operator fees may also apply. ATM withdrawal is not available in Singapore.",
      },
      {
        id: "Q66",
        question: "Is there an annual fee?",
        answer: "Anytap does not charge an annual fee.",
      },
      {
        id: "Q67",
        question: "When are fees deducted?",
        answer: "Network fees on TRC-20, if any, are paid on-chain at the time of transfer. Cross-border and other card fees are deducted from the card balance when the related transaction occurs.",
      },
      {
        id: "Q68",
        question: "Can fees change?",
        answer: "Fees may change with prior notice. Changes will be announced via dashboard notification and email. Always check the Anytap website for the latest fees.",
      },
      {
        id: "Q69",
        question: "How much do I need to send to load a card amount that already accounts for the top-up fee?",
        answer: "There is no published percentage top-up fee. Send at least 30 USDT on TRC-20, then check the dashboard top-up screen for the amount that will be credited.",
      },
    ],
  },
  {
    title: "SECTION 7 \u2014 Security and Privacy (Q70\u2013Q77)",
    items: [
      {
        id: "Q70",
        question: "I suspect my card details (card number, CVV) have been leaked. What should I do?",
        answer: "Immediately lock your card on the dashboard, then report it to support@anytap.io. Your card number and CVV are not stored on the server and are displayed in encrypted form only on your device.",
      },
      {
        id: "Q71",
        question: "Can I get notified when there's a login from a new device?",
        answer: "If you suspect unauthorized access, change your password immediately and contact support@anytap.io.",
      },
      {
        id: "Q72",
        question: "Does Anytap hold my crypto assets directly?",
        answer: "No. Anytap does not directly custody customers' USDT. After a USDT deposit is processed, it is converted into a card balance, which is then managed on Anytap's internal card system ledger. USDT on the blockchain and the card balance (USD) are operated separately.",
      },
      {
        id: "Q73",
        question: "Is my personal information shared with third parties?",
        answer: "Anytap does not disclose customers' personal information to third parties without authorization, except where legally required (e.g., reporting to authorities in connection with AML/KYC). See the Privacy Policy for details.",
      },
      {
        id: "Q74",
        question: "Does Anytap use cookies for advertising purposes?",
        answer: "Anytap does not use advertising cookies or third-party behavioral profiling cookies. Only essential, functional, and analytics cookies necessary for service operation are used. See the Cookie Policy for details.",
      },
      {
        id: "Q75",
        question: "What happens if a suspicious transaction occurs?",
        answer: "Anytap's AI risk engine automatically detects suspicious transactions and may decline the transaction or request additional authentication. Accounts confirmed to have fraudulent use may be suspended without prior notice.",
      },
      {
        id: "Q76",
        question: "How is the AML (anti-money laundering) policy operated?",
        answer: "Anytap complies with international AML and counter-terrorist financing (CFT) regulations. Suspicious transactions must be reported to the relevant authorities, and only KYC-completed customers may use card services.",
      },
      {
        id: "Q77",
        question: "Can I request to view or delete my personal information?",
        answer: "Yes. To request to view, correct, or delete your personal information, contact support@anytap.io. However, deletion may be restricted for information subject to a legally required retention period under AML/KYC regulations.",
      },
    ],
  },
  {
    title: "SECTION 8 \u2014 Referral Program (Q78\u2013Q92)",
    items: [
      {
        id: "Q78",
        question: "What is the referral program?",
        answer: "The Anytap referral program is a structure where you recruit new members through a referral link and earn income each time that member issues a card or tops up. It is a referral-based recurring income model rather than direct sales.",
      },
      {
        id: "Q79",
        question: "Can anyone join the referral program?",
        answer: "Anyone may apply. Bloggers, YouTubers, social media operators, community managers, crypto investors, and others may participate regardless of channel type.",
      },
      {
        id: "Q80",
        question: "What is the referral tier structure?",
        answer: "There are two tiers: Silver and Premium. Silver is entered after application and admin approval. Premium is applied either by direct company designation or automatically once the Silver upgrade conditions are met.",
      },
      {
        id: "Q81",
        question: "What is the card issuance commission?",
        answer: "The commission is confirmed once the referred member's KYC is approved and card issuance is complete, and is settled the following month.\n\nIssuance commission: Silver $10 USDT \u00b7 Premium $20 USDT per card.",
      },
      {
        id: "Q82",
        question: "How is the top-up fee commission calculated?",
        answer: "Each time a recruited member tops up, a portion of the top-up fee revenue is automatically accrued as commission. This income continues to accrue for as long as the member keeps topping up their card.",
      },
      {
        id: "Q83",
        question: "Can you give me income scenarios? (Based on the highest Premium tier)",
        answer: "These figures are examples based on the highest tier and are not guaranteed income.\n\nExample scenarios (highest Premium tier, not guaranteed):\n\u2022 10 members \u00d7 $1,000 monthly top-up \u2192 up to $40 USDT/month\n\u2022 50 members \u00d7 $1,000 \u2192 up to $200 USDT/month\n\u2022 100 members \u00d7 $1,000 \u2192 up to $400 USDT/month",
      },
      {
        id: "Q84",
        question: "How do I upgrade to Premium?",
        answer: "If both of the following conditions are met at the same time, Premium is automatically applied starting the 1st of the following month.\n\u2022  Condition 1: 50 or more cumulative recruited members\n\u2022  Condition 2: total top-up amount of recruited members of $7,200 USDT or more",
      },
      {
        id: "Q85",
        question: "What is the settlement cycle and payment method for income?",
        answer: "Settlement reference date: last day of each month. Payout currency: USDT. Payment within 15 U.S. business days of the following month. Card issuance commission settles the following month after KYC and issuance. Top-up fee commission accrued during the month is settled the following month. Minimum settlement: $1 USDT.",
      },
      {
        id: "Q86",
        question: "How do I get a referral code?",
        answer: "For business/partnership inquiries, complete the application form and email it to biz@anytap.io. After review, your referrer status will be confirmed (your referral code is the member ID assigned at sign-up).",
      },
      {
        id: "Q87",
        question: "Can I check whether a referred member entered my referral code?",
        answer: "You can view the number of recruited members, cumulative income, this month's income, and tier status in real time in the Referral tab of the referrer dashboard.",
      },
      {
        id: "Q88",
        question: "Does referral income have an expiration period?",
        answer: "Commission continues to accrue for as long as the recruited member keeps topping up their card. There is no separate expiration period \u2014 income keeps accumulating as long as the member uses the service.",
      },
      {
        id: "Q89",
        question: "Can I withdraw referral income to an external wallet?",
        answer: "After submitting a withdrawal request in the referrer dashboard, it is reviewed and paid out in USDT. The minimum settlement amount is $1 USDT, paid to the designated wallet issued at sign-up.",
      },
      {
        id: "Q90",
        question: "I'm already an Anytap member \u2014 do I need to apply separately for the referral program?",
        answer: "Yes. General membership registration and referral program application are separate procedures. To act as a referrer, you must apply for the referral program separately and be approved.",
      },
      {
        id: "Q91",
        question: "If I sign up without a referrer, can I add one later?",
        answer: "A referral code can only be entered at sign-up. It cannot be entered retroactively after registration is complete.",
      },
      {
        id: "Q92",
        question: "Is referral income taxed?",
        answer: "Tax treatment of crypto income may vary depending on the tax laws of your country of residence. Anytap does not provide tax advice, so please consult a tax professional or accountant.",
      },
    ],
  },
  {
    title: "SECTION 9 \u2014 Account Management and Troubleshooting (Q93\u2013Q100)",
    items: [
      {
        id: "Q94",
        question: "I can't log in to the dashboard.",
        answer: "Check that your ID/password are correct.\n\u2022  If you forgot your password, click 'Forgot Password?' on the login screen to reset it.\nIf the problem persists, contact support@anytap.io.",
      },
      {
        id: "Q95",
        question: "My card balance shown is different from the actual balance.",
        answer: "Refresh the dashboard and check the balance again. If a recent top-up or payment is still processing, it may take a moment to reflect. If the discrepancy persists for more than 30 minutes, contact support@anytap.io.",
      },
      {
        id: "Q96",
        question: "My physical card is not working at an ATM.",
        answer: "\u2022  Check on the dashboard that the card is active\n\u2022  Check that you have not exceeded the ATM withdrawal limit ($1,500/day)\n\u2022  Check that the ATM supports the Visa network\n\u2022  Check that the PIN is correct (this is the first 4 digits of the 6-digit PIN entered when registering the card)\nPIN setup details will be confirmed and announced.\nIf the problem persists, contact support@anytap.io.",
      },
      {
        id: "Q97",
        question: "There is an unrecognized charge in my transaction history.",
        answer: "Immediately lock your card on the dashboard, then report the transaction to support@anytap.io. An investigation process will begin once the dispute is filed.",
      },
      {
        id: "Q98",
        question: "Is card use suspended during Anytap system maintenance?",
        answer: "Offline payments on already-issued cards may still be possible during Anytap system maintenance. However, online functions such as top-ups, balance inquiries, and dashboard access may be temporarily suspended during maintenance. Maintenance notices are announced in advance via the dashboard and official channels.",
      },
      {
        id: "Q100",
        question: "How do I submit a complaint or suggestion about the service?",
        answer: "Send your feedback to support@anytap.io. Submissions are reviewed internally and reflected in service improvements. For partnership or business proposals, contact biz@anytap.io separately.",
      },
    ],
  },
];

export const FAQ_FLAT: FaqItem[] = FAQ_SECTIONS.flatMap((s) => s.items);
