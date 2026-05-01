
const { useState, useEffect, useMemo } = React;

/* ======================
   STORAGE
====================== */

function loadResults() {
    return JSON.parse(localStorage.getItem("nba_results") || "{}");
}

function saveResults(data) {
    localStorage.setItem("nba_results", JSON.stringify(data));
}

/* ======================
   APP
====================== */

function App() {

    /* ======================
       PRONOS
    ====================== */

    const [pronos, setPronos] = useState([]);

    useEffect(() => {
        fetch("./pronos.json")
            .then(r => r.json())
            .then(data => {
                setPronos(data);
            })
            .catch(err => {
                document.body.innerHTML +=
                    "<div style='color:red'>ERREUR PRONOS: " + err + "</div>";
            });
    }, []);

    /* ======================
       RESULTS
    ====================== */

    const [results, setResults] = useState(loadResults());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        saveResults(results);
    }, [results]);

    /* ======================
       FETCH MATCHS
    ====================== */

    const fetchResults = async () => {

        setLoading(true);

        try {

            const res = await fetch(
                "https://scrap.toitoine51.workers.dev/?start=20260414&days=3"
            );
           alert("FETCH OK");

            const json = await res.json();
            alert("JSON OK");
            alert(JSON.stringify(json.events?.[0], null, 2));

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

            const updated = {
                ...results,
                ...newResults
            };

            setResults(updated);

        } catch (e) {

            document.body.innerHTML +=
                "<div style='color:red'>FETCH ERROR: " + e + "</div>";
        }

        setLoading(false);
    };

    /* ======================
       POINTS
    ====================== */

    const calculatePoints = (prono, real) => {

        if (!real) return 0;

        if (real.status !== "Final") return 0;

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
       MATCHES
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
                        results[p.match_id]
                    );

                }, 0);

        });

        return t;

    }, [pronos, results]);

    /* ======================
       RENDER
    ====================== */

    return (

        <div style={{
            padding: 10,
            fontFamily: "Arial",
            background: "#f5f5f5",
            minHeight: "100vh"
        }}>

            <h1 style={{
                background: "#1d428a",
                color: "white",
                padding: 15,
                margin: 0,
                marginBottom: 10
            }}>
                NBA PLAYOFFS 2026
            </h1>

            <button
                onClick={fetchResults}
                style={{
                    background: "#c8102e",
                    color: "white",
                    border: "none",
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 15,
                    fontWeight: "bold"
                }}
            >
                {loading ? "Loading..." : "Fetch"}
            </button>

            <div style={{
                marginBottom: 10,
                background: "black",
                color: "lime",
                padding: 10,
                fontSize: 11
            }}>
                PRONOS: {pronos.length}
            </div>

            <div style={{
                overflowX: "auto"
            }}>

                <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    background: "white",
                    minWidth: "900px"
                }}>

                    <thead>

                        <tr style={{
                            background: "#1d428a",
                            color: "white"
                        }}>

                            <th style={{ padding: 10 }}>
                                Match
                            </th>

                            <th style={{ padding: 10 }}>
                                Score
                            </th>

                            {joueurs.map(j => (

                                <th
                                    key={j}
                                    style={{ padding: 10 }}
                                >
                                    <div>{j}</div>

                                    <div style={{
                                        color: "#ffd54f",
                                        fontWeight: "bold",
                                        fontSize: 20
                                    }}>
                                        {totals[j]}
                                    </div>

                                </th>

                            ))}

                        </tr>

                    </thead>

                    <tbody>

                        {matches.map(id => {

                            const real = results[id] || {};

                            return (

                                <tr
                                    key={id}
                                    style={{
                                        borderBottom: "1px solid #ddd"
                                    }}
                                >

                                    <td style={{
                                        padding: 10,
                                        fontWeight: "bold"
                                    }}>
                                        <div style={{
                                            fontSize: 10,
                                            color: "#888"
                                        }}>
                                            {id}
                                        </div>

                                        {real.teamA || "TBD"} vs {real.teamB || "TBD"}

                                        <div style={{
                                            marginTop: 5,
                                            fontSize: 11,
                                            color: "#666"
                                        }}>
                                            {real.status || "Scheduled"}
                                        </div>
                                    </td>

                                    <td style={{
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        fontSize: 22
                                    }}>
                                        {real.score || "-"}
                                    </td>

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

                                            <td
                                                key={j}
                                                style={{
                                                    textAlign: "center",
                                                    padding: 8,
                                                    background:
                                                        pts > 0
                                                            ? "#e8ffe8"
                                                            : "white"
                                                }}
                                            >

                                                {prono ? (
                                                    <>
                                                        <div style={{
                                                            fontSize: 11,
                                                            color: "#555"
                                                        }}>
                                                            {prono.gagnant} {prono.score}
                                                        </div>

                                                        <div style={{
                                                            fontWeight: "bold"
                                                        }}>
                                                            +{pts}
                                                        </div>
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

        </div>

    );
}

ReactDOM
    .createRoot(document.getElementById("root"))
    .render(<App />);
