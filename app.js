const { useState, useEffect, useMemo } = React;

/* ======================
   STORAGE RESULTS (SERIES)
====================== */

function loadResults() {
    return JSON.parse(localStorage.getItem("nba_results") || "{}");
}

function saveResults(data) {
    localStorage.setItem("nba_results", JSON.stringify(data));
}

/* ======================
   STORAGE MATCHES (RAW API)
====================== */

function loadMatches() {
    return JSON.parse(localStorage.getItem("nba_matches") || "{}");
}

function saveMatches(data, setRawMatches) {

    const existing = loadMatches();

    const merged = {
        ...existing,
        ...data
    };

    localStorage.setItem("nba_matches", JSON.stringify(merged));
    setRawMatches(merged);
}

/* ======================
   APP
====================== */

function App() {

    const [tab, setTab] = useState("series");

    const [pronos, setPronos] = useState([]);
    const [results, setResults] = useState(loadResults());
    const [rawMatches, setRawMatches] = useState(loadMatches());

    const [loading, setLoading] = useState(false);

    /* ======================
       LOAD PRONOS
    ====================== */

    useEffect(() => {
        fetch("./pronos.json")
            .then(r => r.json())
            .then(data => setPronos(data))
            .catch(err => console.error("PRONOS ERROR:", err));
    }, []);

    /* ======================
       SAVE SERIES RESULTS
    ====================== */

    useEffect(() => {
        saveResults(results);
    }, [results]);

    /* ======================
       FETCH MATCHS (3 DAYS CHUNKS)
    ====================== */

    const fetchResults = async () => {

        setLoading(true);

        try {

            const res = await fetch(
                "https://scrap.toitoine51.workers.dev/?start=20260414&days=3"
            );

            const json = await res.json();

            const newResults = {};

            (json.events || []).forEach(m => {

                newResults[m.match_id] = {
                    score: m.series_score || m.score || "-",
                    winner: m.winner || "",
                    loser: m.loser || "",
                    status: m.status || "Scheduled",
                    teamA: m.team_a || "",
                    teamB: m.team_b || ""
                };

            });

            saveMatches(newResults, setRawMatches);

        } catch (e) {
            console.error("FETCH ERROR:", e);
        }

        setLoading(false);
    };

    /* ======================
       POINTS CALCULATION
    ====================== */

    const calculatePoints = (prono, real) => {

        if (!real) return 0;
        if (real.status !== "Final") return 0;

        let pts = 0;

        if (prono.gagnant === real.winner) {
            pts += 10;
            if (prono.score === real.score) pts += 10;
        }

        return pts;
    };

    /* ======================
       MATCH IDS (SERIES VIEW)
    ====================== */

    const matches = [
        "R1-O1","R1-O2","R1-O3","R1-O4",
        "R1-E1","R1-E2","R1-E3","R1-E4"
    ];

    const joueurs = ["Guilhem","Ousset","Jeff","Daude","Antoine"];

    /* ======================
       TOTALS
    ====================== */

    const totals = useMemo(() => {

        const t = {};

        joueurs.forEach(j => {

            t[j] = pronos
                .filter(p => p.joueur === j)
                .reduce((sum, p) => {

                    const real = results[p.match_id];
                    return sum + calculatePoints(p, real);

                }, 0);

        });

        return t;

    }, [pronos, results]);

    /* ======================
       RENDER
    ====================== */

    return (

        <div style={{ padding: 10, fontFamily: "Arial" }}>

            <h1>NBA PLAYOFFS 2026</h1>

            <button onClick={fetchResults}>
                {loading ? "Loading..." : "Fetch 3 jours"}
            </button>

            {/* ======================
               TABS
            ====================== */}

            <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 10 }}>

                <button onClick={() => setTab("pronos")}>
                    Pronostics
                </button>

                <button onClick={() => setTab("raw")}>
                    Résultats bruts
                </button>

                <button onClick={() => setTab("series")}>
                    Séries
                </button>

            </div>

            {/* ======================
               PRONOS TAB
            ====================== */}

            {tab === "pronos" && (
                <pre style={{ background: "black", color: "lime", padding: 10 }}>
                    {JSON.stringify(pronos, null, 2)}
                </pre>
            )}

            {/* ======================
               RAW MATCHES TAB
            ====================== */}

            {tab === "raw" && (
                <div>

                    <h3>Matchs stockés (localStorage)</h3>

                    <pre style={{
                        background: "black",
                        color: "cyan",
                        padding: 10
                    }}>
                        {JSON.stringify(rawMatches, null, 2)}
                    </pre>

                </div>
            )}

            {/* ======================
               SERIES TAB
            ====================== */}

            {tab === "series" && (

                <div style={{ overflowX: "auto" }}>

                    <table border="1" cellPadding="5">

                        <thead>
                            <tr>
                                <th>Match</th>
                                <th>Score</th>
                                {joueurs.map(j => (
                                    <th key={j}>
                                        {j}<br/>
                                        {totals[j]}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>

                            {matches.map(id => {

                                const real = rawMatches[id] || {};

                                return (
                                    <tr key={id}>

                                        <td>
                                            {id}<br/>
                                            {real.teamA} vs {real.teamB}<br/>
                                            {real.status}
                                        </td>

                                        <td>{real.score || "-"}</td>

                                        {joueurs.map(j => {

                                            const prono = pronos.find(
                                                p => p.joueur === j && p.match_id === id
                                            );

                                            const pts = prono
                                                ? calculatePoints(prono, real)
                                                : 0;

                                            return (
                                                <td key={j}>
                                                    {prono ? (
                                                        <>
                                                            {prono.gagnant} {prono.score}<br/>
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />); 
