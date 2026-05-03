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

    const merged = {
        ...existing,
        ...data
    };

    localStorage.setItem("nba_matches", JSON.stringify(merged));
}

/* ======================
   APP
====================== */

function App() {

    const [tab, setTab] = useState("series");

    const [pronos, setPronos] = useState([]);
    const [results, setResults] = useState({});
    const [rawMatches, setRawMatches] = useState({}); // 🔥 CLEAN START

    const [loading, setLoading] = useState(false);

    /* ======================
       LOAD PRONOS
    ====================== */

    useEffect(() => {

        fetch("./pronos.json?v=1")
            .then(r => r.json())
            .then(data => setPronos(data))
            .catch(err => {
                console.error("PRONOS ERROR", err);
                setPronos([]);
            });

    }, []);

    /* ======================
       SAVE RESULTS (OPTIONAL)
    ====================== */

    useEffect(() => {
        saveResults(results);
    }, [results]);

    /* ======================
       FETCH MATCHES
    ====================== */

    const fetchResults = async () => {
    setLoading(true);
    try {
        const res = await fetch("https://syncnba.toitoine51.workers.dev/state");
        const json = await res.json();

        const newMatches = {};
        (json.events || []).forEach(ev => {
            newMatches[ev.match_id] = ev;
        });

        setRawMatches(newMatches);
        saveMatches(newMatches);

       } catch (e) {
           console.error("FETCH ERROR", e);
       }
       setLoading(false);
   };
    /*
    const fetchResults = async () => {

        setLoading(true);

        try {

            const res = await fetch(
                "https://scrap.toitoine51.workers.dev/?start=20260414&days=3"
            );

            const json = await res.json();

            const newResults = {};

            (json.events || []).forEach(m => {

                const key =
                    m.match_id ||
                    m.id ||
                    m.game_id ||
                    m.event_id;

                if (!key) return;

                const statusText =
                    m.status?.type?.description ||
                    m.status ||
                    "Scheduled";

                newResults[key] = {

                    score: m.series_score || m.score || "-",
                    winner: m.winner || "",
                    loser: m.loser || "",
                    status: statusText,
                    teamA: m.team_a || "",
                    teamB: m.team_b || ""

                };

            });

            // update state
            setRawMatches(prev => ({
                ...prev,
                ...newResults
            }));

            // persist
            saveMatches(newResults);

        } catch (e) {
            console.error("FETCH ERROR", e);
        }

        setLoading(false);
    };*/

    /* ======================
       POINTS
    ====================== */

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

    /* ======================
       MATCHES FIXES
    ====================== */

    const matches = [
        "R1-O1",
        "R1-O2",
        "R1-O3",
        "R1-O4",
        "R1-E1",
        "R1-E2",
        "R1-E3",
        "R1-E4"
    ];

    const joueurs = [
        "Guilhem",
        "Ousset",
        "Jeff",
        "Daude",
        "Antoine"
    ];

    /* ======================
       TOTALS
    ====================== */

    const totals = useMemo(() => {

        const t = {};

        joueurs.forEach(j => {

            t[j] = pronos
                .filter(p => p.joueur === j)
                .reduce((sum, p) => {

                    return sum + calculatePoints(
                        p,
                        rawMatches[p.match_id]
                    );

                }, 0);

        });

        return t;

    }, [pronos, rawMatches]);

    /* ======================
       UI
    ====================== */

    return (

        <div style={{ display: "flex", gap: 10, margin: 10 }}>
             <button onClick={() => setTab("pronos")}>Pronostics</button>
             <button onClick={() => setTab("raw")}>Score des matchs</button>
             <button onClick={fetchResults}>
                 {loading ? "Loading..." : "Mettre à jour"}
             </button>
             <button onClick={() => setTab("series")}>Séries</button>
         </div>

            {/* PRONOS */}

            {tab === "pronos" && (
                <pre>{JSON.stringify(pronos, null, 2)}</pre>
            )}

            {/* RAW MATCHES */}

            {tab === "raw" && (
                <pre>{JSON.stringify(rawMatches, null, 2)}</pre>
            )}

            {/* SERIES */}

            {tab === "series" && (

                <div style={{ overflowX: "auto" }}>

                    <table border="1" cellPadding="5">

                        <thead>
                            <tr>
                                <th>Match</th>
                                <th>Score</th>
                                {joueurs.map(j => (
                                    <th key={j}>
                                        {j}<br />
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
                                            {id}<br />
                                            {real.teamA || "TBD"} vs {real.teamB || "TBD"}<br />
                                            {real.status || "-"}
                                        </td>

                                        <td>{real.score || "-"}</td>

                                        {joueurs.map(j => {

                                            const prono = pronos.find(
                                                p =>
                                                    p.joueur === j &&
                                                    p.match_id === id
                                            );

                                            const pts = prono
                                                ? calculatePoints(prono, real)
                                                : 0;

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
