'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  HelpCircle, 
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { MercadoLivreConfig, ShopeeConfig } from '@/types';

export default function SettingsPage() {
  const [mlConfig, setMlConfig] = useState<MercadoLivreConfig | null>(null);
  const [shopeeConfig, setShopeeConfig] = useState<ShopeeConfig | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [mlForm, setMlForm] = useState({
    classic_commission_rate: '',
    premium_commission_rate: '',
    fixed_fee: '',
    fixed_fee_threshold: '',
    tax_rate: '',
    shipping_subsidy_rate: ''
  });

  const [shopeeForm, setShopeeForm] = useState({
    commission_rate: '',
    transaction_fee_rate: '',
    service_fee_rate: '',
    tax_rate: '',
    has_free_shipping_program: true,
    has_cashback_program: false
  });

  const parseFormFloat = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.replace(',', '.')) || 0;
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mlRes, shopeeRes] = await Promise.all([
        api.getMLConfig(),
        api.getShopeeConfig()
      ]);
      setMlConfig(mlRes);
      setShopeeConfig(shopeeRes);

      setMlForm({
        classic_commission_rate: mlRes.classic_commission_rate.toString(),
        premium_commission_rate: mlRes.premium_commission_rate.toString(),
        fixed_fee: mlRes.fixed_fee.toString(),
        fixed_fee_threshold: mlRes.fixed_fee_threshold.toString(),
        tax_rate: mlRes.tax_rate.toString(),
        shipping_subsidy_rate: mlRes.shipping_subsidy_rate.toString()
      });

      setShopeeForm({
        commission_rate: shopeeRes.commission_rate.toString(),
        transaction_fee_rate: shopeeRes.transaction_fee_rate.toString(),
        service_fee_rate: shopeeRes.service_fee_rate.toString(),
        tax_rate: shopeeRes.tax_rate.toString(),
        has_free_shipping_program: shopeeRes.has_free_shipping_program,
        has_cashback_program: shopeeRes.has_cashback_program
      });
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar configurações de taxas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveML = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mlConfig) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        ...mlConfig,
        classic_commission_rate: parseFormFloat(mlForm.classic_commission_rate),
        premium_commission_rate: parseFormFloat(mlForm.premium_commission_rate),
        fixed_fee: parseFormFloat(mlForm.fixed_fee),
        fixed_fee_threshold: parseFormFloat(mlForm.fixed_fee_threshold),
        tax_rate: parseFormFloat(mlForm.tax_rate),
        shipping_subsidy_rate: parseFormFloat(mlForm.shipping_subsidy_rate)
      };
      await api.updateMLConfig(payload);
      setMlConfig(payload);
      setSuccessMsg('Configurações do Mercado Livre salvas com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações do Mercado Livre.');
    }
  };

  const handleSaveShopee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopeeConfig) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = {
        ...shopeeConfig,
        commission_rate: parseFormFloat(shopeeForm.commission_rate),
        transaction_fee_rate: parseFormFloat(shopeeForm.transaction_fee_rate),
        service_fee_rate: parseFormFloat(shopeeForm.service_fee_rate),
        tax_rate: parseFormFloat(shopeeForm.tax_rate),
        has_free_shipping_program: shopeeForm.has_free_shipping_program,
        has_cashback_program: shopeeForm.has_cashback_program
      };
      await api.updateShopeeConfig(payload);
      setShopeeConfig(payload);
      setSuccessMsg('Configurações da Shopee salvas com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações da Shopee.');
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-3">
          <Settings className="w-8 h-8 text-emerald-400" />
          <span>Configurações Gerais</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Ajuste as comissões, taxas fixas, regras de frete e alíquotas tributárias
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 flex items-center space-x-2 text-sm max-w-2xl">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 flex items-center space-x-2 text-sm max-w-2xl">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Mercado Livre Config */}
        {mlConfig && (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4">
              <h3 className="font-bold text-lg dark:text-white">Taxas Mercado Livre</h3>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-black tracking-wider">
                ML Config
              </span>
            </div>

            <form onSubmit={handleSaveML} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Comissão Clássico (%)</label>
                  <input
                    type="text" required
                    value={mlForm.classic_commission_rate}
                    onChange={(e) => setMlForm({ ...mlForm, classic_commission_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Comissão Premium (%)</label>
                  <input
                    type="text" required
                    value={mlForm.premium_commission_rate}
                    onChange={(e) => setMlForm({ ...mlForm, premium_commission_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Taxa Fixa Under Threshold (R$)</label>
                  <input
                    type="text" required
                    value={mlForm.fixed_fee}
                    onChange={(e) => setMlForm({ ...mlForm, fixed_fee: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Limite Frete Grátis (R$)</label>
                  <input
                    type="text" required
                    value={mlForm.fixed_fee_threshold}
                    onChange={(e) => setMlForm({ ...mlForm, fixed_fee_threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Imposto Simples (%)</label>
                  <input
                    type="text" required
                    value={mlForm.tax_rate}
                    onChange={(e) => setMlForm({ ...mlForm, tax_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Subsídio Frete (%)</label>
                  <input
                    type="text" required
                    value={mlForm.shipping_subsidy_rate}
                    onChange={(e) => setMlForm({ ...mlForm, shipping_subsidy_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Taxas ML</span>
              </button>
            </form>
          </div>
        )}

        {/* Shopee Config */}
        {shopeeConfig && (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4">
              <h3 className="font-bold text-lg dark:text-white">Taxas Shopee</h3>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-black tracking-wider">
                Shopee Config
              </span>
            </div>

            <form onSubmit={handleSaveShopee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Comissão Base (%)</label>
                  <input
                    type="text" required
                    value={shopeeForm.commission_rate}
                    onChange={(e) => setShopeeForm({ ...shopeeForm, commission_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Taxa de Transação (%)</label>
                  <input
                    type="text" required
                    value={shopeeForm.transaction_fee_rate}
                    onChange={(e) => setShopeeForm({ ...shopeeForm, transaction_fee_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Taxa de Serviço (%)</label>
                  <input
                    type="text" required
                    value={shopeeForm.service_fee_rate}
                    onChange={(e) => setShopeeForm({ ...shopeeForm, service_fee_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Imposto Simples (%)</label>
                  <input
                    type="text" required
                    value={shopeeForm.tax_rate}
                    onChange={(e) => setShopeeForm({ ...shopeeForm, tax_rate: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shopeeForm.has_free_shipping_program}
                    onChange={(e) => setShopeeForm({ ...shopeeForm, has_free_shipping_program: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Participa do Programa de Frete Grátis (+6% taxa)</span>
                </label>
                
                <label className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shopeeForm.has_cashback_program}
                    onChange={(e) => setShopeeForm({ ...shopeeForm, has_cashback_program: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Participa do Programa de Moedas / Cashback</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Taxas Shopee</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
