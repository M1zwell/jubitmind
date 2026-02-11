import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface DetectedTool {
  id: string;
  name: string;
  available: boolean;
}

type JubitMindAPI = {
  isFirstRun?: () => Promise<boolean>;
  completeSetup?: () => Promise<boolean>;
};

export function SetupWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [tools, setTools] = useState<DetectedTool[]>([]);
  const [detecting, setDetecting] = useState(false);

  // Redirect if not Electron or not first run
  useEffect(() => {
    const jm = (window as unknown as { jubitmind?: JubitMindAPI }).jubitmind;
    if (!jm?.isFirstRun) {
      // Not in Electron - go to dashboard
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

  const completeWizard = async () => {
    const jm = (window as unknown as { jubitmind?: JubitMindAPI }).jubitmind;
    if (jm?.completeSetup) {
      await jm.completeSetup();
    }
    navigate('/', { replace: true });
  };

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
          {[0, 1, 2].map((i) => (
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
                <Feature text="Usage analytics and cost tracking" />
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
                onClick={() => setStep(2)}
                disabled={detecting}
                className="w-full py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: All set */}
          {step === 2 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">All Set!</h2>
              <p className="text-sm text-[#8b949e] mb-3">
                JubitMind is ready to monitor your AI interactions.
              </p>
              <div className="text-left space-y-2 mb-8 bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
                <p className="text-xs text-[#8b949e]">Default configuration:</p>
                <ConfigItem label="Security audit" value="Every 30 minutes" />
                <ConfigItem label="Usage insights" value="Every 1 hour" />
                <ConfigItem label="Session monitoring" value="Real-time" />
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
