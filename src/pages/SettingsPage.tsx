import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, RotateCcw, CheckCircle2, Sun, Moon, Key, Trash2, Plus, Eye, EyeOff, Globe, Star, Code2 } from 'lucide-react';
import { settingsApi, ApiKeyInfo } from '@/src/lib/api';

const API_BASE = 'http://localhost:3001/api';
function getToken() { return localStorage.getItem('rycode_token'); }
async function apiSettings<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/settings${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

const BUILTIN_PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    models: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-pro-preview-03-25',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1',
      'o1-mini',
      'o3-mini',
    ],
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    models: [
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-haiku-3-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
  },
];

const CUSTOM_PRESETS = [
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'SiliconFlow', url: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { label: 'Together AI', url: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { label: 'MiniMax', url: 'https://api.minimaxi.com/v1', model: 'abab6.5s-chat' },
  { label: 'Moonshot (Kimi)', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: '智谱 GLM', url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { label: '阿里百炼 (Qwen)', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  { label: '字节豆包', url: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-4k' },
  { label: 'Ollama (本地)', url: 'http://localhost:11434/v1', model: 'llama3.2' },
  { label: 'Azure OpenAI', url: 'https://<resource>.openai.azure.com/openai/deployments/<deployment>', model: 'gpt-4o' },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'provider';
}

export const SettingsPage: React.FC = () => {
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);

  // Built-in provider form state
  const [adding, setAdding] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newModel, setNewModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Custom provider form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [showCustomKey, setShowCustomKey] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);
  const [customError, setCustomError] = useState('');

  // Judge0 config state
  const [judge0Key, setJudge0Key] = useState('');
  const [judge0Host, setJudge0Host] = useState('');
  const [judge0HasKey, setJudge0HasKey] = useState(false);
  const [judge0Saving, setJudge0Saving] = useState(false);
  const [showJudge0Key, setShowJudge0Key] = useState(false);

  // Default provider state
  const [defaultProvider, setDefaultProvider] = useState('');
  const [defaultProviderSaving, setDefaultProviderSaving] = useState(false);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
    loadApiKeys();
    loadJudge0();
    loadDefaultProvider();
  }, []);

  const loadJudge0 = async () => {
    try {
      const data = await apiSettings<{ judge0ApiKey: string; judge0Host: string; hasKey: boolean }>('/judge0');
      setJudge0HasKey(data.hasKey);
      setJudge0Host(data.judge0Host);
    } catch {}
  };

  const loadDefaultProvider = async () => {
    try {
      const data = await apiSettings<{ defaultProvider: string }>('/default-provider');
      setDefaultProvider(data.defaultProvider ?? '');
    } catch {}
  };

  const handleSaveJudge0 = async () => {
    setJudge0Saving(true);
    try {
      await apiSettings('/judge0', {
        method: 'PUT',
        body: JSON.stringify({ judge0ApiKey: judge0Key || undefined, judge0Host: judge0Host || undefined }),
      });
      await loadJudge0();
      setJudge0Key('');
      showAlert();
    } catch (err: any) {
      setError(err.message ?? '保存失败');
    } finally {
      setJudge0Saving(false);
    }
  };

  const handleSetDefaultProvider = async (provider: string) => {
    setDefaultProviderSaving(true);
    try {
      await apiSettings('/default-provider', {
        method: 'PUT',
        body: JSON.stringify({ provider }),
      });
      setDefaultProvider(provider);
      showAlert();
    } catch (err: any) {
      setError(err.message ?? '设置失败');
    } finally {
      setDefaultProviderSaving(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const { apiKeys } = await settingsApi.getApiKeys();
      setApiKeys(apiKeys);
    } catch { /* silently fail */ }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleSaveKey = async (providerId: string) => {
    if (!newKey.trim()) return;
    setSaving(true);
    setError('');
    try {
      await settingsApi.saveApiKey(providerId, newKey.trim(), newModel || undefined);
      await loadApiKeys();
      setAdding(null);
      setNewKey('');
      setNewModel('');
      showAlert();
    } catch (err: any) {
      setError(err.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    try {
      await settingsApi.deleteApiKey(provider);
      await loadApiKeys();
    } catch (err: any) {
      setError(err.message ?? '删除失败');
    }
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customUrl.trim() || !customKey.trim()) {
      setCustomError('名称、URL 和 API Key 为必填项');
      return;
    }
    try { new URL(customUrl); } catch {
      setCustomError('Base URL 格式无效，请输入完整 URL');
      return;
    }
    setCustomSaving(true);
    setCustomError('');
    try {
      const provider = `custom:${slugify(customName)}`;
      await settingsApi.saveApiKey(
        provider,
        customKey.trim(),
        customModel.trim() || undefined,
        customUrl.trim(),
        customName.trim(),
      );
      await loadApiKeys();
      setShowCustomForm(false);
      setCustomName('');
      setCustomUrl('');
      setCustomModel('');
      setCustomKey('');
      showAlert();
    } catch (err: any) {
      setCustomError(err.message ?? '保存失败');
    } finally {
      setCustomSaving(false);
    }
  };

  const showAlert = () => {
    setShowSavedAlert(true);
    setTimeout(() => setShowSavedAlert(false), 3000);
  };

  const handleSaveProfile = async () => {
    try {
      await settingsApi.saveProfile(theme, 'zh-CN');
    } catch { /* apply locally */ }
    showAlert();
  };

  const getBuiltinKey = (providerId: string) =>
    apiKeys.find(k => k.provider === providerId);

  const customKeys = apiKeys.filter(k => k.provider.startsWith('custom'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-12 max-w-4xl w-full mx-auto custom-scrollbar overflow-y-auto h-full relative"
    >
      {/* Saved alert */}
      <AnimatePresence>
        {showSavedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-bold text-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            设置已保存
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-on-surface mb-2">设置</h2>
        <p className="text-on-surface-variant text-sm">配置您的 AI 引擎连接与偏好设置。</p>
      </div>

      <div className="space-y-10">

        {/* ── Built-in API Keys ── */}
        <section>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              内置 AI 提供商
            </h3>
            <p className="text-xs text-outline-variant mt-1">配置 Gemini、OpenAI、Claude 的 API Key。密钥经过 AES-256 加密存储。</p>
          </div>
          <div className="space-y-3">
            {BUILTIN_PROVIDERS.map(provider => {
              const existing = getBuiltinKey(provider.id);
              const isAdding = adding === provider.id;
              return (
                <div key={provider.id} className="bg-surface-container-high border border-outline-variant/20 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${existing ? 'bg-emerald-400' : 'bg-outline-variant'}`} />
                      <span className="font-bold text-sm text-on-surface">{provider.label}</span>
                      {existing && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          已配置 · {existing.defaultModel ?? '默认模型'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {existing && defaultProvider === provider.id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">默认</span>
                      )}
                      {existing && defaultProvider !== provider.id && (
                        <button
                          onClick={() => handleSetDefaultProvider(provider.id)}
                          disabled={defaultProviderSaving}
                          title="设为默认 AI 提供商"
                          className="text-xs font-bold px-2 py-1 rounded-lg text-outline-variant hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {existing && (
                        <button
                          onClick={() => handleDeleteKey(provider.id)}
                          className="p-1.5 text-outline-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setAdding(isAdding ? null : provider.id);
                          setNewKey('');
                          setNewModel(provider.models[0]);
                          setError('');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {existing ? '更新' : '添加'}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isAdding && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-outline-variant/20 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">API Key</label>
                            <div className="relative">
                              <input
                                type={showKey ? 'text' : 'password'}
                                value={newKey}
                                onChange={e => setNewKey(e.target.value)}
                                placeholder={`输入您的 ${provider.label} API Key`}
                                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 pr-12 py-2.5 text-sm text-on-surface transition-all outline-none font-mono"
                              />
                              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface">
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">默认模型</label>
                            <select
                              value={newModel}
                              onChange={e => setNewModel(e.target.value)}
                              className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none"
                            >
                              {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          {error && <p className="text-xs text-error">{error}</p>}
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setAdding(null); setError(''); }} className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface">
                              取消
                            </button>
                            <button
                              onClick={() => handleSaveKey(provider.id)}
                              disabled={!newKey.trim() || saving}
                              className="px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg disabled:opacity-50"
                            >
                              {saving ? '保存中...' : '保存密钥'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Custom Providers ── */}
        <section>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Globe className="w-5 h-5 text-secondary" />
                自定义 Provider
              </h3>
              <p className="text-xs text-outline-variant mt-1">兼容 OpenAI 接口的任意 API 端点，如 DeepSeek、Ollama、SiliconFlow 等。</p>
            </div>
            <button
              onClick={() => { setShowCustomForm(!showCustomForm); setCustomError(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              添加 Provider
            </button>
          </div>

          {/* Existing custom providers list */}
          {customKeys.length > 0 && (
            <div className="space-y-2 mb-4">
              {customKeys.map(k => (
                <div key={k.provider} className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <span className="font-bold text-sm text-on-surface">{k.customName ?? k.provider}</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        {k.baseUrl && (
                          <span className="text-[10px] font-mono text-outline-variant">{k.baseUrl}</span>
                        )}
                        {k.defaultModel && (
                          <span className="text-[10px] font-mono text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">{k.defaultModel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {defaultProvider === k.provider ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">默认</span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultProvider(k.provider)}
                        disabled={defaultProviderSaving}
                        title="设为默认 AI 提供商"
                        className="p-1.5 text-outline-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-40"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteKey(k.provider)}
                      className="p-1.5 text-outline-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add custom provider form */}
          <AnimatePresence>
            {showCustomForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-container-high border border-secondary/20 rounded-xl p-6 space-y-4">
                  {/* Preset chips */}
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant mb-2">快速预设</p>
                    <div className="flex flex-wrap gap-2">
                      {CUSTOM_PRESETS.map(p => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setCustomName(prev => prev || p.label);
                            setCustomUrl(p.url);
                            setCustomModel(prev => prev || p.model);
                          }}
                          className="px-3 py-1 text-xs font-bold rounded-full bg-surface-container-low border border-outline-variant/30 text-on-surface-variant hover:border-secondary hover:text-secondary transition-all"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Provider 名称 *</label>
                      <input
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        placeholder="如：DeepSeek、我的 Ollama"
                        className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-secondary rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">模型名称</label>
                      <input
                        value={customModel}
                        onChange={e => setCustomModel(e.target.value)}
                        placeholder="如：deepseek-chat、llama3.2"
                        className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-secondary rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">API Base URL *</label>
                    <input
                      value={customUrl}
                      onChange={e => setCustomUrl(e.target.value)}
                      placeholder="如：https://api.deepseek.com/v1"
                      className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-secondary rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">API Key *</label>
                    <div className="relative">
                      <input
                        type={showCustomKey ? 'text' : 'password'}
                        value={customKey}
                        onChange={e => setCustomKey(e.target.value)}
                        placeholder="输入 API Key"
                        className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-secondary rounded-xl px-4 pr-12 py-2.5 text-sm text-on-surface outline-none transition-all font-mono"
                      />
                      <button type="button" onClick={() => setShowCustomKey(!showCustomKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface">
                        {showCustomKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {customError && <p className="text-xs text-error">{customError}</p>}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => { setShowCustomForm(false); setCustomError(''); }}
                      className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveCustom}
                      disabled={customSaving}
                      className="px-5 py-2 bg-secondary text-on-secondary text-xs font-bold rounded-lg disabled:opacity-50 transition-all"
                    >
                      {customSaving ? '保存中...' : '保存 Provider'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {customKeys.length === 0 && !showCustomForm && (
            <div className="border border-dashed border-outline-variant/30 rounded-xl p-8 text-center">
              <Globe className="w-8 h-8 text-outline-variant/50 mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant">还没有配置自定义 Provider</p>
              <p className="text-xs text-outline-variant mt-1">支持任何兼容 OpenAI 接口的 API 端点</p>
            </div>
          )}
        </section>

        {/* ── Judge0 Config ── */}
        <section>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Code2 className="w-5 h-5 text-tertiary" />
              Judge0 代码执行引擎
            </h3>
            <p className="text-xs text-outline-variant mt-1">
              配置 Judge0 API Key 以执行真实代码。未配置时使用模拟模式。
              可在 <a href="https://rapidapi.com/judge0-official/api/judge0-ce" target="_blank" rel="noreferrer" className="text-primary underline">RapidAPI</a> 免费获取。
            </p>
          </div>
          <div className="bg-surface-container-high border border-outline-variant/20 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${judge0HasKey ? 'bg-emerald-400' : 'bg-outline-variant'}`} />
              <span className="text-xs text-on-surface-variant">{judge0HasKey ? '已配置 API Key' : '未配置（模拟模式）'}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showJudge0Key ? 'text' : 'password'}
                  value={judge0Key}
                  onChange={e => setJudge0Key(e.target.value)}
                  placeholder={judge0HasKey ? '••••••••（已设置，重新输入覆盖）' : '输入 RapidAPI Key'}
                  className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary rounded-xl px-4 py-2.5 pr-10 text-sm text-on-surface outline-none"
                />
                <button type="button" onClick={() => setShowJudge0Key(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface">
                  {showJudge0Key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Judge0 Host <span className="font-normal text-outline-variant">(可选，默认 judge0-ce.p.rapidapi.com)</span></label>
              <input
                type="text"
                value={judge0Host}
                onChange={e => setJudge0Host(e.target.value)}
                placeholder="judge0-ce.p.rapidapi.com"
                className="w-full bg-surface-container-low border border-outline-variant/30 focus:border-primary rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveJudge0}
                disabled={judge0Saving || (!judge0Key.trim() && !judge0Host.trim())}
                className="flex items-center gap-2 px-5 py-2 bg-tertiary text-on-tertiary text-xs font-bold rounded-lg disabled:opacity-50 hover:opacity-90 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {judge0Saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Theme ── */}
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">外观主题</h3>
            <p className="text-xs text-outline-variant mt-1">选择您偏好的界面主题。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline-variant'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="font-bold text-sm">深色模式</span>
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline-variant'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="font-bold text-sm">浅色模式</span>
            </button>
          </div>
        </section>

        <div className="pt-8 border-t border-outline-variant/10 flex justify-end gap-3">
          <button
            onClick={() => handleThemeChange('dark')}
            className="px-6 py-2 text-sm font-medium text-outline-variant hover:text-on-surface transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置默认
          </button>
          <button
            onClick={handleSaveProfile}
            className="px-8 py-2 bg-primary hover:bg-primary-dim text-on-primary text-sm font-bold rounded transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存更改
          </button>
        </div>
      </div>
    </motion.div>
  );
};