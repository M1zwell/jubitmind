import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal, CheckCircle2, Circle, ArrowRight, Sparkles,
  Scan, AlertCircle, Loader2, Eye, EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';

interface DetectedTool {
  id: string;
  name: string;
  available: boolean;
}

interface ProviderOption {
  id: string;
  name: string;
  defaultModel: string;
  needsKey: boolean;
  hasKey: boolean;
  isActive: boolean;
}

type JubitMindAPI = {
  isFirstRun?: () => Promise<boolean>;
  completeSetup?: () => Promise<boolean>;
};

const TOTAL_STEPS = 4;

export function SetupWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1: Tool detection
  const [tools, setTools] = useState<DetectedTool[]>([]);
  const [detecting, setDetecting] = useState(false);

  // Step 2: Extraction setup
  const [sidecarAvailable, setSidecarAvailable] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  // Redirect if not Electron or not first run
  useEffect(() => {
    const jm = (window as unknown as { jubitmind?: JubitMindAPI }).jubitmind;
    if (!jm?.isFirstRun) {
      navigate('/', { replace: true });
      return;
    }
    jm.isFirstRun().then((isFirst) => {
      if (!isFirst) navigate('/', { replace: true });
    });
  }, [navigate]);

  const detectTools = async () => {
    setDetecting(true);
    try {
      const adapters = await api.adapters.list();
      setTools(
        adapters.map((a: { id: string; name: string; available: boolean }) => ({
          id: a.id,
          name: a.name,
          available: a.available,
        })),
      );
    } catch {
      setTools([]);
    }
    setDetecting(false);
  };

  const checkSidecar = async () => {
    try {
      const status = await api.extractions.status();
      setSidecarAvailable(status.available ?? false);
    } catch {
      setSidecarAvailable(false);
    }

    try {
      const data = await api.extractions.providers();
      setProviders(data.providers ?? []);
      const active = data.providers?.find((p: ProviderOption) => p.isActive);
      if (active) setSelectedProvider(active.id);
    } catch {
      setProviders([]);
    }
  };

  const handleProviderSelect = (id: string) => {
    setSelectedProvider(id);
    setApiKey('');
    setTestResult(null);
    setTestMessage('');
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage('');
    try {
      // Save config first
      const provider = providers.find((p) => p.id === selectedProvider);
      await api.extractions.updateConfig({
        provider: selectedProvider,
        model_id: provider?.defaultModel || '',
        ...(apiKey ? { api_key: apiKey } : {}),
      });

      // Test by checking status again
      const status = await api.extractions.status();
      if (status.available) {
        setTestResult('success');
        setTestMessage('Connection successful! Extraction engine is ready.');
      } else {
        setTestResult('error');
        setTestMessage('Sidecar is running but provider may not be configured correctly.');
      }
    } catch (err) {
      setTestResult('error');
      setTestMessage(err instanceof Error ? err.message : 'Connection test failed.');
    }
    setTesting(false);
  };

  const completeWizard = async () => {
    const jm = (window as unknown as { jubitmind?: JubitMindAPI }).jubitmind;
    if (jm?.completeSetup) {
      await jm.completeSetup();
    }
    navigate('/', { replace: true });
  };

  const selectedProviderInfo = providers.find((p) => p.id === selectedProvider);
  const providerNeedsKey = selectedProviderInfo?.needsKey ?? false;

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 mb-4 shadow-lg shadow-teal-500/25">
            <Terminal className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-teal-400' : i < step ? 'w-4 bg-teal-400/50' : 'w-4 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-xl">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Welcome to JubitMind</h1>
              <p className="text-sm text-[#8b949e] mb-6 leading-relaxed">
                Your AI interaction audit dashboard. JubitMind monitors your AI coding tools,
                tracks usage, analyzes security risks, and generates comprehensive reports.
              </p>
              <div className="space-y-3 text-left mb-8">
                <Feature text="Monitor AI tool sessions and interactions" />
                <Feature text="Security auditing with risk detection" />
                <Feature text="Structured entity extraction with LangExtract" />
                <Feature text="One-click comprehensive reports" />
              </div>
              <button
                onClick={() => { setStep(1); detectTools(); }}
                className="w-full py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Tool Detection */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Detected AI Tools</h2>
              <p className="text-sm text-[#8b949e] mb-6">
                We scanned your system for installed AI coding tools.
              </p>

              {detecting ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-[#8b949e]">Scanning...</span>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {tools.length > 0 ? (
                    tools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#0d1117] border border-[#30363d]"
                      >
                        <span className="text-sm text-white">{tool.name}</span>
                        {tool.available ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Detected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                            <Circle className="w-3.5 h-3.5" />
                            Not found
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#8b949e] text-center py-4">
                      No AI tools detected. You can configure them later in Settings.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => { setStep(2); checkSidecar(); }}
                disabled={detecting}
                className="w-full py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Extraction Setup */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Scan className="w-5 h-5 text-teal-400" />
                <h2 className="text-xl font-bold text-white">Extraction Engine</h2>
              </div>
              <p className="text-sm text-[#8b949e] mb-6">
                JubitMind uses LangExtract to analyze conversations and extract structured entities
                (permissions, risks, code artifacts, decisions). Choose an LLM provider to power extractions.
              </p>

              {/* Sidecar status */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d]">
                {sidecarAvailable === null ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#8b949e] animate-spin" />
                    <span className="text-xs text-[#8b949e]">Checking extraction engine...</span>
                  </>
                ) : sidecarAvailable ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">Extraction engine running</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400">Extraction engine not available — you can set this up later</span>
                  </>
                )}
              </div>

              {/* Provider selection */}
              {sidecarAvailable && (
                <>
                  <div className="space-y-2 mb-4">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleProviderSelect(p.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left ${
                          selectedProvider === p.id
                            ? 'bg-teal-500/10 border-teal-500/50'
                            : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                        }`}
                      >
                        <div>
                          <span className="text-sm text-white">{p.name}</span>
                          <span className="text-xs text-[#8b949e] ml-2">{p.defaultModel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.needsKey && (
                            <span className={`text-xs ${p.hasKey ? 'text-green-400' : 'text-[#8b949e]'}`}>
                              {p.hasKey ? 'Key found' : 'Needs API key'}
                            </span>
                          )}
                          {!p.needsKey && (
                            <span className="text-xs text-green-400">Free / Local</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* API key input (only for providers that need it) */}
                  {providerNeedsKey && !selectedProviderInfo?.hasKey && (
                    <div className="mb-4">
                      <label className="text-xs text-[#8b949e] mb-1 block">API Key</label>
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                          placeholder={`Enter your ${selectedProviderInfo?.name} API key`}
                          className="w-full px-3 py-2 pr-10 rounded-lg bg-[#0d1117] border border-[#30363d] text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-teal-500"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Test connection */}
                  {selectedProvider && (
                    <button
                      onClick={testConnection}
                      disabled={testing || (providerNeedsKey && !selectedProviderInfo?.hasKey && !apiKey)}
                      className="w-full py-2 mb-3 rounded-lg border border-[#30363d] hover:border-teal-500/50 text-sm text-[#c9d1d9] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                  )}

                  {/* Test result */}
                  {testResult && (
                    <div className={`flex items-start gap-2 mb-4 px-3 py-2 rounded-lg text-xs ${
                      testResult === 'success'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {testResult === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{testMessage}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-lg border border-[#30363d] hover:border-[#484f58] text-[#8b949e] text-sm transition-colors"
                >
                  {sidecarAvailable ? 'Skip for now' : 'Continue'}
                </button>
                {sidecarAvailable && selectedProvider && (
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: All set */}
          {step === 3 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">All Set!</h2>
              <p className="text-sm text-[#8b949e] mb-3">
                JubitMind is ready to monitor your AI interactions.
              </p>
              <div className="text-left space-y-2 mb-8 bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
                <p className="text-xs text-[#8b949e]">Configuration:</p>
                <ConfigItem label="Security audit" value="Every 30 minutes" />
                <ConfigItem label="Usage insights" value="Every 1 hour" />
                <ConfigItem label="Session monitoring" value="Real-time" />
                <ConfigItem
                  label="Extraction engine"
                  value={sidecarAvailable ? (selectedProvider || 'Not configured') : 'Not available'}
                />
              </div>
              <button
                onClick={completeWizard}
                className="w-full py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-medium text-sm transition-colors"
              >
                Open Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
      <span className="text-sm text-[#c9d1d9]">{text}</span>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#c9d1d9]">{label}</span>
      <span className="text-xs text-teal-400">{value}</span>
    </div>
  );
}
