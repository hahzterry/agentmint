"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  Check,
} from "lucide-react";
import { TemplatePicker } from "@/components/TemplatePicker";
import { AgentConfigForm } from "@/components/AgentConfigForm";
import { AgentAvatar } from "@/components/AgentAvatar";
import { SplitEditor } from "@/components/SplitEditor";
import { ChatMessage } from "@/components/ChatMessage";
import {
  listTemplates,
  generateAgent,
  createAgent,
  previewChatStream,
  getAgent,
  type AgentTemplate,
  type AgentConfig,
  type AgentRecord,
  type TeamMember,
  type ChatStreamEvent,
} from "@/lib/api";

type Step = "describe" | "review" | "launch";

function CreateAgentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();

  const forkFromId = searchParams.get("fork");
  const [forkParent, setForkParent] = useState<AgentRecord | null>(null);

  const [step, setStep] = useState<Step>("describe");
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Generated config
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");

  // Animated reveal
  const [revealStage, setRevealStage] = useState(0);

  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Preview chat
  const [previewMessages, setPreviewMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      toolsUsed?: string[];
      activeTools?: string[];
      isStreaming?: boolean;
      agentCalls?: Array<{
        agentId: string;
        agentName: string;
        response?: string;
      }>;
    }>
  >([]);
  const [previewInput, setPreviewInput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Creating
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listTemplates().then(setTemplates).catch(console.error);
  }, []);

  // Fork pre-fill: fetch parent agent and jump to review
  useEffect(() => {
    if (!forkFromId || !publicKey) return;
    getAgent(forkFromId)
      .then((parent) => {
        setForkParent(parent);
        setConfig(parent.config);
        setAgentName(`${parent.name} Fork`);
        setAgentDescription(parent.description);
        setTokenSymbol(parent.tokenSymbol || "FORK");

        // Team: 70% creator, 10% original creator, 20% platform
        setTeamMembers([
          {
            wallet: publicKey.toBase58(),
            role: "creator",
            bps: 7000,
            label: "Creator",
          },
          {
            wallet: parent.creatorWallet,
            role: "original_creator",
            bps: 1000,
            label: `Original Creator (${parent.name})`,
          },
          {
            wallet: "AGNTplatform1111111111111111111111111111111",
            role: "platform",
            bps: 2000,
            label: "AgentMint Platform",
          },
        ]);

        // Jump straight to review with animation
        setRevealStage(0);
        setStep("review");
        setTimeout(() => setRevealStage(1), 200);
        setTimeout(() => setRevealStage(2), 500);
        setTimeout(() => setRevealStage(3), 800);
        setTimeout(() => setRevealStage(4), 1100);
        setTimeout(() => setRevealStage(5), 1400);
      })
      .catch(console.error);
  }, [forkFromId, publicKey]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo(
      0,
      previewScrollRef.current.scrollHeight
    );
  }, [previewMessages]);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      setDescription(t.description);
    }
  }

  async function handleGenerate() {
    if (!description.trim()) {
      setError("Describe your agent first.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const result = await generateAgent(
        description,
        selectedTemplate || undefined
      );

      setConfig(result.config);
      setAgentName(result.suggestedName);
      setAgentDescription(result.suggestedDescription);
      setTokenSymbol(result.suggestedSymbol);

      if (publicKey) {
        setTeamMembers([
          {
            wallet: publicKey.toBase58(),
            role: "creator",
            bps: 8000,
            label: "Creator",
          },
          {
            wallet: "AGNTplatform1111111111111111111111111111111",
            role: "platform",
            bps: 2000,
            label: "AgentMint Platform",
          },
        ]);
      }

      // Animated reveal sequence
      setRevealStage(0);
      setStep("review");

      // Staggered reveal
      setTimeout(() => setRevealStage(1), 200); // Name + symbol
      setTimeout(() => setRevealStage(2), 500); // Description
      setTimeout(() => setRevealStage(3), 800); // Tools
      setTimeout(() => setRevealStage(4), 1100); // Personality + greeting
      setTimeout(() => setRevealStage(5), 1400); // Config editor + preview
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate agent config"
      );
    } finally {
      setGenerating(false);
    }
  }

  const handlePreviewStreamEvent = useCallback(
    (event: ChatStreamEvent, messageIndex: number) => {
      switch (event.type) {
        case "text":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                content: msg.content + event.content,
              };
            }
            return updated;
          });
          break;
        case "tool_call":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                activeTools: [...(msg.activeTools || []), event.name],
              };
            }
            return updated;
          });
          break;
        case "tool_result":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                activeTools: (msg.activeTools || []).filter(
                  (t) => t !== event.name
                ),
                toolsUsed: [...(msg.toolsUsed || []), event.name],
              };
            }
            return updated;
          });
          break;
        case "agent_call":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                agentCalls: [
                  ...(msg.agentCalls || []),
                  { agentId: event.agentId, agentName: event.agentName },
                ],
              };
            }
            return updated;
          });
          break;
        case "agent_result":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              const calls = [...(msg.agentCalls || [])];
              const idx = calls.findIndex(
                (c) => c.agentId === event.agentId && !c.response
              );
              if (idx >= 0) {
                calls[idx] = { ...calls[idx], response: event.response };
              }
              updated[messageIndex] = { ...msg, agentCalls: calls };
            }
            return updated;
          });
          break;
        case "done":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                isStreaming: false,
                activeTools: [],
                toolsUsed: event.toolsUsed.length > 0
                  ? event.toolsUsed
                  : msg.toolsUsed,
              };
            }
            return updated;
          });
          setPreviewLoading(false);
          break;
        case "error":
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const msg = updated[messageIndex];
            if (msg) {
              updated[messageIndex] = {
                ...msg,
                content: msg.content || `Error: ${event.message}`,
                isStreaming: false,
              };
            }
            return updated;
          });
          setPreviewLoading(false);
          break;
      }
    },
    []
  );

  async function sendPreviewMessage(text: string) {
    if (!text.trim() || previewLoading || !config) return;

    const userMsg = { role: "user" as const, content: text.trim() };
    const assistantMsg = {
      role: "assistant" as const,
      content: "",
      isStreaming: true,
    };

    setPreviewMessages((prev) => [...prev, userMsg, assistantMsg]);
    setPreviewInput("");
    setPreviewLoading(true);

    const assistantIndex = previewMessages.length + 1;

    try {
      await previewChatStream(config, text.trim(), (event) =>
        handlePreviewStreamEvent(event, assistantIndex)
      );
    } catch (err) {
      setPreviewMessages((prev) => {
        const updated = [...prev];
        const msg = updated[assistantIndex];
        if (msg) {
          updated[assistantIndex] = {
            ...msg,
            content: `Error: ${err instanceof Error ? err.message : "Failed"}`,
            isStreaming: false,
          };
        }
        return updated;
      });
      setPreviewLoading(false);
    }
  }

  async function handleCreate() {
    if (!config || !publicKey) return;
    setCreating(true);
    setError("");
    try {
      const agent = await createAgent({
        name: agentName,
        description: agentDescription,
        config,
        templateId: selectedTemplate || undefined,
        tokenName: agentName,
        tokenSymbol,
        creatorWallet: publicKey.toBase58(),
        teamMembers,
        forkedFrom: forkParent?.agentId,
      });
      router.push(`/launch/${agent.agentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {(["describe", "review", "launch"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s
                  ? "bg-brand-600 text-white"
                  : i < ["describe", "review", "launch"].indexOf(step)
                    ? "bg-brand-600/30 text-brand-300"
                    : "bg-white/10 text-gray-500"
              }`}
            >
              {i < ["describe", "review", "launch"].indexOf(step) ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm capitalize ${
                step === s ? "text-white" : "text-gray-500"
              }`}
            >
              {s}
            </span>
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Describe */}
      {step === "describe" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Describe Your Agent</h2>
            <p className="text-gray-400 text-sm">
              Pick a template or describe what your agent should do. AI
              generates the brain.
            </p>
          </div>

          <TemplatePicker
            templates={templates}
            selected={selectedTemplate}
            onSelect={handleTemplateSelect}
          />

          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Agent Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. A crypto trading analyst that tracks Solana token prices and provides buy/sell signals..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm
                         placeholder:text-gray-500 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {!publicKey && (
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          )}

          {publicKey && (
            <button
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg
                         font-semibold flex items-center justify-center gap-2 transition
                         disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building agent brain...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Agent
                </>
              )}
            </button>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      {/* Step 2: Review (Animated) */}
      {step === "review" && config && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Your Agent is Ready</h2>
              <p className="text-gray-400 text-sm">
                Fine-tune the config, test it live, then launch.
              </p>
            </div>
            <button
              onClick={() => {
                setStep("describe");
                setRevealStage(0);
                setPreviewMessages([]);
              }}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>

          {/* Animated: Name + Symbol */}
          <div
            className={`transition-all duration-500 ${
              revealStage >= 1
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-5">
              <AgentAvatar
                templateId={selectedTemplate}
                name={agentName}
                size="lg"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="text-xl font-bold bg-transparent border-b border-transparent
                               hover:border-white/20 focus:border-brand-500 focus:outline-none pb-0.5"
                  />
                  <input
                    type="text"
                    value={tokenSymbol}
                    onChange={(e) =>
                      setTokenSymbol(e.target.value.toUpperCase().slice(0, 6))
                    }
                    className="text-sm font-mono text-brand-400 bg-brand-500/10 border border-brand-500/30
                               rounded-full px-3 py-0.5 w-24 text-center focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Animated: Description */}
          <div
            className={`transition-all duration-500 ${
              revealStage >= 2
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <textarea
              value={agentDescription}
              onChange={(e) => setAgentDescription(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Animated: Tools */}
          <div
            className={`transition-all duration-500 ${
              revealStage >= 3
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <label className="text-xs text-gray-500 block mb-2">
              Enabled Tools
            </label>
            <div className="flex flex-wrap gap-2">
              {config.enabledTools.map((tool, i) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg text-sm text-brand-300 transition-all duration-300"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Animated: Personality + Greeting */}
          <div
            className={`transition-all duration-500 ${
              revealStage >= 4
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500">Personality:</span>
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs capitalize">
                {config.personality}
              </span>
              <span className="text-xs text-gray-500 ml-2">Temperature:</span>
              <span className="text-xs font-mono">{config.temperature}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <span className="text-xs text-gray-500 block mb-1">
                Greeting
              </span>
              <p className="text-sm text-gray-300">{config.greeting}</p>
            </div>
          </div>

          {/* Animated: Full config editor + Preview Chat */}
          <div
            className={`transition-all duration-500 ${
              revealStage >= 5
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            {/* Preview Chat */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium">Test Your Agent</span>
                <span className="text-xs text-gray-500">
                  — try it before launching
                </span>
              </div>

              <div
                ref={previewScrollRef}
                className="max-h-48 overflow-y-auto space-y-3 mb-3"
              >
                {previewMessages.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {config.examplePrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendPreviewMessage(prompt)}
                        className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full
                                   text-gray-400 hover:border-white/20 hover:text-white transition"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
                {previewMessages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    toolsUsed={msg.toolsUsed}
                    activeTools={msg.activeTools}
                    isStreaming={msg.isStreaming}
                    agentCalls={msg.agentCalls}
                  />
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendPreviewMessage(previewInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder="Test a message..."
                  disabled={previewLoading}
                  className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm
                             placeholder:text-gray-500 focus:outline-none focus:border-brand-500
                             disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={previewLoading || !previewInput.trim()}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-lg
                             transition disabled:opacity-50"
                >
                  {previewLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>

            {/* Collapsible full config editor */}
            <details className="mb-6">
              <summary className="text-sm text-gray-400 hover:text-white cursor-pointer transition mb-3">
                Advanced Configuration
              </summary>
              <AgentConfigForm config={config} onChange={setConfig} />
            </details>

            {/* Team Split */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Fee Split</h3>
              <SplitEditor members={teamMembers} onChange={setTeamMembers} />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !agentName.trim()}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg
                         font-semibold flex items-center justify-center gap-2 transition
                         disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create & Launch <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading agent builder...
        </div>
      }
    >
      <CreateAgentPageContent />
    </Suspense>
  );
}
