import { useState, useRef, useCallback } from "react";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_KEY;
const GOOGLE_CLIENT_ID = "393667644405-gkm4tuq61hkh3sg89pr81kqkjl9dlooj.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents";

const EXPERT_MARKETING = `Tu maîtrises parfaitement que le marketing efficace ne vend JAMAIS des caractéristiques techniques, mais toujours :
- Des TRANSFORMATIONS de vie
- Des RÉSULTATS concrets et mesurables
- Des RÉSOLUTIONS de problèmes douloureux
- Des BÉNÉFICES émotionnels profonds

PRINCIPES FONDAMENTAUX :
1. IDENTIFICATION DE LA DOULEUR : Trouve et exploite la douleur émotionnelle principale
2. TRANSFORMATION PROMISE : Présente la vie APRÈS avoir utilisé le produit
3. URGENCE PSYCHOLOGIQUE : Crée un sentiment d'urgence basé sur la peur de rater
4. PREUVE SOCIALE : Témoignages et résultats pour créer la confiance
5. OBJECTIONS : Anticipe et détruis toutes les objections
6. LANGAGE ÉMOTIONNEL : Mots qui touchent au cœur, pas à la tête

STYLE : Ton direct, conversationnel, phrases courtes, focus sur Tu/Vous, storytelling.
STRUCTURE : Accroche douleur → Agitation → Solution → Preuves → Urgence → CTA`;

const GUIDE_RECHERCHE = `ANALYSE PRODUIT : Description détaillée, bénéfices fonctionnels/émotionnels/sociaux, différenciation, innovations.
MARCHÉ CIBLE : Segmentation démographique (âge, genre, géo, revenus), psychographique (style de vie, valeurs, personnalité), comportement d'achat (motivations, freins, processus décision, budget).
CANAUX : Réseaux sociaux utilisés, sources d'information, influenceurs suivis.
CONCURRENCE : 5 concurrents directs, positionnement, prix, forces/faiblesses, messages clés.
AVIS CLIENTS : Satisfactions récurrentes, insatisfactions, attentes non satisfaites.
MOTS-CLÉS SEO : Génériques, longue traîne, intention d'achat, problèmes résolus.
PRIX : Gamme du marché, stratégie, prix psychologiques.
SYNTHÈSE : Proposition de valeur unique, 3 avantages concurrentiels, 5 objections principales, persona client principal.`;

const MODELE_AVATAR = `Remplis cette fiche avatar complète :
- Données démographiques : tranche d'âge, genre, localisation, revenu, parcours pro, style de vie
- Problèmes majeurs (3 problèmes × 3 défis chacun)
- Objectifs court terme (3) et aspirations long terme (3)
- Moteurs émotionnels et insights psychologiques (3)
- Citations types clients (3 sur satisfactions, 3 sur douleurs, 3 sur mindset, 3 sur émotions, 3 sur motivations/urgence)
- Peurs profondes et frustrations (3)
- Insights psychographiques (3)
- Parcours émotionnel : prise de conscience → frustration → désespoir/recherche → soulagement/engagement`;

const GUIDE_OFFRE = `Rédige le guide d'offre complet :
- Niveau de conscience du problème (faible/fort)
- Niveau de connaissance de la solution
- Niveau de sophistication du marché
- Big Idea : concept fort accrocheur
- Métaphore simple et percutante
- Mécanisme unique du PROBLÈME (pourquoi le client échoue aujourd'hui)
- Mécanisme unique de la SOLUTION (ce qui la rend unique)
- Figure d'autorité / guru associé
- Histoire de la découverte du produit
- Idées de titres/sous-titres percutants (5 minimum)
- Liste exhaustive des objections possibles
- Chaînes de croyances nécessaires à l'achat
- Architecture recommandée du tunnel de vente`;

