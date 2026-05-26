import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RetroWindow } from "./RetroWindow";
import { PixelProgressBar } from "./PixelProgressBar";
import type { ResearchResponse } from "@/lib/types";

function sanitizeEquation(eq: string) {
  if (!eq) return "";
  let s = eq;
  s = s.replace(/\x0Crac/g, "\\frac");
  s = s.replace(/\f/g, "\\f");
  s = s.replace(/\n/g, "");
  s = s.replace(/\r/g, "");
  s = s.replace(/\$\$/g, "");
  return s.trim();
}

function safeLatexText(t: string | undefined | null) {
  if (t === undefined || t === null || t === "") return "No data available.";
  return t.replace(/([_%&#$])/g, "\\$1");
}

function sanitizeFileName(name: string | undefined | null) {
  if (!name) return "export";
  return name.replace(/ /g, "_").replace(/[\\/:*?"<>|]/g, "");
}

function MathBlock({ math }: { math: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sanitized = sanitizeEquation(math);
  const [error, setError] = useState(false);

  useEffect(() => {
    let attempt = 0;
    const renderMath = () => {
      if (containerRef.current && (window as any).katex) {
        try {
          (window as any).katex.render(sanitized, containerRef.current, {
            displayMode: true,
            throwOnError: true
          });
        } catch (e) {
          setError(true);
        }
      } else if (attempt < 15) {
        attempt++;
        setTimeout(renderMath, 150);
      } else {
        setError(true);
      }
    };
    renderMath();
  }, [sanitized]);

  if (error) {
    return (
      <div className="my-4 overflow-x-auto bg-black/5 p-4 text-center font-mono text-[12px] text-mouse-gray">
        {sanitized}
      </div>
    );
  }

  return <div ref={containerRef} className="my-4 overflow-x-auto text-center text-[16px]"></div>;
}

export function PDFExportModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: ResearchResponse | null;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "latex" | "docx">("pdf");

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setDone(false);
      return;
    }

    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("katex-js")) {
      const script = document.createElement("script");
      script.id = "katex-js";
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.async = true;
      document.head.appendChild(script);
    }

    let p = 0;
    const id = setInterval(() => {
      p += 8;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(id);
        setDone(true);
      }
    }, 120);

    return () => clearInterval(id);
  }, [open]);

  const generateLatexStr = () => {
    if (!data) return "";
    
    const ts = data.session?.timestamp ? new Date(data.session.timestamp).toLocaleString() : "Unknown Date";

    return `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{physics}
\\title{${safeLatexText(data.session?.topic)}}
\\author{THE RESEARCHER --- AI Council}
\\date{${safeLatexText(ts)}}
\\begin{document}
\\maketitle
\\section{Executive Summary}
${safeLatexText(data.dashboard?.executive_summary?.text)}

\\section{Core Mechanisms}
${safeLatexText(data.dashboard?.core_mechanisms?.text)}

${data.dashboard?.core_mechanisms?.equations?.map((eq: string) => `\\begin{equation}\n${sanitizeEquation(eq)}\n\\end{equation}`).join('\n\n') || ""}

\\section{Key Claims}
\\begin{itemize}
${data.dashboard?.key_claims?.map((c: any) => `\\item ${safeLatexText(c.claim)} (Confidence: ${c.confidence}\\%)`).join('\n') || "\\item No data available."}
\\end{itemize}

\\section{Research Gaps}
\\begin{enumerate}
${data.dashboard?.research_gaps?.map((g: any) => `\\item ${safeLatexText(g.gap)}`).join('\n') || "\\item No data available."}
\\end{enumerate}
\\end{document}`;
  };

  const downloadLatex = () => {
    if (!data) return;
    const blob = new Blob([generateLatexStr()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFileName(data.session?.topic)}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWord = () => {
    if (!data) return;
    // TODO: Integrate docx library for real .docx generation
    const ts = data.session?.timestamp ? new Date(data.session.timestamp).toLocaleString() : "Unknown Date";
    
    const textContent = `TITLE: ${data.session?.topic || "Untitled"}\nAUTHOR: THE RESEARCHER — AI Council\nDATE: ${ts}\n\n=== EXECUTIVE SUMMARY ===\n${data.dashboard?.executive_summary?.text || "No data available."}\n\n=== CORE MECHANISMS ===\n${data.dashboard?.core_mechanisms?.text || "No data available."}\n\n${(data.dashboard?.core_mechanisms?.equations || []).map((eq: string) => sanitizeEquation(eq)).join('\n\n')}\n\n=== KEY CLAIMS ===\n${(data.dashboard?.key_claims || []).map((c: any) => `- ${c.claim} (Confidence: ${c.confidence}%)`).join('\n') || "No data available."}\n\n=== RESEARCH GAPS ===\n${(data.dashboard?.research_gaps || []).map((g: any, i: number) => `${i + 1}. ${g.gap}`).join('\n') || "No data available."}`;

    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFileName(data.session?.topic)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDataIncomplete = !data || !data.dashboard;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 20 }}
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <RetroWindow title="EXPORT_SUITE.exe" onClose={onClose} variant="accent">
              <div className="mb-4 flex gap-4 border-b border-pixel-border/40 px-2 pb-2">
                {(["pdf", "latex", "docx"] as const).map((f) => {
                  const label = f === "pdf" ? "◼ PDF" : f === "latex" ? "∑ LaTeX" : "W WORD (.docx)";
                  return (
                    <button
                      key={f}
                      onClick={() => setExportFormat(f)}
                      className={`-mb-[9px] border-b-2 pb-2 pt-2 font-pixel text-[8px] transition-all duration-150 ${
                        exportFormat === f
                          ? "border-electric-accent text-electric-accent opacity-100"
                          : "border-transparent text-mouse-gray/70 hover:text-cream-terminal opacity-80"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {isDataIncomplete ? (
                <div className="border border-pixel-border bg-black/30 p-6 text-center">
                  <p className="font-mono text-[11px] text-sakura-alert">Research data incomplete.</p>
                </div>
              ) : (
                <>
                  {exportFormat === "pdf" && (
                    <div className="max-h-[68vh] overflow-y-auto bg-mono-white p-8 text-research-navy font-serif leading-relaxed">
                      <p className="font-pixel text-[10px] tracking-wider text-electric-accent font-sans">◆ THE RESEARCHER</p>
                      <h1 className="mt-4 text-3xl font-bold">{data.session.topic}</h1>
                      <p className="mt-2 font-mono text-[11px] text-mouse-gray">
                        L{data.session.level} · {data.session.level_name} · {new Date(data.session.timestamp).toLocaleString()}
                      </p>
                      <hr className="my-6 border-research-navy/20" />
                      <Section title="EXECUTIVE SUMMARY" body={data.dashboard.executive_summary.text} />

                      <section className="mt-6 page-break-inside-avoid">
                        <h2 className="font-pixel text-[10px] text-electric-accent font-sans tracking-widest">CORE MECHANISMS</h2>
                        <p className="mt-3 whitespace-pre-line text-[14px]">
                          {data.dashboard.core_mechanisms.text}
                        </p>
                        {(data.dashboard.core_mechanisms.equations || []).length > 0 && (
                          <div className="mt-5 space-y-5">
                            {data.dashboard.core_mechanisms.equations.map((eq: string, i: number) => (
                              <MathBlock key={i} math={eq} />
                            ))}
                          </div>
                        )}
                      </section>

                      <Section
                        title="KEY CLAIMS"
                        body={(data.dashboard.key_claims || []).map((c: any) => `• ${c.claim} [${c.confidence}%]`).join("\n\n")}
                      />
                      <Section
                        title="EPISTEMIC DECAY"
                        body={[
                          ...(data.dashboard.epistemic_decay?.stale || []).map(
                            (s: any) => `Stale: ${s.claim} — superseded by ${s.superseded_by}`
                          ),
                          ...(data.dashboard.epistemic_decay?.fresh || []).map((f: any) => `Fresh: ${f.claim}`),
                        ].join("\n\n")}
                      />
                      <Section
                        title="CROSS DOMAIN LINK"
                        body={data.dashboard.cross_domain_analogy ? `${data.dashboard.cross_domain_analogy.domain_a} ↔ ${data.dashboard.cross_domain_analogy.domain_b}\n\n${data.dashboard.cross_domain_analogy.structural_isomorphism}\n\nTransferable technique: ${data.dashboard.cross_domain_analogy.transferable_technique}` : "No data available."}
                      />
                      <Section
                        title="RESEARCH GAPS"
                        body={(data.dashboard.research_gaps || []).map((g: any) => `${g.type}: ${g.gap}`).join("\n\n")}
                      />
                      {data.dashboard.novel_hypothesis && (
                        <Section title="NOVEL HYPOTHESIS" body={data.dashboard.novel_hypothesis} />
                      )}
                      {data.council_consensus && (
                        <Section
                          title="COUNCIL CONSENSUS"
                          body={`Advocate score: ${data.council_consensus.advocate_score}\nEmpirical strength: ${data.council_consensus.empirical_strength}\nFinal confidence: ${data.council_consensus.final_confidence}\n\nCaveat: ${data.council_consensus.key_caveat}`}
                        />
                      )}
                    </div>
                  )}

                  {exportFormat === "latex" && (
                    <div className="max-h-[300px] overflow-auto bg-black/90 border border-pixel-border p-4 font-mono text-[11px] text-lime-signal rounded-none leading-relaxed">
                      <pre className="whitespace-pre-wrap">{generateLatexStr()}</pre>
                    </div>
                  )}

                  {exportFormat === "docx" && (
                    <div className="border border-pixel-border bg-black/30 p-6 text-center">
                      <div className="font-pixel text-[24px] text-mouse-gray/40">W</div>
                      <h3 className="mt-2 font-pixel text-[10px] text-mouse-gray">WORD EXPORT</h3>
                      <p className="mt-2 font-mono text-[11px] text-mouse-gray/60 leading-relaxed">
                        Generates a structured .docx with all research sections, formatted for academic submission.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-4 space-y-3">
                <PixelProgressBar
                  value={progress}
                  label={done ? "READY ✓" : `PREPARING ${exportFormat.toUpperCase()}...`}
                  color={done ? "lime" : "electric"}
                  animated={false}
                />
                <div className="flex gap-2">
                  {exportFormat === "pdf" && (
                    <button
                      disabled={!done || isDataIncomplete}
                      onClick={() => {
                        const old = document.title;
                        document.title = sanitizeFileName(data?.session?.topic);
                        window.print();
                        document.title = old;
                      }}
                      className="flex-1 border border-pixel-border bg-black py-2.5 font-pixel text-[9px] text-mono-white transition-colors hover:border-mouse-gray disabled:opacity-50"
                    >
                      ▶ DOWNLOAD PDF
                    </button>
                  )}
                  {exportFormat === "latex" && (
                    <button
                      disabled={!done || isDataIncomplete}
                      onClick={downloadLatex}
                      className="flex-1 border border-pixel-border bg-black py-2.5 font-pixel text-[9px] text-mono-white transition-colors hover:border-mouse-gray disabled:opacity-50"
                    >
                      ▶ DOWNLOAD .tex FILE
                    </button>
                  )}
                  {exportFormat === "docx" && (
                    <button
                      disabled={!done || isDataIncomplete}
                      onClick={downloadWord}
                      className="flex-1 border border-pixel-border bg-black py-2.5 font-pixel text-[9px] text-mono-white transition-colors hover:border-mouse-gray disabled:opacity-50"
                    >
                      ▶ DOWNLOAD .docx
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="border border-pixel-border bg-black px-4 py-2.5 font-pixel text-[9px] text-mouse-gray transition-colors hover:border-mouse-gray hover:text-mono-white"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </RetroWindow>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <section className="mt-6 page-break-inside-avoid">
      <h2 className="font-pixel text-[10px] text-electric-accent font-sans tracking-widest">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-[14px]">
        {body}
      </p>
    </section>
  );
}
