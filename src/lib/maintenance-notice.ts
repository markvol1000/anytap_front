/**
 * Service Security & Asset Protection Notice
 * Displays notice when server is down / undergoing maintenance or manually activated.
 */

export const MAINTENANCE_NOTICE_ID = 'security_asset_protection_2026';

export const MAINTENANCE_NOTICE = {
  id: MAINTENANCE_NOTICE_ID,
  badge: 'SECURITY NOTICE',
  title: 'Service Security and Customer Asset Protection',
  greeting: 'Hello, this is Anytap.',
  lead: 'AI-driven cyberattacks targeting financial institutions worldwide have been increasing recently. Anytap has also experienced attack attempts; however, we responded in accordance with our security protocols, and your assets remain safely protected.',
  sections: [
    {
      title: 'Regarding Payment and Withdrawal Delays',
      tone: 'warn' as const,
      description: 'Some payments or withdrawals may experience temporary delays or errors. These may be caused by financial network updates or network conditions in your country of residence.',
    },
    {
      title: 'Customer Asset Protection',
      tone: 'ok' as const,
      points: [
        'All of your asset management records and transaction history are securely maintained.',
        'Even in the event of a temporary disruption, your assets and transaction records will not be affected.',
      ],
    },
  ],
  closing: 'We apologize for any inconvenience and remain committed to providing you with stable and reliable service.',
  support: 'For any inquiries, please contact our Customer Support team.',
  team: 'The Anytap Team',
  cta: 'I Understand',
};

/** Manual override: set to true to force display even if server is online */
export const FORCE_MAINTENANCE_NOTICE = false;

export function isMaintenanceNoticeActive(): boolean {
  return FORCE_MAINTENANCE_NOTICE;
}