const STEPS = [
  {
    id: "recherche", label: "Recherche Produit", icon: "🔍", color: "#6366f1",
    prompt: (p) => `Tu es expert marketing et copywriter de haut niveau.\nProfil expert : ${EXPERT_MARKETING}\nGuide recherche : ${GUIDE_RECHERCHE}\n\nConduis une recherche approfondie complète pour ce produit : ${p}\n\nSois exhaustif, structure bien avec des sections claires, ne te limite pas sur la taille.`
  },
  {
    id: "avatar", label: "Avatar Client", icon: "👤", color: "#8b5cf6",
    prompt: (p, prev) => `Recherche effectuée :\n${prev}\n\nSur cette base, remplis ce modèle avatar :\n${MODELE_AVATAR}\n\nProduit : ${p}\nProfil expert : ${EXPERT_MARKETING}`
  },
  {
    id: "offre", label: "Rédaction Offre", icon: "💡", color: "#a855f7",
    prompt: (p, prev) => `Avatar client :\n${prev}\n\nRemplis ce guide d'offre :\n${GUIDE_OFFRE}\n\nProduit : ${p}\nProfil expert : ${EXPERT_MARKETING}`
  },
  {
    id: "croyances", label: "Croyances Clés", icon: "🧠", color: "#c026d3",
    prompt: (p, prev) => `Profil expert : ${EXPERT_MARKETING}\n\nProduit : ${p}\n\nRédige les 6 croyances INDISPENSABLES sous forme "Je crois que…". Pour chaque : pourquoi essentielle, comment la créer, arguments et preuves.\n\nContexte : ${prev.substring(0, 500)}...`
  },
  {
    id: "design", label: "Direction Design", icon: "🎨", color: "#db2777",
    prompt: (p, prev) => `Expert design e-commerce haute conversion. Produit : ${p}\n\nCrée direction créative complète :\n## IDENTITÉ VISUELLE\n- Palette couleurs (codes hex)\n- Typographie\n- Style général et ambiance\n## LANDING PAGE\n- Structure section par section\n- Objectif psychologique\n## PAGE PRODUIT SHOPIFY\n- Structure et éléments clés\n## 3 PROMPTS VISUELS DÉTAILLÉS\n1. Photo studio fond blanc\n2. Photo lifestyle\n3. Hero image landing page\n\nContexte : ${prev.substring(0, 600)}...`
  }
];

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 4000, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function generateImage(prompt, imageBase64) {
  const content = [];
  if (imageBase64) content.push({ inlineData: { mimeType: "image/jpeg", data: imageBase64 } });
  content.push({ text: prompt });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: content }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData);
  return imgPart ? `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` : null;
}

async function createDriveFolder(token, name) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" })
  });
  return (await res.json()).id;
}

async function createGoogleDoc(token, folderId, title, content) {
  const docRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: title, mimeType: "application/vnd.google-apps.document", parents: [folderId] })
  });
  const doc = await docRes.json();
  await fetch(`https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] })
  });
  return `https://docs.google.com/document/d/${doc.id}/edit`;
}

