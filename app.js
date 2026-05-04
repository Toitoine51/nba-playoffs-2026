const { useState, useEffect, useMemo } = React;

/* ======================
   STORAGE (SAFE)
====================== */

function loadResults() {
    return JSON.parse(localStorage.getItem("nba_results") || "{}");
}

function saveResults(data) {
    localStorage.setItem("nba_results", JSON.stringify(data));
}

function loadMatches() {
    return JSON.parse(localStorage.getItem("nba_matches") || "{}");
}

function saveMatches(data) {
    const existing = loadMatches();
    const merged = { ...existing, ...data };
    localStorage.setItem("nba_matches", JSON.stringify(merged));
}

/* ======================
   APP
====================== */

function App() {

    const [tab, setTab] = useState("series");
    const [pronos, setPronos] = useState([]);
    const [results, setResults] = useState({});
    const [rawMatches, setRawMatches] = useState({});
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [series, setSeries] = useState([]);
    const [mapping, setMapping] = useState({});
    const [article, setArticle] = useState("");
    const [articleLoading, setArticleLoading] = useState(false);
    const [articleError, setArticleError] = useState("");

    useEffect(() => {
        fetch("./pronos.json?v=1")
            .then(r => r.json())
            .then(data => setPronos(data))
            .catch(err => {
                console.error("PRONOS ERROR", err);
                setPronos([]);
            });

        fetch("./series.json")
            .then(r => r.json())
            .then(data => setSeries(data))
            .catch(err => console.error("SERIES ERROR", err));

        fetch("./mapping.json")
            .then(r => r.json())
            .then(data => setMapping(data))
            .catch(err => console.error("MAPPING ERROR", err));

        fetchResults();
    }, []);

    useEffect(() => {
        saveResults(results);
    }, [results]);


      useEffect(() => {
       if (pronos.length > 0 && series.length > 0 && Object.keys(mapping).length > 0 && Object.keys(rawMatches).length > 0 && Object.keys(totals).length > 0) {
           fetchArticle();
       }
   }, [pronos, series, mapping, rawMatches, totals]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            await fetch("https://syncnba.toitoine51.workers.dev/");
            const res = await fetch("https://syncnba.toitoine51.workers.dev/state");
            const json = await res.json();
            const newMatches = {};
            (json.events || []).forEach(ev => {
                newMatches[ev.match_id] = ev;
            });
            setRawMatches(newMatches);
            setLastUpdate(new Date().toLocaleString("fr-FR"));
            saveMatches(newMatches);
        } catch (e) {
            console.error("FETCH ERROR", e);
        }
        setLoading(false);
    };

    const coeffTour = (matchId) => {
        if (matchId.startsWith("R1")) return 1;
        if (matchId.startsWith("R2")) return 1.5;
        if (matchId.startsWith("R3")) return 2;
        if (matchId.startsWith("R4")) return 3;
        return 1;
    };

    const calculatePoints = (prono, serieScore) => {
        if (!serieScore) return 0;
        if (!serieScore.termine) return 0;
        const coeff = coeffTour(prono.match_id);
        let pts = 0;
        if (prono.gagnant === serieScore.gagnant) {
            pts += 15;
            if (prono.perdant === serieScore.perdant) {
                pts += 5;
            }
            if (prono.score === serieScore.score) {
                pts += 15;
            }
        }
        return pts * coeff;
    };

    const calcSerie = (serie) => {
        const normalize = (abbr) => mapping[abbr] || abbr;

        const matchs = Object.values(rawMatches).filter(m => {
            const a = normalize(m.team_a);
            const b = normalize(m.team_b);
            return (
                m.status === "Final" &&
                ((a === serie.team_a && b === serie.team_b) ||
                 (a === serie.team_b && b === serie.team_a))
            );
        });

        let winsA = 0;
        let winsB = 0;

        matchs.forEach(m => {
            const [scoreA, scoreB] = m.score.split("-").map(Number);
            const a = normalize(m.team_a);
            if (scoreA > scoreB) {
                if (a === serie.team_a) winsA++;
                else winsB++;
            } else {
                if (a === serie.team_a) winsB++;
                else winsA++;
            }
        });

        const termine = winsA === 4 || winsB === 4;
        const gagnant = winsA === 4 ? serie.team_a : winsB === 4 ? serie.team_b : null;
        const perdant = winsA === 4 ? serie.team_b : winsB === 4 ? serie.team_a : null;
        const score = termine ? `${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}` : null;

        return { winsA, winsB, termine, gagnant, perdant, score };
    };

