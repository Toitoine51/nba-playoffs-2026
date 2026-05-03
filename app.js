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

   useEffect(() => {
       fetch("./pronos.json?v=1")
           .then(r => r.json())
           .then(data => setPronos(data))
           .catch(err => {
               console.error("PRONOS ERROR", err);
               setPronos([]);
           });
   
       fetchResults();
   }, []);

    useEffect(() => {
        saveResults(results);
    }, [results]);

    const fetchResults = async () => {
        setLoading(true);
        try {
           
            // 1. Synchronise ESPN → KV
            await fetch("https://syncnba.toitoine51.workers.dev/");

            // 2. Lit le KV et affiche
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

    const calculatePoints = (prono, real) => {
        if (!real) return 0;
        const isFinal =
            real.status === "Final" ||
            real.status?.type?.description === "Final";
        if (!isFinal) return 0;
        let pts = 0;
        if (prono.gagnant === real.winner) {
            pts += 10;
            if (prono.score === real.score) {
                pts += 10;
            }
        }
        return pts;
    };

    const matches = [
        "R1-O1", "R1-O2", "R1-O3", "R1-O4",
        "R1-E1", "R1-E2", "R1-E3", "R1-E4"
    ];

    const joueurs = ["Guilhem", "Ousset", "Jeff", "Daude", "Antoine"];

    const totals = useMemo(() => {
        const t = {};
        joueurs.forEach(j => {
            t[j] = pronos
                .filter(p => p.joueur === j)
                .reduce((sum, p) => sum + calculatePoints(p, rawMatches[p.match_id]), 0);
        });
        return t;
    }, [pronos, rawMatches]);

    return (
        <div style={{ padding: 10, fontFamily: "Arial" }}>

            <h1>NBA PLAYOFFS 2026 t1</h1>
            {loading && <p style={{ textAlign: "center", color: "#fbbf24" }}>Chargement...</p>}

            <div style={{ margin: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setTab("pronos")}>Pronostics</button>
                    <button onClick={() => setTab("raw")}>Score des matchs</button>
                    <button onClick={() => setTab("series")}>Séries</button>
                </div>
            </div>

            {tab === "pronos" && (
                <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
                    <table border="1" cellPadding="5">
                        <thead>
                            <tr style={{ position: "sticky", top: 0 }}>
                                <th>Match</th>
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
                                .map(m => (
                                    <tr key={m.match_id}>
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
            {tab === "series" && (
                <div style={{ overflowX: "auto" }}>
                    <table border="1" cellPadding="5">
                        <thead>
                            <tr>
                                <th>Match</th>
                                <th>Score</th>
                                {joueurs.map(j => (
                                    <th key={j}>{j}<br />{totals[j]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map(id => {
                                const real = rawMatches[id] || {};
                                return (
                                    <tr key={id}>
                                        <td>
                                            {id}<br />
                                            {real.teamA || "TBD"} vs {real.teamB || "TBD"}<br />
                                            {real.status || "-"}
                                        </td>
                                        <td>{real.score || "-"}</td>
                                        {joueurs.map(j => {
                                            const prono = pronos.find(
                                                p => p.joueur === j && p.match_id === id
                                            );
                                            const pts = prono ? calculatePoints(prono, real) : 0;
                                            return (
                                                <td key={j}>
                                                    {prono ? (
                                                        <>
                                                            {prono.gagnant} {prono.score}
                                                            <br />
                                                            +{pts}
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

        </div>
    );
}

ReactDOM
    .createRoot(document.getElementById("root"))
    .render(<App />);