export default function App() {
  const [product, setProduct] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [productImageBase64, setProductImageBase64] = useState(null);
  const [phase, setPhase] = useState("setup");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState({});
  const [stepDocs, setStepDocs] = useState({});
  const [stepStatus, setStepStatus] = useState({});
  const [folderUrl, setFolderUrl] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const fileRef = useRef();

  const authenticate = useCallback(() => new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=consent`;
    const popup = window.open(authUrl, "google_auth", "width=500,height=600,scrollbars=yes");
    if (!popup) { reject(new Error("Popup bloquée")); return; }
    const interval = setInterval(() => {
      try {
        if (popup.closed) { clearInterval(interval); reject(new Error("Fermé")); return; }
        const url = popup.location.href;
        if (url.includes("access_token=")) {
          const match = url.match(/access_token=([^&]+)/);
          if (match) { clearInterval(interval); popup.close(); resolve(match[1]); }
        }
      } catch (e) { }
    }, 500);
    setTimeout(() => { clearInterval(interval); if (!popup.closed) popup.close(); reject(new Error("Timeout")); }, 120000);
  }), []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProductImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (ev) => setProductImageBase64(ev.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const handleStart = async () => {
    if (!product.trim()) return;
    setPhase("pipeline");
    let tok = authToken;
    if (!tok) {
      try { tok = await authenticate(); setAuthToken(tok); } catch (e) { }
    }
    let fId = null;
    if (tok) {
      try {
        fId = await createDriveFolder(tok, `🛍️ ${product.substring(0, 40)} — ${new Date().toLocaleDateString("fr-FR")}`);
        setFolderUrl(`https://drive.google.com/drive/folders/${fId}`);
      } catch (e) { }
    }
    let prevResult = "";
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      setCurrentStep(i);
      setStepStatus(s => ({ ...s, [step.id]: "running" }));
      try {
        const result = await callClaude(step.prompt(product, prevResult));
        setStepResults(r => ({ ...r, [step.id]: result }));
        prevResult = result;
        if (tok && fId) {
          try {
            const url = await createGoogleDoc(tok, fId, `${step.icon} ${step.label} — ${product.substring(0, 30)}`, result);
            setStepDocs(d => ({ ...d, [step.id]: url }));
          } catch (e) { }
        }
        setStepStatus(s => ({ ...s, [step.id]: "done" }));
      } catch (e) {
        setStepStatus(s => ({ ...s, [step.id]: "error" }));
      }
    }
    if (productImageBase64) {
      setPhase("images");
      setIsGeneratingImages(true);
      const imgPrompts = [
        { label: "📸 Studio", prompt: "Professional product photo, pure white background, perfect studio lighting, commercial quality, ultra sharp focus, subtle drop shadow only." },
        { label: "🌿 Lifestyle", prompt: "Authentic lifestyle photo of this product in real use context, natural light, aspirational setting, genuine and desirable atmosphere, editorial quality." },
        { label: "🎯 Hero Landing", prompt: "Cinematic hero banner image for landing page, bold dramatic composition, product as the hero, premium dramatic lighting, wide format 16:9 for website header." }
      ];
      const imgs = [];
      for (const p of imgPrompts) {
        try {
          const src = await generateImage(p.prompt, productImageBase64);
          if (src) { imgs.push({ label: p.label, src }); setGeneratedImages([...imgs]); }
        } catch (e) { }
      }
      setIsGeneratingImages(false);
    }
    setPhase("done");
  };

  const reset = () => {
    setPhase("setup"); setProduct(""); setProductImage(null); setProductImageBase64(null);
    setStepResults({}); setStepDocs({}); setStepStatus({}); setGeneratedImages([]);
    setFolderUrl(null); setCurrentStep(0);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 50%,#0a1628 100%)", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#6366f1;border-radius:3px}
        .pulse{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .shimmer{background:linear-gradient(90deg,#1e1e3a 25%,#2a2a4a 50%,#1e1e3a 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .slide-in{animation:slideIn .4s ease}@keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .btn{transition:all .2s}.btn:hover{transform:translateY(-2px);filter:brightness(1.1)}
        textarea{resize:vertical}
      `}</style>

      <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>🚀</div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#fff" }}>Agent Dropshipping IA</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Copywriting · Avatar · Offre · Design · Visuels</div>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 18px" }}>

        {phase === "setup" && (
          <div className="slide-in" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 32 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>Nouveau produit</h2>
            <p style={{ color: "#94a3b8", margin: "0 0 24px", fontSize: 13 }}>Décris ton produit → je génère toute la stratégie marketing + visuels automatiquement.</p>

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Produit *</label>
            <textarea value={product} onChange={e => setProduct(e.target.value)} placeholder="Ex: Extension de cils magnétiques réutilisables — posent en 30 sec sans colle, tiennent 24h, pour femmes actives 25-40 ans..." rows={4} style={{ width: "100%", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif", marginBottom: 18 }} />

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Photo produit (visuels IA)</label>
            {!productImage ? (
              <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed rgba(99,102,241,.35)", borderRadius: 10, padding: "22px", textAlign: "center", cursor: "pointer", background: "rgba(99,102,241,.04)", marginBottom: 20 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                <div style={{ color: "#6366f1", fontWeight: 600, fontSize: 13 }}>Uploader la photo</div>
                <div style={{ color: "#475569", fontSize: 11 }}>JPG, PNG</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <img src={productImage} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} />
                <div>
                  <div style={{ color: "#4ade80", fontWeight: 600, fontSize: 13 }}>✓ Photo uploadée</div>
                  <button onClick={() => { setProductImage(null); setProductImageBase64(null); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, padding: 0 }}>Supprimer</button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Pipeline automatique</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STEPS.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.03)", border: `1px solid ${s.color}35`, borderRadius: 8, padding: "6px 11px", fontSize: 11 }}>
                    <span>{s.icon}</span><span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                  </div>
                ))}
                {productImage && <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 8, padding: "6px 11px", fontSize: 11 }}><span>🖼️</span><span style={{ color: "#10b981", fontWeight: 600 }}>Visuels IA</span></div>}
              </div>
            </div>

            <button className="btn" onClick={handleStart} disabled={!product.trim()} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", padding: "12px 26px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: product.trim() ? "pointer" : "not-allowed", opacity: product.trim() ? 1 : 0.4, fontFamily: "'DM Sans',sans-serif" }}>
              🚀 Lancer le pipeline
            </button>
          </div>
        )}

        {(phase === "pipeline" || phase === "images" || phase === "done") && (
          <div>
            <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 12, padding: "16px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
              {productImage && <img src={productImage} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{product.substring(0, 65)}{product.length > 65 ? "..." : ""}</div>
                {folderUrl ? <a href={folderUrl} target="_blank" rel="noreferrer" style={{ color: "#6366f1", fontSize: 11, textDecoration: "none" }}>📁 Google Drive →</a> : <div style={{ fontSize: 11, color: "#475569" }}>Pipeline en cours...</div>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STEPS.map((step, i) => {
                const status = stepStatus[step.id];
                const result = stepResults[step.id];
                const docUrl = stepDocs[step.id];
                const isActive = phase === "pipeline" && currentStep === i;
                const isDone = status === "done";
                const isError = status === "error";
                const isPending = !status && currentStep < i;
                return (
                  <div key={step.id} style={{ background: isDone ? "rgba(255,255,255,.04)" : isActive ? `${step.color}10` : "rgba(255,255,255,.02)", border: `1px solid ${isDone ? step.color + "35" : isActive ? step.color + "55" : isError ? "#ef444430" : "rgba(255,255,255,.05)"}`, borderRadius: 12, padding: 20, opacity: isPending ? 0.45 : 1, transition: "all .3s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: result ? 12 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${step.color}18`, border: `1px solid ${step.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                          {isActive ? <span className="pulse">⚡</span> : isError ? "❌" : step.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: isDone ? "#fff" : isActive ? step.color : isError ? "#ef4444" : "#64748b" }}>{step.label}</div>
                          {isActive && <div style={{ fontSize: 10, color: step.color }} className="pulse">Génération en cours...</div>}
                          {isDone && <div style={{ fontSize: 10, color: "#4ade80" }}>✓ Terminé</div>}
                          {isError && <div style={{ fontSize: 10, color: "#ef4444" }}>Erreur</div>}
                        </div>
                      </div>
                      {docUrl && <a href={docUrl} target="_blank" rel="noreferrer" style={{ background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", padding: "4px 10px", borderRadius: 6, fontSize: 10, textDecoration: "none", fontWeight: 600 }}>📄 Google Doc</a>}
                    </div>
                    {isActive && <div style={{ borderRadius: 5, overflow: "hidden", height: 5, marginTop: 8 }}><div className="shimmer" style={{ height: "100%", borderRadius: 5 }} /></div>}
                    {result && <div style={{ background: "rgba(0,0,0,.25)", borderRadius: 8, padding: 12, maxHeight: 160, overflowY: "auto", fontSize: 11, lineHeight: 1.7, color: "#94a3b8", whiteSpace: "pre-wrap", marginTop: 4 }}>{result.substring(0, 600)}{result.length > 600 ? "\n\n[...]" : ""}</div>}
                  </div>
                );
              })}

              {(phase === "images" || phase === "done") && productImageBase64 && (
                <div style={{ background: "rgba(16,185,129,.04)", border: "1px solid rgba(16,185,129,.18)", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(16,185,129,.18)", border: "1px solid rgba(16,185,129,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🖼️</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Génération Visuels</div>
                      {isGeneratingImages && <div style={{ fontSize: 10, color: "#10b981" }} className="pulse">Gemini génère les visuels...</div>}
                      {!isGeneratingImages && <div style={{ fontSize: 10, color: "#4ade80" }}>✓ {generatedImages.length} visuels générés</div>}
                    </div>
                  </div>
                  {isGeneratingImages && <div style={{ borderRadius: 5, overflow: "hidden", height: 5, marginBottom: 12 }}><div className="shimmer" style={{ height: "100%", borderRadius: 5 }} /></div>}
                  {generatedImages.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                      {generatedImages.map((img, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,.3)", borderRadius: 10, overflow: "hidden" }}>
                          <img src={img.src} alt={img.label} style={{ width: "100%", display: "block" }} />
                          <div style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#10b981" }}>{img.label}</div>
                          <div style={{ padding: "0 12px 12px" }}>
                            <a href={img.src} download={`visuel_${i + 1}.png`} style={{ display: "inline-block", background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.25)", color: "#4ade80", padding: "4px 10px", borderRadius: 6, fontSize: 10, textDecoration: "none", fontWeight: 600 }}>⬇ Télécharger</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {phase === "done" && (
              <div className="slide-in" style={{ marginTop: 18, background: "linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.12))", border: "1px solid rgba(99,102,241,.25)", borderRadius: 12, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>🎉</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Pipeline terminé !</div>
                <div style={{ color: "#64748b", marginBottom: 16, fontSize: 13 }}>Tous les documents générés{folderUrl ? " et sauvegardés dans Drive" : ""}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  {folderUrl && <a href={folderUrl} target="_blank" rel="noreferrer" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", padding: "10px 20px", borderRadius: 9, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>📁 Ouvrir Drive</a>}
                  <button className="btn" onClick={reset} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "#e2e8f0", padding: "10px 20px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>✨ Nouveau produit</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
