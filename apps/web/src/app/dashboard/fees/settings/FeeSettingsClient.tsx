'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import { updateInstitutionFeeSettingsAction } from '../actions';
import {
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface FeeSettingsClientProps {
  initialSettings: any;
  userRole: string;
}

export function FeeSettingsClient({ initialSettings, userRole }: FeeSettingsClientProps) {
  const [currency, setCurrency] = useState(initialSettings?.currency || 'INR');
  const [currencySymbol, setCurrencySymbol] = useState(initialSettings?.currency_symbol || '₹');
  const [receiptPrefix, setReceiptPrefix] = useState(initialSettings?.receipt_prefix || 'RCP');
  const [invoicePrefix, setInvoicePrefix] = useState(initialSettings?.invoice_prefix || 'INV');
  const [lateFeeDailyAmount, setLateFeeDailyAmount] = useState(
    initialSettings?.default_late_fee_per_day || 10
  );
  const [gracePeriodDays, setGracePeriodDays] = useState(
    initialSettings?.grace_period_days || 7
  );
  const [gatewayProvider, setGatewayProvider] = useState(
    initialSettings?.gateway_provider || 'razorpay'
  );
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(
    Boolean(initialSettings?.is_gateway_live)
  );
  const [gatewayKeyId, setGatewayKeyId] = useState(
    initialSettings?.gateway_key_id || ''
  );
  const [gatewayWebhookSecret, setGatewayWebhookSecret] = useState(
    initialSettings?.webhook_secret_ciphertext || ''
  );

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await updateInstitutionFeeSettingsAction({
        currency,
        currencySymbol,
        receiptPrefix: receiptPrefix.toUpperCase(),
        invoicePrefix: invoicePrefix.toUpperCase(),
        lateFeeEnabled: Number(lateFeeDailyAmount) > 0,
        lateFeeDailyAmount: Number(lateFeeDailyAmount),
        gracePeriodDays: Number(gracePeriodDays),
        gatewayProvider,
        isGatewayEnabled,
        gatewayKeyId: gatewayKeyId || undefined,
        gatewayWebhookSecret: gatewayWebhookSecret || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update fee settings.');
      } else {
        setSuccessMsg('Institutional fee settings updated successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Institutional Fee Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customize receipt prefixes, numbering sequences, late fee policies, and payment gateway integrations.
          </p>
        </div>
      </div>

      <div className="px-2">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Fee Configuration & Gateway Integration</CardTitle>
          </CardHeader>
          <CardContent>
            {successMsg && (
              <div className="mb-6 flex items-center space-x-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="mb-6 flex items-center space-x-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Receipt & Invoice Series */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Numbering Sequences & Prefixes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Receipt Number Prefix
                    </label>
                    <Input
                      value={receiptPrefix}
                      onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                      placeholder="RCP"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Generates numbers like <span className="font-mono">{receiptPrefix}-2026-000001</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Invoice Prefix
                    </label>
                    <Input
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                      placeholder="INV"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Generates invoices like <span className="font-mono">{invoicePrefix}-2026-000001</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Late Fee Policy */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Late Fee Policy & Grace Periods
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Grace Period (Days after due date)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Days before late fees start accumulating.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Daily Late Fine (₹ per day)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={lateFeeDailyAmount}
                      onChange={(e) => setLateFeeDailyAmount(Number(e.target.value))}
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Fixed daily fine assessed for overdue balances.
                    </p>
                  </div>
                </div>
              </div>

              {/* Currency & Locale */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Currency Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Currency Code
                    </label>
                    <Input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      placeholder="INR"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Currency Symbol
                    </label>
                    <Input
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="₹"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Online Payment Gateway */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment Gateway Integration
                  </h3>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGatewayEnabled}
                      onChange={(e) => setIsGatewayEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span>Enable Online Payments</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Gateway Provider
                    </label>
                    <Select
                      value={gatewayProvider}
                      onChange={(e) => setGatewayProvider(e.target.value)}
                    >
                      <option value="razorpay">Razorpay</option>
                      <option value="stripe">Stripe</option>
                      <option value="mock">Sandbox / Test Simulator</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      API Key ID
                    </label>
                    <Input
                      placeholder="rzp_test_..."
                      value={gatewayKeyId}
                      onChange={(e) => setGatewayKeyId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Webhook Secret
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={gatewayWebhookSecret}
                      onChange={(e) => setGatewayWebhookSecret(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