const buildPrompt = (dateMax = null) => {
    const filteredMatches = dateMax
        ? Object.fromEntries(Object.entries(rawMatches).filter(([k, m]) => m.date <= dateMax))
        : rawMatches;

    const calcSerieFiltered = (serie) => {
        const normalize = (abbr) => mapping[abbr] || abbr;
        const matchs = Object.values(filteredMatches).filter(m => {
            const a = normalize(m.team_a);
            const b = normalize(m.team_b);
            return (
                m.status === "Final" &&
                ((a === serie.team_a && b === serie.team_b) ||
                 (a === serie.team_b && b === serie.team_a))
            );
        });
        let winsA = 0, winsB = 0;
        matchs.forEach(m => {
            const [scoreA, scoreB] = m.score.split("-").map(Number);
            const a = normalize(m.team_a);
            if (scoreA > scoreB) { if (a === serie.team_a) winsA++; else winsB++; }
            else { if (a === serie.team_a) winsB++; else winsA++; }
        });
        const termine = winsA === 4 || winsB === 4;
        const gagnant = winsA === 4 ? serie.team_a : winsB === 4 ? serie.team_b : null;
        const perdant = winsA === 4 ? serie.team_b : winsB === 4 ? serie.team_a : null;
        const score = termine ? `${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)}` : null;
        return { winsA, winsB, termine, gagnant, perdant, score };
    };

    const lignes = series.map(s => {
        const sc = calcSerieFiltered(s);
            const statut = sc.termine
                ? `TERMINÉE : ${sc.gagnant} bat ${sc.perdant} ${sc.score}`
                : `En cours : ${s.team_a} ${sc.winsA}-${sc.winsB} ${s.team_b}`;
            return `- ${s.id} (${s.conf}) : ${statut}`;
        }).join("\n");

        const pronosDetails = series.map(s => {
          const sc = calcSerieFiltered(s);
          const ligneJoueurs = joueurs.map(j => {
              const prono = pronos.find(p => p.joueur === j && p.match_id === s.id);
              if (!prono) return `  ${j}: pas de prono`;
              let resultat = "";
              if (sc.termine) {
                  const bonGagnant = prono.gagnant === sc.gagnant;
                  const bonPerdant = bonGagnant && prono.perdant === sc.perdant;
                  const bonScore = bonGagnant && prono.score === sc.score;
                  resultat = ` → ${bonGagnant ? "✓ gagnant" : "✗ gagnant"} ${bonPerdant ? "✓ perdant" : "✗ perdant"} ${bonScore ? "✓ score" : "✗ score"}`;
              }
              return `  ${j}: ${prono.gagnant} bat ${prono.perdant} ${prono.score}${resultat}`;
          }).join("\n");
          return `${s.id} (${s.conf}) :\n${ligneJoueurs}`;
      }).join("\n\n");

        const matchsDetails = series.map(s => {
          const normalize = (abbr) => mapping[abbr] || abbr;
          const matchs = Object.values(rawMatches).filter(m => {
              const a = normalize(m.team_a);
              const b = normalize(m.team_b);
              return (
                  m.status === "Final" &&
                  ((a === s.team_a && b === s.team_b) ||
                   (a === s.team_b && b === s.team_a))
              );
          }).sort((a, b) => new Date(a.date) - new Date(b.date));
      
          if (matchs.length === 0) return `${s.id} : pas de match joué`;
          const lignes = matchs.map((m, i) => `  Match ${i+1} : ${m.team_a} ${m.score} ${m.team_b}`).join("\n");
          return `${s.id} :\n${lignes}`;
      }).join("\n\n");

        const classement = joueursTries.map((j, i) => `${i+1}. ${j} : ${totals[j]} pts`).join("\n");

return `Nous sommes le ${new Date().toLocaleDateString("fr-FR")}.

Tu dois écrire une analyse d'un concours de pronostics NBA Playoffs 2026 entre 5 amis.

Structure de l'analyse :
- Un paragraphe par série, en commençant par le tour 1. Fait bien un paragraphe par serie
- Pour chaque série : parle des matchs joués, de l'état de la série, et des pronos des participants (bons coups, erreurs, surprises)
- Il faut que tu analyses aussi les pronos des joueurs pour voir qui est impacté par une élimination précoce d'une équipe qui a été pronostiquée pour aller loin par des participants.
- Quand le tour 1 est terminé, passe au tour 2 avec juste un bref récap du tour 1
- Conclus sur les tendances du classement : qui est bien parti, qui se rate

Ton : amusant, décalé, comme entre amis. Pas de titre, pas de sous-titres. Texte continu.

RÉSULTATS DES SÉRIES :
${lignes}

MATCHS JOUÉS :
${matchsDetails}

PRONOS DÉTAILLÉS :
${pronosDetails}

CLASSEMENT :
${classement}`;   
   };

   const fetchArticle = async (dateParam = null) => {
       const today = new Date().toISOString().slice(0, 10);
       const targetDate = dateParam || today;
       console.log("fetchArticle called, hour:", new Date().getHours());
       try {
           // 1. Vérifier si article du jour existe dans KV
           const res = await fetch("https://syncnba.toitoine51.workers.dev/article");
           const json = await res.json();
   
           const hour = new Date().getHours();
           
   
           if (json.text && json.date === targetDate) {
               // Article du jour existe
               setArticle(json.text);
           } else if (json.text && json.date !== targetDate && hour < 9) {
               // Avant 9h → afficher article de la veille
               setArticle(json.text);
           } else if (hour >= 9) {
               // Après 9h → générer
               const mistralRes = await fetch("https://gemini.toitoine51.workers.dev/", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ prompt: buildPrompt(targetDate) }) 
               });
               const mistralJson = await mistralRes.json();
               if (mistralJson.ok) {
                   // Stocker dans KV
                   await fetch("https://syncnba.toitoine51.workers.dev/article", {
                       method: "POST",
                       headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ text: mistralJson.text, date: targetDate })
                   });
                   setArticle(mistralJson.text);
               } else {
                   setArticleError("Erreur Mistral : " + mistralJson.error);
               }
           } else {
               setArticleError("Pas d'article disponible avant 9h.");
           }
       } catch (e) {
           setArticleError("Erreur réseau : " + e.message);
       }
       setArticleLoading(false);
   };

    const joueurs = ["Guilhem", "Ousset", "Jeff", "Daude", "Antoine"];

    const totals = useMemo(() => {
        const t = {};
        joueurs.forEach(j => {
            t[j] = series.reduce((sum, s) => {
                const serieScore = calcSerie(s);
                const prono = pronos.find(p => p.joueur === j && p.match_id === s.id);
                if (!prono) return sum;
                return sum + calculatePoints(prono, serieScore);
            }, 0);
        });
        return t;
    }, [pronos, rawMatches, series, mapping]);

    const joueursTries = useMemo(() => {
        return [...joueurs].sort((a, b) => (totals[b] || 0) - (totals[a] || 0));
    }, [totals]);

    return (
        <div style={{ padding: 10, fontFamily: "Arial" }}>

            <h1>NBA PLAYOFFS 2026</h1>
            {loading && <p style={{ textAlign: "center", color: "#fbbf24" }}>Chargement...</p>}

            <div style={{ margin: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", position: "sticky", top: 0, background: "#0b0f1a", zIndex: 10, paddingBottom: 6 }}>
                    <button onClick={() => setTab("pronos")}>Pronostics</button>
                    <button onClick={() => setTab("raw")}>Score des matchs</button>
                    <button onClick={() => setTab("scoreSeries")}>Score des séries</button>
                    <button onClick={() => setTab("series")}>Classement pronos</button>
                    <button onClick={() => setTab("article")}>Analyse des résultats</button>
                    <button onClick={() => setTab("regles")}>Calcul des points</button>
                </div>
            </div>

            {tab === "pronos" && (
                <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
                    <table border="1" cellPadding="5">
                        <thead>
                            <tr style={{ position: "sticky", top: 0 }}>
                                <th>Série</th>
                                <th>Joueur</th>
                                <th>Gagnant</th>
                                <th>Perdant</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const sorted = [...pronos].sort((a, b) => {
                                    if (a.match_id < b.match_id) return -1;
                                    if (a.match_id > b.match_id) return 1;
                                    if (a.joueur < b.joueur) return -1;
                                    if (a.joueur > b.joueur) return 1;
                                    return 0;
                                });
                                let colorIndex = 0;
                                let lastMatchId = null;
                                const colors = ["#1a2740", "#0f172a"];
                                return sorted.map((p, i) => {
                                    if (p.match_id !== lastMatchId) {
                                        colorIndex = 1 - colorIndex;
                                        lastMatchId = p.match_id;
                                    }
                                    return (
                                        <tr key={i} style={{ background: colors[colorIndex] }}>
                                            <td>{p.match_id}</td>
                                            <td>{p.joueur}</td>
                                            <td>{p.gagnant}</td>
                                            <td>{p.perdant}</td>
                                            <td>{p.score}</td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "raw" && (
                <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
                    <table border="1" cellPadding="5">
                        <thead>
                            <tr style={{ position: "sticky", top: 0 }}>
                                <th>Date</th>
                                <th>Match</th>
                                <th>Score</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(rawMatches)
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .map((m, i) => (
                                    <tr key={m.match_id} style={{ background: i % 2 === 0 ? "#1a2740" : "#0f172a" }}>
                                        <td>{new Date(m.date).toLocaleDateString("fr-FR")}</td>
                                        <td>{m.team_a} vs {m.team_b}</td>
                                        <td>{m.score}</td>
                                        <td>{m.status}</td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "scoreSeries" && (
                <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
                    <table border="1" cellPadding="5">
                        <thead>
                            <tr style={{ position: "sticky", top: 0 }}>
                                <th>Série</th>
                                <th>Conf</th>
                                <th>Équipe A</th>
                                <th>Score</th>
                                <th>Équipe B</th>
                            </tr>
                        </thead>
                        <tbody>
                            {series.map((s, i) => {
                                const { winsA, winsB } = calcSerie(s);
                                return (
                                    <tr key={s.id} style={{ background: i % 2 === 0 ? "#1a2740" : "#0f172a" }}>
                                        <td>{s.id}</td>
                                        <td>{s.conf}</td>
                                        <td>{s.team_a}</td>
                                        <td>{winsA} - {winsB}</td>
                                        <td>{s.team_b}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === "series" && (
               <div>
                   <table border="1" cellPadding="5" style={{ borderCollapse: "separate", borderSpacing: 0, display: "block", overflowX: "auto" }}>
                        <thead>
                           <tr>
                               <th style={{ position: "sticky", left: 0, top: 0, zIndex: 3, background: "#1d428a" }}>Série</th>
                               <th style={{ position: "sticky", left: 50, top: 0, zIndex: 3, background: "#1d428a" }}>Score</th>
                               {joueursTries.map(j => (
                                   <th key={j} style={{ position: "sticky", top: 0, background: "#1d428a" }}>{j}<br /><span style={{ color: "#c8102e", fontWeight: "bold" }}>{totals[j]}</span></th>
                               ))}
                           </tr>
                           
                        </thead>
                        <tbody>
                            {[...series].sort((a, b) => {
                                const scoreA = calcSerie(a);
                                const scoreB = calcSerie(b);
                                if (!scoreA.termine && scoreB.termine) return -1;
                                if (scoreA.termine && !scoreB.termine) return 1;
                                if (a.id > b.id) return -1;
                                if (a.id < b.id) return 1;
                                return 0;
                            }).map((s, i) => {
                                const serieScore = calcSerie(s);
                                const coeff = coeffTour(s.id);
                                const scoreAffiche = `${s.team_a} ${serieScore.winsA}-${serieScore.winsB} ${s.team_b}`;
                                return (
                                    <tr key={s.id} style={{ background: i % 2 === 0 ? "#1a2740" : "#0f172a" }}>
                                       <td style={{ position: "sticky", left: 0, zIndex: 1, background: i % 2 === 0 ? "#1a2740" : "#0f172a" }}>{s.id}</td>
                                       <td style={{ position: "sticky", left: 50, zIndex: 1, background: i % 2 === 0 ? "#1a2740" : "#0f172a" }}>{scoreAffiche}</td>
                                        {joueursTries.map(j => {
                                            const prono = pronos.find(
                                                p => p.joueur === j && p.match_id === s.id
                                            );
                                            const pts = prono ? calculatePoints(prono, serieScore) : 0;
                                            const bonGagnant = prono && prono.gagnant === serieScore.gagnant;
                                            const bonPerdant = bonGagnant && prono.perdant === serieScore.perdant;
                                            const bonScore = bonGagnant && prono.score === serieScore.score;
                                            return (
                                                <td key={j}>
                                                    {prono ? (
                                                        <>
                                                            {prono.gagnant} {prono.score} {prono.perdant}
                                                            <br />
                                                            {serieScore.termine ? (
                                                                <>
                                                                    <span style={{ color: bonGagnant ? "#00ff9d" : "#ff4444" }}>
                                                                        {bonGagnant ? `+${15 * coeff}g` : "+0g"}
                                                                    </span>
                                                                    {" "}
                                                                    <span style={{ color: bonPerdant ? "#00ff9d" : "#ff4444" }}>
                                                                        {bonPerdant ? `+${5 * coeff}p` : "+0p"}
                                                                    </span>
                                                                    {" "}
                                                                    <span style={{ color: bonScore ? "#00ff9d" : "#ff4444" }}>
                                                                        {bonScore ? `+${15 * coeff}s` : "+0s"}
                                                                    </span>
                                                                </>
                                                            ) : "-"}
                                                        </>
                                                    ) : "-"}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}


            {tab === "regles" && (
                <div style={{ padding: 10, maxWidth: 600 }}>
                    <h2>Calcul des points</h2>
                    <p>Chaque joueur pronostique le gagnant, le perdant et le score de chaque série avant le début des playoffs.</p>

                    <h3>Points de base</h3>
                    <p>• Bon gagnant : +15 pts</p>
                    <p>• Bon perdant : +5 pts</p>
                    <p>• Score exact : +15 pts</p>
                    <p>Le total de points est multiplié par le coefficient du tour.</p>

                    <h3>Coefficients par tour</h3>
                    <p>• 1er tour : ×1</p>
                    <p>• 2ème tour (demi-finale de conférence) : ×1.5</p>
                    <p>• 3ème tour (finale de conférence) : ×2</p>
                    <p>• Finale NBA : ×3</p>

                    <h3>Exemple</h3>
                    <p>Je pronostique OKC bat LAL 4-2 au 1er tour. Résultat réel : OKC bat LAL 4-2.</p>
                    <p>→ +15 (bon gagnant) + 5 (bon perdant) + 15 (bon score) = <strong>35 pts × 1 = 35 pts</strong></p>
                    <p>Au 2ème tour, Je pronostique OKC bat DEN 4-1. Résultat réel : OKC bat MIN 4-2.</p>
                    <p>→ +15 (bon gagnant) + 0 (mauvais perdant) + 0 (mauvais score) = <strong>15 pts × 1.5 = 22.5 pts</strong></p>

                    <h3>Total maximum possible</h3>
                    <p>• 1er tour (×1) — 8 séries : 280 pts</p>
                    <p>• 2ème tour (×1.5) — 4 séries : 210 pts</p>
                    <p>• 3ème tour (×2) — 2 séries : 140 pts</p>
                    <p>• Finale (×3) — 1 série : 105 pts</p>
                    <p><strong>Total maximum : 735 pts</strong></p>
                </div>
            )}


    {tab === "article" && (
                <div style={{ padding: 10, maxWidth: 700 }}>
                    {articleError && <p style={{ color: "#ff4444" }}>{articleError}</p>}
                    {article && (
                   <div>
                       <p style={{ color: "#fbbf24", fontSize: 13 }}>Article du {new Date().toLocaleDateString("fr-FR")}</p>
                       <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "Georgia, serif" }}>
                           {article}
                       </div>
                   </div>
               )}
                </div>
            )}

        </div>
    );

}

ReactDOM
    .createRoot(document.getElementById("root"))
    .render(<App />);


