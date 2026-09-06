import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminDataTable } from '../components/AdminDataTable.jsx';
import { AdminFilterBar, AdminPageHeader, AdminPanel, AdminTableWrap } from '../components/AdminFilterBar.jsx';
import {
  AdminDetailPanel,
  AdminDetailSection,
  AdminSplitLayout,
} from '../components/AdminSplitLayout.jsx';
import { AdminStatusBadge } from '../components/AdminStatusBadge.jsx';
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTestEmailTemplate,
  getEventNotifications,
  saveEventNotificationRule,
  testDispatchEventNotification,
  getContentItems,
} from '../services/adminService.js';

// Automatically extract all {{variable}} placeholders from HTML content
const extractVariablesFromHtml = (html) => {
  if (!html) return [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
};

// Known default expression resolver for extracted template variable keys
const getDefaultExpressionForVariable = (varKey) => {
  const lower = (varKey || '').toLowerCase();
  if (lower.includes('email') || lower === 'useremail') return 'user.email';
  if (lower.includes('login') || lower.includes('username') || lower === 'loginid') return 'user.loginId';
  if (lower.includes('deposit') || lower.includes('address') || lower.includes('wallet')) return 'user.cregisWalletAddress';
  if (lower.includes('qr') || lower.includes('qrcode')) return 'qrCode(user.cregisWalletAddress)';
  if (lower.includes('network') || lower.includes('chain')) return 'network';
  if (lower.includes('card') && (lower.includes('url') || lower.includes('link'))) return 'https://www.anytap.io/account';
  if (lower.includes('support')) return 'support@anytap.io';
  return 'user.email';
};

// Build mapping rows ensuring all variables from the target template are present as rows
const buildMappingRowsForTemplate = (templateHtml, existingMappings = {}) => {
  const templateVars = extractVariablesFromHtml(templateHtml);
  const rows = [];
  const processedKeys = new Set();

  // 1. First add template-defined variables (using existing mapping if available, or intelligent default expression)
  templateVars.forEach((varKey, idx) => {
    processedKeys.add(varKey);
    const existingVal = existingMappings[varKey];
    rows.push({
      id: `tpl_var_${varKey}_${idx}`,
      key: varKey,
      val: existingVal !== undefined && existingVal !== null ? existingVal : getDefaultExpressionForVariable(varKey),
      isFromTemplate: true,
    });
  });

  // 2. Append any remaining custom mappings configured in the rule that were not directly in the template HTML
  Object.entries(existingMappings).forEach(([k, v], idx) => {
    if (!processedKeys.has(k)) {
      rows.push({
        id: `custom_var_${k}_${idx}`,
        key: k,
        val: v,
        isFromTemplate: false,
      });
    }
  });

  return rows;
};

export function ContentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Tab: 'email' (Email Templates) | 'pages' (Web Content & Pages)
  const isPagesPath = location.pathname.toLowerCase().includes('/pages') || location.pathname.toLowerCase().includes('/web');
  const primaryTab = isPagesPath ? 'pages' : 'email';

  // Sub Tab under Email Templates: 'templates' (Template Library) | 'events' (Event Triggers & Variable Mapping)
  const queryTab = searchParams.get('tab');
  const [emailSubTab, setEmailSubTab] = useState(() => (queryTab === 'events' ? 'events' : 'templates'));

  useEffect(() => {
    if (queryTab === 'events') {
      setEmailSubTab('events');
    } else if (queryTab === 'templates') {
      setEmailSubTab('templates');
    }
  }, [queryTab]);

  const handlePrimaryTabChange = (tab) => {
    if (tab === 'email') {
      navigate('/admin/content/emailTemplates');
    } else {
      navigate('/admin/content/pages');
    }
  };

  const handleEmailSubTabChange = (subTab) => {
    setEmailSubTab(subTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (subTab === 'events') {
        next.set('tab', 'events');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  // ═════════════════════════════════════════════════════════════
  // TAB 1: EMAIL TEMPLATES STATE
  // ═════════════════════════════════════════════════════════════
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(null);
  const [templateForm, setTemplateForm] = useState(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Dynamically extracted variables from current template content
  const extractedVariables = useMemo(() => {
    return extractVariablesFromHtml(templateForm?.contentHtml);
  }, [templateForm?.contentHtml]);

  // ═════════════════════════════════════════════════════════════
  // TAB 2: EVENT NOTIFICATION RULES & VARIABLE MAPPING STATE
  // ═════════════════════════════════════════════════════════════
  const [eventRules, setEventRules] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState('KYC_APPROVED');
  const [selectedRule, setSelectedRule] = useState(null);
  const [mappingRows, setMappingRows] = useState([]);
  const [savingRule, setSavingRule] = useState(false);
  const [testDispatchEmail, setTestDispatchEmail] = useState('markvol319@gmail.com');
  const [testDispatchAddress, setTestDispatchAddress] = useState('');
  const [testDispatching, setTestDispatching] = useState(false);
  const [testDispatchResult, setTestDispatchResult] = useState(null);

  // ═════════════════════════════════════════════════════════════
  // TAB 3: WEB CONTENT (PAGES) STATE
  // ═════════════════════════════════════════════════════════════
  const [contentItems, setContentItems] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);

  // ── Load Templates ──
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await getEmailTemplates({ search: templateSearch, pageSize: 50 });
      const items = res?.items || [];
      setTemplates(items);
      if (items.length > 0 && !selectedTemplateCode && !isCreatingTemplate) {
        setSelectedTemplateCode(items[0].templateCode);
        setTemplateForm({
          ...items[0],
          contentHtml: items[0].contentHtml || items[0].bodyHtml || '',
        });
      }
    } catch (err) {
      setTemplatesError(err.message || 'Failed to load email templates.');
    } finally {
      setTemplatesLoading(false);
    }
  }, [templateSearch, selectedTemplateCode, isCreatingTemplate]);

  // ── Load Event Notification Rules ──
  const loadEventRules = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const rules = await getEventNotifications();
      const list = Array.isArray(rules) ? rules : [];
      setEventRules(list);
      const current = list.find((r) => r.eventType === selectedEventType) || list[0] || null;
      if (current) {
        setSelectedEventType(current.eventType);
        const targetCode = current.templateCode || current.targetTemplateCode || '';
        const normalized = {
          ...current,
          targetTemplateCode: targetCode,
        };
        setSelectedRule(normalized);

        // Find matched template HTML if loaded
        const matchedTpl = templates.find((t) => t.templateCode === targetCode);
        const tplHtml = matchedTpl ? (matchedTpl.contentHtml || matchedTpl.bodyHtml || '') : '';
        const mergedRows = buildMappingRowsForTemplate(tplHtml, current.variableMappings || {});
        setMappingRows(mergedRows);
      }
    } catch (err) {
      setEventsError(err.message || 'Failed to load event notification rules.');
    } finally {
      setEventsLoading(false);
    }
  }, [selectedEventType, templates]);

  // ── Load Web Content ──
  const loadWebContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const items = await getContentItems();
      setContentItems(Array.isArray(items) ? items : []);
    } catch {
      setContentItems([]);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (primaryTab === 'email' && emailSubTab === 'events') {
      loadEventRules();
    } else if (primaryTab === 'pages') {
      loadWebContent();
    }
  }, [primaryTab, emailSubTab, loadEventRules, loadWebContent]);

  // ── Select Template Row ──
  const handleSelectTemplate = (template) => {
    setIsCreatingTemplate(false);
    setSelectedTemplateCode(template.templateCode);
    setTemplateForm({
      ...template,
      contentHtml: template.contentHtml || template.bodyHtml || '',
    });
    setTestEmailResult(null);
    setPreviewMode(false);
  };

  // ── Start Create Template ──
  const handleStartCreateTemplate = () => {
    setIsCreatingTemplate(true);
    setSelectedTemplateCode(null);
    setTemplateForm({
      templateCode: '',
      templateName: '',
      subject: '',
      description: '',
      status: 'ACTIVE',
      contentHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Notification</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px;">
    <h2 style="color: #0f172a;">Notification Subject</h2>
    <p>Hello {{userEMail}},</p>
    <p>Your action has been processed successfully.</p>
  </div>
</body>
</html>`,
    });
    setPreviewMode(false);
    setTestEmailResult(null);
  };

  // ── Save Template ──
  const handleSaveTemplate = async () => {
    if (!templateForm?.templateCode?.trim()) {
      alert('Template code is required.');
      return;
    }
    if (!templateForm?.subject?.trim()) {
      alert('Email subject is required.');
      return;
    }
    const htmlBody = templateForm.contentHtml || templateForm.bodyHtml || '';
    if (!htmlBody.trim()) {
      alert('Email HTML content is required.');
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = {
        ...templateForm,
        contentHtml: htmlBody,
        isActive: templateForm.status === 'ACTIVE' || templateForm.isActive === true || templateForm.active === true,
      };
      if (isCreatingTemplate) {
        await createEmailTemplate(payload);
        alert(`Template "${templateForm.templateCode}" created successfully!`);
        setIsCreatingTemplate(false);
        setSelectedTemplateCode(templateForm.templateCode);
      } else {
        await updateEmailTemplate(templateForm.templateCode, payload);
        alert(`Template "${templateForm.templateCode}" updated successfully!`);
      }
      await loadTemplates();
    } catch (err) {
      alert(`Failed to save template: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // ── Delete Template ──
  const handleDeleteTemplate = async (code) => {
    if (!window.confirm(`Are you sure you want to permanently delete template "${code}"?`)) return;
    try {
      await deleteEmailTemplate(code);
      alert(`Template "${code}" deleted.`);
      setSelectedTemplateCode(null);
      setTemplateForm(null);
      await loadTemplates();
    } catch (err) {
      alert(`Failed to delete template: ${err.message}`);
    }
  };

  // ── Send Test Email ──
  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }
    setTestEmailSending(true);
    setTestEmailResult(null);
    try {
      const res = await sendTestEmailTemplate(templateForm.templateCode, testEmailAddress.trim(), {
        userEMail: testEmailAddress.trim(),
        loginId: testEmailAddress.split('@')[0],
        depositAddress: 'TXYZ1234567890ExampleTRC20Address',
        network: 'TRC-20',
        qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=TXYZ1234567890ExampleTRC20Address',
        cardApplyUrl: 'https://www.anytap.io/account',
        supportEmail: 'support@anytap.io',
      });
      setTestEmailResult({
        success: true,
        message: res?.message || `Test email sent to ${testEmailAddress.trim()}`,
      });
    } catch (err) {
      setTestEmailResult({
        success: false,
        message: err.message || 'Failed to send test email.',
      });
    } finally {
      setTestEmailSending(false);
    }
  };

  // ── Rule Changes ──
  const handleRuleChange = (field, val) => {
    setSelectedRule((prev) => ({ ...prev, [field]: val }));

    if (field === 'targetTemplateCode') {
      const targetTpl = templates.find((t) => t.templateCode === val);
      const tplHtml = targetTpl ? (targetTpl.contentHtml || targetTpl.bodyHtml || '') : '';
      // Retain already typed values in current mappingRows where matching
      const currentMap = {};
      mappingRows.forEach((r) => {
        if (r.key && r.key.trim()) {
          currentMap[r.key.trim()] = r.val || '';
        }
      });
      const newRows = buildMappingRowsForTemplate(tplHtml, currentMap);
      setMappingRows(newRows);
    }
  };

  const handleVariableRowChange = (id, field, value) => {
    setMappingRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddVariableRow = () => {
    setMappingRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        key: '',
        val: 'user.email',
      },
    ]);
  };

  const handleRemoveVariableRow = (id) => {
    setMappingRows((prev) => prev.filter((row) => row.id !== id));
  };

  // ── Save Event Rule ──
  const handleSaveEventRule = async () => {
    if (!selectedRule) return;
    setSavingRule(true);
    try {
      const variableMappings = {};
      mappingRows.forEach((r) => {
        const k = (r.key || '').trim();
        if (k) {
          variableMappings[k] = (r.val || '').trim();
        }
      });

      const templateCode = selectedRule.targetTemplateCode || selectedRule.templateCode || '';
      const payload = {
        ...selectedRule,
        templateCode,
        targetTemplateCode: templateCode,
        variableMappings,
      };

      await saveEventNotificationRule(selectedRule.eventType, payload);
      alert(`Event rule for "${selectedRule.eventType}" saved successfully!`);
      await loadEventRules();
    } catch (err) {
      alert(`Failed to save event rule: ${err.message}`);
    } finally {
      setSavingRule(false);
    }
  };

  // ── Test Dispatch Event ──
  const handleTestDispatchEvent = async () => {
    if (!testDispatchEmail.trim()) {
      alert('Recipient email is required.');
      return;
    }
    setTestDispatching(true);
    setTestDispatchResult(null);
    try {
      const payload = {
        email: testDispatchEmail.trim(),
        depositAddress: testDispatchAddress.trim() || undefined,
        network: 'TRC-20',
      };
      const res = await testDispatchEventNotification(selectedRule.eventType, payload);
      setTestDispatchResult({
        success: true,
        message: res?.message || `Test notification dispatched for ${testDispatchEmail.trim()}`,
      });
    } catch (err) {
      setTestDispatchResult({
        success: false,
        message: err.message || 'Failed to dispatch test notification.',
      });
    } finally {
      setTestDispatching(false);
    }
  };

  // ── HTML Live Preview Generator with sample tokens ──
  const generatePreviewHtml = (html) => {
    if (!html) return '';
    return html
      .replace(/\{\{userEMail\}\}/g, 'markvol319@gmail.com')
      .replace(/\{\{loginId\}\}/g, 'markvol319')
      .replace(/\{\{depositAddress\}\}/g, 'TYsBqN2E8Wv8j3fK9Xz1qA5oP7rS8tUvWx')
      .replace(/\{\{network\}\}/g, 'TRC-20')
      .replace(
        /\{\{qr_code_url\}\}/g,
        'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=TYsBqN2E8Wv8j3fK9Xz1qA5oP7rS8tUvWx'
      )
      .replace(/\{\{cardApplyUrl\}\}/g, 'https://www.anytap.io/account')
      .replace(/\{\{supportEmail\}\}/g, 'support@anytap.io');
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Content Management"
        description="Manage automated email notification templates, event trigger rules, dynamic variable mappings, and legal pages."
      />

      {/* Primary Navigation Tabs (Matching Admin Console standard styling) */}
      <div className="admin-fees-tabs" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={`admin-fees-tab-link${primaryTab === 'email' ? ' is-active' : ''}`}
          onClick={() => handlePrimaryTabChange('email')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Email Templates
        </button>
        <button
          type="button"
          className={`admin-fees-tab-link${primaryTab === 'pages' ? ' is-active' : ''}`}
          onClick={() => handlePrimaryTabChange('pages')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Web Content & Pages
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* PRIMARY TAB 1: EMAIL TEMPLATES                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {primaryTab === 'email' && (
        <div>
          {/* Refined Sub-Tab Segmented Control */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#e2e8f0',
                padding: '3px',
                borderRadius: '8px',
                gap: '3px',
              }}
            >
              <button
                type="button"
                onClick={() => handleEmailSubTabChange('templates')}
                style={{
                  padding: '7px 18px',
                  fontSize: '13px',
                  fontWeight: emailSubTab === 'templates' ? '700' : '500',
                  color: emailSubTab === 'templates' ? '#0f172a' : '#475569',
                  backgroundColor: emailSubTab === 'templates' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  boxShadow: emailSubTab === 'templates' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Template Library
              </button>
              <button
                type="button"
                onClick={() => handleEmailSubTabChange('events')}
                style={{
                  padding: '7px 18px',
                  fontSize: '13px',
                  fontWeight: emailSubTab === 'events' ? '700' : '500',
                  color: emailSubTab === 'events' ? '#0f172a' : '#475569',
                  backgroundColor: emailSubTab === 'events' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  boxShadow: emailSubTab === 'events' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Event Triggers & Variable Mapping
              </button>
            </div>

            {emailSubTab === 'templates' && (
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--sm"
                onClick={handleStartCreateTemplate}
              >
                + Create Template
              </button>
            )}
          </div>

          {/* SUB-VIEW 1: TEMPLATE LIBRARY */}
          {emailSubTab === 'templates' && (
            <AdminSplitLayout
              left={
                <AdminPanel>
                  <div style={{ marginBottom: '12px' }}>
                    <AdminFilterBar
                      search={templateSearch}
                      onSearchChange={setTemplateSearch}
                      searchPlaceholder="Search templates by code or subject…"
                    />
                  </div>

                  <AdminTableWrap
                    loading={templatesLoading}
                    error={templatesError}
                    hasData={templates.length > 0}
                  >
                    <AdminDataTable
                      columns={[
                        {
                          key: 'templateCode',
                          label: 'Template Code',
                          render: (r) => (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                fontWeight: '700',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                              }}
                            >
                              {r.templateCode}
                            </span>
                          ),
                        },
                        { key: 'templateName', label: 'Template Name' },
                        { key: 'subject', label: 'Email Subject' },
                        {
                          key: 'status',
                          label: 'Status',
                          render: (r) => <AdminStatusBadge status={r.status || 'ACTIVE'} />,
                        },
                        {
                          key: 'updatedAt',
                          label: 'Updated',
                          render: (r) => (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—'}
                            </span>
                          ),
                        },
                      ]}
                      rows={templates}
                      rowKey="templateCode"
                      selectedId={selectedTemplateCode}
                      onSelectRow={handleSelectTemplate}
                      emptyMessage="No email templates found in database."
                    />
                  </AdminTableWrap>
                </AdminPanel>
              }
              right={
                <AdminDetailPanel
                  title={
                    isCreatingTemplate
                      ? 'Create New Email Template'
                      : templateForm
                      ? templateForm.templateName || templateForm.templateCode
                      : null
                  }
                  onClose={() => {
                    setSelectedTemplateCode(null);
                    setTemplateForm(null);
                    setIsCreatingTemplate(false);
                  }}
                >
                  {templateForm ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* View Toggle: Editor vs HTML Preview */}
                      <div
                        style={{
                          display: 'flex',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '8px',
                          padding: '3px',
                          gap: '4px',
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: !previewMode ? '700' : '500',
                            color: !previewMode ? '#0f172a' : '#64748b',
                            backgroundColor: !previewMode ? '#ffffff' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            boxShadow: !previewMode ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            cursor: 'pointer',
                          }}
                          onClick={() => setPreviewMode(false)}
                        >
                          Edit Content & Fields
                        </button>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: previewMode ? '700' : '500',
                            color: previewMode ? '#0f172a' : '#64748b',
                            backgroundColor: previewMode ? '#ffffff' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            boxShadow: previewMode ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            cursor: 'pointer',
                          }}
                          onClick={() => setPreviewMode(true)}
                        >
                          Live HTML Preview
                        </button>
                      </div>

                      {!previewMode ? (
                        <>
                          <AdminDetailSection title="Template Metadata">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                  Template Code
                                </label>
                                <input
                                  type="text"
                                  className="admin-input"
                                  value={templateForm.templateCode || ''}
                                  readOnly={!isCreatingTemplate}
                                  disabled={!isCreatingTemplate}
                                  onChange={(e) =>
                                    setTemplateForm({ ...templateForm, templateCode: e.target.value })
                                  }
                                  placeholder="e.g. KYC_WELCOME_CARD_GUIDE_2"
                                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                  Status
                                </label>
                                <select
                                  className="admin-input"
                                  value={templateForm.status || 'ACTIVE'}
                                  onChange={(e) =>
                                    setTemplateForm({ ...templateForm, status: e.target.value })
                                  }
                                >
                                  <option value="ACTIVE">ACTIVE (Enabled)</option>
                                  <option value="INACTIVE">INACTIVE (Disabled)</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                Template Name
                              </label>
                              <input
                                type="text"
                                className="admin-input"
                                value={templateForm.templateName || ''}
                                onChange={(e) =>
                                  setTemplateForm({ ...templateForm, templateName: e.target.value })
                                }
                                placeholder="e.g. KYC Approved Welcome & Card Guide"
                              />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                Email Subject Line
                              </label>
                              <input
                                type="text"
                                className="admin-input"
                                value={templateForm.subject || ''}
                                onChange={(e) =>
                                  setTemplateForm({ ...templateForm, subject: e.target.value })
                                }
                                placeholder="e.g. [AnyTap] Welcome to AnyTap - Card Issuance Guide"
                              />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                Description / Internal Notes
                              </label>
                              <input
                                type="text"
                                className="admin-input"
                                value={templateForm.description || ''}
                                onChange={(e) =>
                                  setTemplateForm({ ...templateForm, description: e.target.value })
                                }
                                placeholder="Internal note explaining when this template is dispatched"
                              />
                            </div>
                          </AdminDetailSection>

                          <AdminDetailSection title="HTML Email Body">
                            <div
                              style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '12px 14px',
                                marginBottom: '12px',
                                fontSize: '12px',
                                color: '#475569',
                                lineHeight: '1.6',
                              }}
                            >
                              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                                💡 HTML Email Template Guide
                              </div>
                              <div>
                                Live HTML email source code stored in database. You can edit markup, styles, and layout directly.
                              </div>
                              <div style={{ marginTop: '4px', color: '#0284c7', fontWeight: '500' }}>
                                ※ Any <code>&#123;&#123;variable&#125;&#125;</code> placeholders in the template are automatically substituted with real member data (e.g. email, deposit address, QR code) at dispatch time. There is no need to register variables separately; simply write them into the HTML.
                              </div>
                            </div>

                            {/* Dynamically detected template variables */}
                            <div style={{ marginBottom: '14px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Detected Template Variables ({extractedVariables.length}):
                              </div>
                              {extractedVariables.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                                  No &#123;&#123;variable&#125;&#125; placeholders detected in template.
                                </div>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    padding: '10px 12px',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                  }}
                                >
                                  {extractedVariables.map((varName) => (
                                    <span
                                      key={varName}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#ffffff',
                                        color: '#0369a1',
                                        fontSize: '11px',
                                        fontFamily: 'monospace',
                                        border: '1px solid #cbd5e1',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        fontWeight: '600',
                                      }}
                                    >
                                      &#123;&#123;{varName}&#125;&#125;
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <textarea
                              className="admin-textarea"
                              rows={18}
                              value={templateForm.contentHtml || ''}
                              onChange={(e) =>
                                setTemplateForm({ ...templateForm, contentHtml: e.target.value })
                              }
                              placeholder="<!DOCTYPE html><html>...</html>"
                              style={{
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                fontSize: '12px',
                                lineHeight: '1.45',
                                backgroundColor: '#f8fafc',
                                color: '#0f172a',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '12px',
                                width: '100%',
                              }}
                            />

                            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                              <button
                                type="button"
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                disabled={savingTemplate}
                                onClick={handleSaveTemplate}
                              >
                                {savingTemplate ? 'Saving...' : 'Save Template'}
                              </button>
                              {!isCreatingTemplate && (
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--danger admin-btn--sm"
                                  onClick={() => handleDeleteTemplate(templateForm.templateCode)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </AdminDetailSection>
                        </>
                      ) : (
                        /* Clean Browser Frame Preview */
                        <AdminDetailSection title="Rendered Email Preview">
                          <div
                            style={{
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                          >
                            <div
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#f1f5f9',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#eab308' }} />
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                preview://email-render/{templateForm.templateCode}
                              </span>
                            </div>
                            <iframe
                              title="Email Preview"
                              srcDoc={generatePreviewHtml(templateForm.contentHtml || templateForm.bodyHtml || '')}
                              style={{ width: '100%', height: '520px', border: 'none', display: 'block' }}
                              sandbox="allow-same-origin"
                            />
                          </div>
                        </AdminDetailSection>
                      )}

                      {/* Test Email Dispatch Card */}
                      {!isCreatingTemplate && (
                        <AdminDetailSection title="Send Test Email">
                          <div
                            style={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="email"
                                className="admin-input"
                                value={testEmailAddress}
                                onChange={(e) => setTestEmailAddress(e.target.value)}
                                placeholder="Recipient email (e.g. markvol319@gmail.com)"
                                style={{ flex: 1, backgroundColor: '#ffffff' }}
                              />
                              <button
                                type="button"
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                disabled={testEmailSending}
                                onClick={handleSendTestEmail}
                                style={{
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#0284c7',
                                  borderColor: '#0284c7',
                                  fontWeight: '700',
                                  padding: '8px 16px',
                                }}
                              >
                                {testEmailSending ? 'Sending...' : 'Send Test Email'}
                              </button>
                            </div>

                            {testEmailResult && (
                              <div
                                style={{
                                  marginTop: '10px',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  backgroundColor: testEmailResult.success ? '#f0fdf4' : '#fef2f2',
                                  color: testEmailResult.success ? '#15803d' : '#b91c1c',
                                  border: `1px solid ${testEmailResult.success ? '#bbf7d0' : '#fecaca'}`,
                                }}
                              >
                                {testEmailResult.success ? '✓ ' : '✕ '}
                                {testEmailResult.message}
                              </div>
                            )}
                          </div>
                        </AdminDetailSection>
                      )}
                    </div>
                  ) : null}
                </AdminDetailPanel>
              }
            />
          )}

          {/* SUB-VIEW 2: EVENT TRIGGERS & VARIABLE MAPPING */}
          {emailSubTab === 'events' && (
            <AdminSplitLayout
              left={
                <AdminPanel>
                  <div style={{ marginBottom: '14px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                      Automated System Event Triggers
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Select an event trigger to configure which email template is automatically dispatched and how dynamic variables are evaluated.
                    </p>
                  </div>

                  <AdminTableWrap
                    loading={eventsLoading}
                    error={eventsError}
                    hasData={eventRules.length > 0}
                  >
                    <AdminDataTable
                      columns={[
                        {
                          key: 'eventType',
                          label: 'Event Trigger ID',
                          render: (r) => (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                fontWeight: '700',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                              }}
                            >
                              {r.eventType}
                            </span>
                          ),
                        },
                        { key: 'description', label: 'Trigger Description' },
                        {
                          key: 'targetTemplateCode',
                          label: 'Target Template',
                          render: (r) => (
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#f8fafc',
                                color: '#334155',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              {r.templateCode || r.targetTemplateCode || '—'}
                            </span>
                          ),
                        },
                        {
                          key: 'enabled',
                          label: 'Status',
                          render: (r) => (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: r.enabled ? '#dcfce7' : '#f1f5f9',
                                color: r.enabled ? '#15803d' : '#64748b',
                                border: `1px solid ${r.enabled ? '#86efac' : '#cbd5e1'}`,
                              }}
                            >
                              {r.enabled ? 'ACTIVE' : 'DISABLED'}
                            </span>
                          ),
                        },
                      ]}
                      rows={eventRules}
                      rowKey="eventType"
                      selectedId={selectedEventType}
                      onSelectRow={(r) => {
                        setSelectedEventType(r.eventType);
                        const targetCode = r.templateCode || r.targetTemplateCode || '';
                        const normalized = {
                          ...r,
                          targetTemplateCode: targetCode,
                        };
                        setSelectedRule(normalized);

                        const matchedTpl = templates.find((t) => t.templateCode === targetCode);
                        const tplHtml = matchedTpl ? (matchedTpl.contentHtml || matchedTpl.bodyHtml || '') : '';
                        const mergedRows = buildMappingRowsForTemplate(tplHtml, r.variableMappings || {});
                        setMappingRows(mergedRows);
                        setTestDispatchResult(null);
                      }}
                      emptyMessage="No event notification rules found."
                    />
                  </AdminTableWrap>
                </AdminPanel>
              }
              right={
                <AdminDetailPanel
                  title={selectedRule ? `Event Rule: ${selectedRule.eventType}` : null}
                >
                  {selectedRule ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <AdminDetailSection title="Trigger Configuration">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                              Event Type (Trigger Identifier)
                            </label>
                            <input
                              type="text"
                              className="admin-input"
                              value={selectedRule.eventType}
                              readOnly
                              disabled
                              style={{ fontFamily: 'monospace', backgroundColor: '#f8fafc', color: '#0369a1' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                              Automated Dispatch
                            </label>
                            <select
                              className="admin-input"
                              value={selectedRule.enabled ? 'true' : 'false'}
                              onChange={(e) => handleRuleChange('enabled', e.target.value === 'true')}
                            >
                              <option value="true">Active (Automated dispatch enabled)</option>
                              <option value="false">Paused (Do not dispatch)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            Target Email Template
                          </label>
                          <select
                            className="admin-input"
                            value={selectedRule.targetTemplateCode || ''}
                            onChange={(e) => handleRuleChange('targetTemplateCode', e.target.value)}
                            style={{ fontFamily: 'monospace' }}
                          >
                            <option value="">-- Select Target Template --</option>
                            {templates.map((t) => (
                              <option key={t.templateCode} value={t.templateCode}>
                                {t.templateCode} — {t.templateName || t.subject}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                            Description
                          </label>
                          <input
                            type="text"
                            className="admin-input"
                            value={selectedRule.description || ''}
                            onChange={(e) => handleRuleChange('description', e.target.value)}
                            placeholder="e.g. Sent automatically when KYC verification is approved."
                          />
                        </div>
                      </AdminDetailSection>

                      {/* Variable Mapping Section */}
                      <AdminDetailSection title="Dynamic Variable Mapping">
                        {/* Clean Instruction Box in Soft Blue */}
                        <div
                          style={{
                            padding: '12px',
                            backgroundColor: '#eff6ff',
                            borderRadius: '8px',
                            border: '1px solid #bfdbfe',
                            marginBottom: '14px',
                            fontSize: '12px',
                            color: '#1e3a8a',
                            lineHeight: '1.6',
                          }}
                        >
                          <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                            Supported Dynamic Expression Tokens:
                          </div>
                          <div>
                            • <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>user.email</code> : User's registered email address<br />
                            • <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>user.loginId</code> : Member's username / login ID<br />
                            • <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>user.cregisWalletAddress</code> : Member's Cregis on-chain deposit address<br />
                            • <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>qrCode(user.cregisWalletAddress)</code> : Auto QR Code image generator URL<br />
                            • <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>network</code> : Network passed from event context (e.g. TRC-20)<br />
                            • Direct static literals (e.g. <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>https://www.anytap.io/account</code>, <code style={{ backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '3px' }}>support@anytap.io</code>)
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '190px 1fr 36px',
                              gap: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <span>Template Variable Key</span>
                            <span>Source Expression / Dynamic Value</span>
                            <span></span>
                          </div>

                          {mappingRows.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                              No variables mapped yet. Select a target template or click "+ Add Variable Mapping".
                            </div>
                          ) : (
                            mappingRows.map((row) => (
                              <div
                                key={row.id}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '190px 1fr 36px',
                                  gap: '8px',
                                  alignItems: 'center',
                                }}
                              >
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="admin-input"
                                    value={row.key}
                                    onChange={(e) => handleVariableRowChange(row.id, 'key', e.target.value)}
                                    placeholder="e.g. depositAddress"
                                    style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%', paddingRight: row.isFromTemplate ? '42px' : '8px' }}
                                  />
                                  {row.isFromTemplate && (
                                    <span
                                      title="Auto-extracted from target email template HTML"
                                      style={{
                                        position: 'absolute',
                                        right: '6px',
                                        fontSize: '9px',
                                        fontWeight: '700',
                                        color: '#0284c7',
                                        backgroundColor: '#e0f2fe',
                                        padding: '2px 5px',
                                        borderRadius: '4px',
                                        pointerEvents: 'none',
                                      }}
                                    >
                                      TPL
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  className="admin-input"
                                  value={row.val}
                                  onChange={(e) => handleVariableRowChange(row.id, 'val', e.target.value)}
                                  placeholder="e.g. user.cregisWalletAddress"
                                  style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0369a1', fontWeight: '600' }}
                                />
                                <button
                                  type="button"
                                  className="admin-btn admin-btn--ghost admin-btn--sm"
                                  onClick={() => handleRemoveVariableRow(row.id)}
                                  style={{ color: '#dc2626', padding: '6px' }}
                                  title="Delete variable mapping"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--sm"
                              onClick={handleAddVariableRow}
                            >
                              + Add Variable Mapping
                            </button>
                            {selectedRule.targetTemplateCode && (
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost admin-btn--sm"
                                onClick={() => {
                                  const targetTpl = templates.find((t) => t.templateCode === selectedRule.targetTemplateCode);
                                  const tplHtml = targetTpl ? (targetTpl.contentHtml || targetTpl.bodyHtml || '') : '';
                                  const freshRows = buildMappingRowsForTemplate(tplHtml, {});
                                  setMappingRows(freshRows);
                                }}
                                title="Reset all mappings to default template variables and expressions"
                                style={{ fontSize: '12px', color: '#64748b' }}
                              >
                                ↺ Reset from Template
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            className="admin-btn admin-btn--primary admin-btn--sm"
                            disabled={savingRule}
                            onClick={handleSaveEventRule}
                          >
                            {savingRule ? 'Saving Rule...' : 'Save Event Rule'}
                          </button>
                        </div>
                      </AdminDetailSection>

                      {/* Test Dispatch Event Section */}
                      <AdminDetailSection title="Test Event Dispatch">
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '2px' }}>
                              Target Recipient Email
                            </label>
                            <input
                              type="email"
                              className="admin-input"
                              value={testDispatchEmail}
                              onChange={(e) => setTestDispatchEmail(e.target.value)}
                              placeholder="markvol319@gmail.com"
                              style={{ backgroundColor: '#ffffff' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '2px' }}>
                              Custom Test Wallet Address (Optional)
                            </label>
                            <input
                              type="text"
                              className="admin-input"
                              value={testDispatchAddress}
                              onChange={(e) => setTestDispatchAddress(e.target.value)}
                              placeholder="Leave blank to use user's DB address"
                              style={{ fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#ffffff' }}
                            />
                          </div>

                          <button
                            type="button"
                            className="admin-btn admin-btn--primary admin-btn--sm"
                            disabled={testDispatching}
                            onClick={handleTestDispatchEvent}
                            style={{
                              alignSelf: 'flex-start',
                              backgroundColor: '#0284c7',
                              borderColor: '#0284c7',
                              fontWeight: '700',
                              padding: '8px 18px',
                            }}
                          >
                            {testDispatching ? 'Dispatching...' : '🚀 Dispatch Test Event'}
                          </button>

                          {testDispatchResult && (
                            <div
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                backgroundColor: testDispatchResult.success ? '#f0fdf4' : '#fef2f2',
                                color: testDispatchResult.success ? '#15803d' : '#b91c1c',
                                border: `1px solid ${testDispatchResult.success ? '#bbf7d0' : '#fecaca'}`,
                              }}
                            >
                              {testDispatchResult.success ? '✓ ' : '✕ '}
                              {testDispatchResult.message}
                            </div>
                          )}
                        </div>
                      </AdminDetailSection>
                    </div>
                  ) : null}
                </AdminDetailPanel>
              }
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* PRIMARY TAB 2: WEB CONTENT & PAGES                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      {primaryTab === 'pages' && (
        <AdminPanel>
          <div style={{ padding: '8px 0', color: '#475569', fontSize: '13px' }}>
            <h3 style={{ color: '#0f172a', margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700' }}>
              Legal & Marketing Content Pages
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b' }}>
              Portal terms, privacy policy, and help center articles can be managed here.
            </p>
            {contentItems.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                No static content entries are currently registered in the database.
              </div>
            ) : (
              <AdminTableWrap loading={contentLoading} hasData={contentItems.length > 0}>
                <AdminDataTable
                  columns={[
                    { key: 'label', label: 'Page' },
                    { key: 'slug', label: 'Slug' },
                    { key: 'updatedAt', label: 'Updated' },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (r) => <AdminStatusBadge status={r.status} />,
                    },
                  ]}
                  rows={contentItems}
                  emptyMessage="No web content pages registered."
                />
              </AdminTableWrap>
            )}
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
