import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

// Resolve mapped expressions into preview/resolved values using dynamic context
const resolveExpressionToPreview = (expr, context = {}) => {
  if (!expr || !expr.trim()) return '';
  const trimmed = expr.trim();

  // 1. Functions: qrCode(innerExpression)
  if (trimmed.startsWith('qrCode(') && trimmed.endsWith(')')) {
    const inner = trimmed.substring(7, trimmed.length - 1).trim();
    const resolvedInner = resolveExpressionToPreview(inner, context);
    if (resolvedInner) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(resolvedInner)}`;
    }
    return '';
  }

  // 2. Dynamic property path starting with 'user.' or 'context.'
  if (trimmed.startsWith('user.') || trimmed.startsWith('context.')) {
    const path = trimmed.startsWith('context.') ? trimmed.substring(8) : trimmed;

    // Check direct key in context
    if (context[path] !== undefined && context[path] !== null && context[path] !== '') {
      return String(context[path]);
    }

    // Check nested object path (e.g. user.email -> context.user?.email)
    const parts = path.split('.');
    let current = context;
    let resolved = true;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        resolved = false;
        break;
      }
    }
    if (resolved && current !== undefined && current !== null && current !== '') {
      return String(current);
    }
    return '';
  }

  // 3. Direct literal value configured in the mapping table (e.g. 'TRC-20', wallet address, text, URLs)
  return trimmed;
};

export function ContentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Primary Tab: 'email' (Email Templates) | 'pages' (Web Content & Pages)
  const isPagesPath = location.pathname.toLowerCase().includes('/pages') || location.pathname.toLowerCase().includes('/web');
  const primaryTab = isPagesPath ? 'pages' : 'email';

  const handlePrimaryTabChange = (tab) => {
    if (tab === 'email') {
      navigate('/admin/content/emailTemplates');
    } else {
      navigate('/admin/content/pages');
    }
  };

  // ═════════════════════════════════════════════════════════════
  // EMAIL TEMPLATES & EVENT RULES INTEGRATED STATE
  // ═════════════════════════════════════════════════════════════
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(null);
  const [originalTemplateCode, setOriginalTemplateCode] = useState(null);
  const [templateForm, setTemplateForm] = useState(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Template pagination
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(20);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templateTotalPages, setTemplateTotalPages] = useState(1);

  // Event rules and unified automated dispatch state
  const [eventRules, setEventRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [mappingRows, setMappingRows] = useState([]);
  const [savingAll, setSavingAll] = useState(false);

  // Test email and test dispatch state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  const [testDispatchAddress, setTestDispatchAddress] = useState('');
  const [testDispatching, setTestDispatching] = useState(false);
  const [testDispatchResult, setTestDispatchResult] = useState(null);

  // Web Content (Pages) State
  const [contentItems, setContentItems] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Dynamically extracted variables from current template content
  const extractedVariables = useMemo(() => {
    return extractVariablesFromHtml(templateForm?.contentHtml);
  }, [templateForm?.contentHtml]);

  // When selected template changes, sync the active rule and mapping rows
  const syncRuleForTemplate = useCallback((tplCode, tplHtml, allRules) => {
    if (!tplCode) {
      setSelectedRule(null);
      setMappingRows([]);
      return;
    }
    const curCode = tplCode.trim().toUpperCase();
    const foundRule = (allRules || []).find((r) => {
      const tCode = (r.templateCode || r.targetTemplateCode || '').trim().toUpperCase();
      return tCode === curCode;
    });

    if (foundRule) {
      const normalized = {
        ...foundRule,
        targetTemplateCode: curCode,
        templateCode: curCode,
      };
      setSelectedRule(normalized);
      const rows = buildMappingRowsForTemplate(tplHtml, foundRule.variableMappings || {});
      setMappingRows(rows);
    } else {
      // If no existing rule matches this template, provide a default rule linked to it
      const fallbackRule = {
        eventType: curCode.startsWith('KYC') ? 'KYC_APPROVED' : curCode,
        eventName: curCode,
        description: 'Automated dispatch rule for ' + curCode,
        enabled: true,
        templateCode: curCode,
        targetTemplateCode: curCode,
        recipientMapping: 'user.email',
        variableMappings: {},
      };
      setSelectedRule(fallbackRule);
      const rows = buildMappingRowsForTemplate(tplHtml, {});
      setMappingRows(rows);
    }
  }, []);

  // ── Load Templates and Event Rules ──
  const loadTemplatesAndRules = useCallback(async (targetCodeToSelect = null) => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const [resTemplates, resRules] = await Promise.all([
        getEmailTemplates({
          search: templateSearch,
          page: templatePage,
          pageSize: templatePageSize,
        }),
        getEventNotifications().catch(() => []),
      ]);

      const rawItems = resTemplates?.items || [];
      const rulesList = Array.isArray(resRules) ? resRules : [];
      setEventRules(rulesList);

      // Create a map of templateCode -> rule enabled status
      const ruleStatusMap = new Map();
      rulesList.forEach((r) => {
        const code = (r.templateCode || r.targetTemplateCode || '').trim().toUpperCase();
        if (code) {
          ruleStatusMap.set(code, r.enabled);
        }
      });

      const items = rawItems.map((t) => {
        const tCode = (t.templateCode || '').trim().toUpperCase();
        const ruleActive = ruleStatusMap.has(tCode) ? ruleStatusMap.get(tCode) : (t.isActive !== false);
        return {
          ...t,
          status: ruleActive ? 'ACTIVE' : 'DISABLED',
          isRuleActive: ruleActive,
        };
      });

      setTemplates(items);
      setTemplateTotal(resTemplates?.total ?? items.length);
      setTemplateTotalPages(resTemplates?.totalPages ?? Math.max(1, Math.ceil((resTemplates?.total || items.length) / templatePageSize)));

      if (targetCodeToSelect) {
        const found = items.find((t) => t.templateCode === targetCodeToSelect);
        if (found) {
          setSelectedTemplateCode(found.templateCode);
          setOriginalTemplateCode(found.templateCode);
          const tplHtml = found.contentHtml || found.bodyHtml || '';
          setTemplateForm({
            ...found,
            contentHtml: tplHtml,
          });
          syncRuleForTemplate(found.templateCode, tplHtml, rulesList);
        }
      } else if (items.length > 0 && !selectedTemplateCode && !isCreatingTemplate) {
        setSelectedTemplateCode(items[0].templateCode);
        setOriginalTemplateCode(items[0].templateCode);
        const tplHtml = items[0].contentHtml || items[0].bodyHtml || '';
        setTemplateForm({
          ...items[0],
          contentHtml: tplHtml,
        });
        syncRuleForTemplate(items[0].templateCode, tplHtml, rulesList);
      }
    } catch (err) {
      setTemplatesError(err.message || 'Failed to load email templates.');
    } finally {
      setTemplatesLoading(false);
    }
  }, [templateSearch, templatePage, templatePageSize, selectedTemplateCode, isCreatingTemplate, syncRuleForTemplate]);

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
    if (primaryTab === 'email') {
      loadTemplatesAndRules();
    } else if (primaryTab === 'pages') {
      loadWebContent();
    }
  }, [primaryTab, loadTemplatesAndRules, loadWebContent]);

  // ── Select Template Row ──
  const handleSelectTemplate = (template) => {
    setIsCreatingTemplate(false);
    setSelectedTemplateCode(template.templateCode);
    setOriginalTemplateCode(template.templateCode);
    const tplHtml = template.contentHtml || template.bodyHtml || '';
    setTemplateForm({
      templateCode: template.templateCode,
      templateName: template.templateName || '',
      subject: template.subject || '',
      description: template.description || template.variablesDescription || '',
      contentHtml: tplHtml,
      contentText: template.contentText || '',
      variablesDescription: template.variablesDescription || '',
    });
    setTestEmailResult(null);
    setTestDispatchResult(null);
    setPreviewMode(false);
    syncRuleForTemplate(template.templateCode, tplHtml, eventRules);
  };

  // ── Start Create Template ──
  const handleStartCreateTemplate = () => {
    setIsCreatingTemplate(true);
    setSelectedTemplateCode(null);
    setOriginalTemplateCode(null);
    const initialHtml = `<!DOCTYPE html>
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
</html>`;

    setTemplateForm({
      templateCode: '',
      templateName: '',
      subject: '',
      description: '',
      contentHtml: initialHtml,
      contentText: '',
      variablesDescription: '',
    });
    setSelectedRule({
      eventType: '',
      eventName: '',
      description: '',
      enabled: true,
      templateCode: '',
      targetTemplateCode: '',
      recipientMapping: 'user.email',
      variableMappings: {},
    });
    setMappingRows(buildMappingRowsForTemplate(initialHtml, {}));
    setPreviewMode(false);
    setTestEmailResult(null);
    setTestDispatchResult(null);
  };

  // ── Variable Mapping Table Handlers ──
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
        isFromTemplate: false,
      },
    ]);
  };

  const handleRemoveVariableRow = (id) => {
    setMappingRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleResetMappingsFromHtml = () => {
    const tplHtml = templateForm?.contentHtml || '';
    const freshRows = buildMappingRowsForTemplate(tplHtml, {});
    setMappingRows(freshRows);
  };

  // ── Unified Save Handler (Template + Event Rule + Active Status) ──
  const handleSaveAll = async () => {
    const code = templateForm?.templateCode?.trim()?.toUpperCase();
    if (!code) {
      alert('Template code is required.');
      return;
    }
    const name = templateForm?.templateName?.trim();
    if (!name) {
      alert('Template name is required.');
      return;
    }
    const subj = templateForm?.subject?.trim();
    if (!subj) {
      alert('Email subject is required.');
      return;
    }
    const htmlBody = templateForm.contentHtml || templateForm.bodyHtml || '';
    if (!htmlBody.trim()) {
      alert('Email HTML content is required.');
      return;
    }

    setSavingAll(true);
    try {
      // 1. Save or Update Email Template
      const templatePayload = {
        templateCode: code,
        templateName: name,
        subject: subj,
        contentHtml: htmlBody,
        contentText: templateForm.contentText || '',
        variablesDescription: templateForm.variablesDescription || templateForm.description || '',
        isActive: selectedRule ? selectedRule.enabled !== false : (templateForm.isActive !== false),
      };

      if (isCreatingTemplate) {
        // [신규 템플릿 생성] POST /admin/email-templates
        await createEmailTemplate(templatePayload);
        setIsCreatingTemplate(false);
      } else {
        // [기존 템플릿 수정] PUT /admin/email-templates/{templateCode}
        const targetCode = originalTemplateCode || code;
        await updateEmailTemplate(targetCode, templatePayload);
      }

      // 2. Save Event Rule and Variable Mappings if rule exists or configured
      if (selectedRule && (selectedRule.eventType || code.startsWith('KYC'))) {
        const eventType = (selectedRule.eventType || (code.startsWith('KYC') ? 'KYC_APPROVED' : code)).trim().toUpperCase();
        const variableMappings = {};
        mappingRows.forEach((r) => {
          const k = (r.key || '').trim();
          if (k) {
            variableMappings[k] = (r.val || '').trim();
          }
        });

        const rulePayload = {
          ...selectedRule,
          eventType,
          templateCode: code,
          targetTemplateCode: code,
          enabled: selectedRule.enabled !== false,
          variableMappings,
        };

        try {
          await saveEventNotificationRule(eventType, rulePayload);
        } catch (ruleErr) {
          console.warn('Failed to save event rule:', ruleErr);
        }
      }

      alert(`Template "${code}" and variable mappings saved successfully!`);
      setSelectedTemplateCode(code);
      setOriginalTemplateCode(code);
      await loadTemplatesAndRules(code);
    } catch (err) {
      alert(`Failed to save template and rules: ${err.message || 'Please check template content and network connection.'}`);
    } finally {
      setSavingAll(false);
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
      setSelectedRule(null);
      setMappingRows([]);
      await loadTemplatesAndRules();
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
      const recipient = testEmailAddress.trim();
      const testContext = {
        email: recipient,
        loginId: recipient.split('@')[0],
        user: {
          email: recipient,
          loginId: recipient.split('@')[0],
        },
      };

      const resolvedVars = {};
      mappingRows.forEach((r) => {
        const k = (r.key || '').trim();
        if (k) {
          resolvedVars[k] = resolveExpressionToPreview(r.val, testContext);
        }
      });

      const res = await sendTestEmailTemplate(templateForm.templateCode, recipient, resolvedVars);
      setTestEmailResult({
        success: true,
        message: res?.message || `Test email sent to ${recipient}`,
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

  // ── Dynamic HTML Live Preview Generator (Based on user mapping rows) ──
  const renderedPreviewHtml = useMemo(() => {
    let html = templateForm?.contentHtml || templateForm?.bodyHtml || '';
    if (!html) return '';

    const recipient = testEmailAddress.trim();
    const previewContext = {
      email: recipient,
      loginId: recipient ? recipient.split('@')[0] : '',
      user: {
        email: recipient,
        loginId: recipient ? recipient.split('@')[0] : '',
      },
    };

    // Replace all mapping row keys in HTML
    mappingRows.forEach((row) => {
      const key = (row.key || '').trim();
      if (key) {
        const val = resolveExpressionToPreview(row.val, previewContext);
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        html = html.replace(regex, val !== undefined && val !== null ? val : '');
      }
    });

    return html;
  }, [templateForm?.contentHtml, templateForm?.bodyHtml, mappingRows, testEmailAddress]);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={handleStartCreateTemplate}
            >
              + Create Template
            </button>
          </div>

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
                        label: 'Automated Status',
                        render: (r) => (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: r.isRuleActive ? '#dcfce7' : '#f1f5f9',
                              color: r.isRuleActive ? '#15803d' : '#64748b',
                              border: `1px solid ${r.isRuleActive ? '#86efac' : '#cbd5e1'}`,
                            }}
                          >
                            {r.isRuleActive ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        ),
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
                    pagination={{
                      page: templatePage,
                      pageSize: templatePageSize,
                      total: templateTotal,
                      totalPages: templateTotalPages,
                      onPageChange: (newPage) => {
                        setTemplatePage(newPage);
                      },
                      onPageSizeChange: (newSize) => {
                        setTemplatePageSize(newSize);
                        setTemplatePage(1);
                      },
                    }}
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
                          padding: '7px 12px',
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
                        ✏️ Edit Template & Variables
                      </button>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '7px 12px',
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
                        🌐 Live HTML Preview
                      </button>
                    </div>

                    {!previewMode ? (
                      <>
                        {/* 1. Template Metadata (No duplicate Status dropdown) */}
                        <AdminDetailSection title="Template Information">
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

                          <div style={{ marginBottom: '4px' }}>
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

                        {/* 2. Automated Dispatch & Variable Mapping (Active switch placed here) */}
                        <AdminDetailSection title="Dynamic Variable Mapping & Automated Dispatch">
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              backgroundColor: selectedRule?.enabled ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${selectedRule?.enabled ? '#bbf7d0' : '#e2e8f0'}`,
                              borderRadius: '8px',
                              marginBottom: '12px',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: selectedRule?.enabled ? '#15803d' : '#475569' }}>
                                Automated Dispatch: {selectedRule?.enabled ? 'ACTIVE (Enabled)' : 'PAUSED (Disabled)'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {selectedRule?.eventType
                                  ? `Bound to event trigger [${selectedRule.eventType}]. Automatic email dispatch will run when this event occurs.`
                                  : 'Configure automated trigger dispatch status for this template.'}
                              </div>
                            </div>
                            <select
                              className="admin-input"
                              style={{ width: '170px', fontWeight: '600', fontSize: '12px' }}
                              value={selectedRule?.enabled ? 'ACTIVE' : 'PAUSED'}
                              onChange={(e) => {
                                const isAct = e.target.value === 'ACTIVE';
                                setSelectedRule((prev) => ({
                                  ...(prev || {}),
                                  enabled: isAct,
                                  eventType: prev?.eventType || templateForm.templateCode,
                                }));
                              }}
                            >
                              <option value="ACTIVE">ACTIVE (Enabled)</option>
                              <option value="PAUSED">PAUSED (Disabled)</option>
                            </select>
                          </div>

                          <div
                            style={{
                              padding: '10px 12px',
                              backgroundColor: '#eff6ff',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              marginBottom: '12px',
                              fontSize: '12px',
                              color: '#1e3a8a',
                              lineHeight: '1.5',
                            }}
                          >
                            <div style={{ fontWeight: '700', marginBottom: '2px' }}>
                              Dynamic Expression Tokens:
                            </div>
                            <div>
                              • <code>user.email</code>, <code>user.loginId</code>, <code>user.cregisWalletAddress</code>, <code>qrCode(user.cregisWalletAddress)</code>, <code>network</code><br />
                              • Static text/URL literals (e.g. <code>https://www.anytap.io/account</code>, <code>support@anytap.io</code>)
                            </div>
                          </div>

                          {/* Variable Mapping Table */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
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
                                No variables mapped yet. Click "+ Add Variable Mapping" or "↺ Reset from HTML".
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
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        width: '100%',
                                        paddingRight: row.isFromTemplate ? '42px' : '8px',
                                      }}
                                    />
                                    {row.isFromTemplate && (
                                      <span
                                        title="Auto-extracted from HTML template body"
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

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--sm"
                              onClick={handleAddVariableRow}
                            >
                              + Add Variable Mapping
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                              onClick={handleResetMappingsFromHtml}
                              title="Reset mappings using variables extracted from current HTML"
                              style={{ fontSize: '12px', color: '#64748b' }}
                            >
                              ↺ Reset from HTML
                            </button>
                          </div>
                        </AdminDetailSection>

                        {/* 3. HTML Email Body Editor */}
                        <AdminDetailSection title="HTML Email Body">
                          {/* Detected placeholders */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                              Detected Placeholders in HTML ({extractedVariables.length}):
                            </div>
                            {extractedVariables.length === 0 ? (
                              <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                                No &#123;&#123;variable&#125;&#125; placeholders detected in template.
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                  padding: '8px 10px',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                }}
                              >
                                {extractedVariables.map((varName) => (
                                  <span
                                    key={varName}
                                    style={{
                                      padding: '3px 8px',
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
                            rows={16}
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

                          {/* Save & Delete Action Row */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                disabled={savingAll}
                                onClick={handleSaveAll}
                                style={{ fontWeight: '700', padding: '8px 20px' }}
                              >
                                {savingAll ? 'Saving Template & Mappings...' : '💾 Save Template & Mappings'}
                              </button>
                            </div>
                            {!isCreatingTemplate && (
                              <button
                                type="button"
                                className="admin-btn admin-btn--danger admin-btn--sm"
                                onClick={() => handleDeleteTemplate(templateForm.templateCode)}
                              >
                                Delete Template
                              </button>
                            )}
                          </div>
                        </AdminDetailSection>
                      </>
                    ) : (
                      /* Live HTML Preview using mapped dynamic values */
                      <AdminDetailSection title="Live Rendered Email Preview (Using Mapped Values)">
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
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#eab308' }} />
                                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                preview://email-render/{templateForm.templateCode}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                              Dynamic Variable Substitution Active
                            </span>
                          </div>
                          <iframe
                            title="Email Live Preview"
                            srcDoc={renderedPreviewHtml}
                            style={{ width: '100%', height: '560px', border: 'none', display: 'block' }}
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </AdminDetailSection>
                    )}

                    {/* Test Dispatch & Test Email Section */}
                    {!isCreatingTemplate && (
                      <AdminDetailSection title="Dispatch Test Email">
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
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                              Recipient Email Address
                            </label>
                            <input
                              type="email"
                              className="admin-input"
                              value={testEmailAddress}
                              onChange={(e) => setTestEmailAddress(e.target.value)}
                              placeholder="e.g. markvol319@gmail.com"
                              style={{ backgroundColor: '#ffffff' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn--primary admin-btn--sm"
                              disabled={testEmailSending}
                              onClick={handleSendTestEmail}
                              style={{
                                backgroundColor: '#0284c7',
                                borderColor: '#0284c7',
                                fontWeight: '700',
                                padding: '8px 16px',
                              }}
                            >
                              {testEmailSending ? 'Sending...' : '📨 Send Test Email (With Mappings)'}
                            </button>
                          </div>

                          {testEmailResult && (
                            <div
                              style={{
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
        </div>
      )}

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
