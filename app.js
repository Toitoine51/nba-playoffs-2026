const { useState, useEffect, useMemo } = React;

/* =========================
   PRONOS
========================= */

let PRONOS = [];

fetch("./prono.json")
    .then(r => r.json())
    .then(data => {
        PRONOS = data;
    });

/* =========================
   STORAGE
========================= */

function loadResults() {
    const saved = localStorage.getItem("nba_results");
    return saved ? JSON.parse(saved) : {};
}

function saveResults(data) {
    localStorage.setItem("nba_results", JSON.stringify(data));
}

function loadFetched() {
    const saved = localStorage.getItem("nba_fetched");
    return saved ? JSON.parse(saved) : [];
}

function saveFetched(data) {
    localStorage.setItem("nba_fetched", JSON.stringify(data));
}

/* =========================
   APP
========================= */

function App() {

    const [results, setResults] = useState(loadResults());
    const [fetched, setFetched] = useState(loadFetched());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        saveResults(results);
    }, [results]);

    useEffect(() => {
        saveFetched(fetched);
    }, [fetched]);

    /* =========================
       FETCH MATCHS
    ========================= */

    const fetchResults = async () => {

        const startStr = "20260414";

        if (fetched.includes(startStr)) return;

        setLoading(true);

        try {
            const res = await fetch(
                `https://scrap2.toitoine51.workers.dev/?start=${startStr}&days=3`
            );

            const json = await res.json();

            const newResults = {};

            (json.events || []).forEach(m => {
                newResults[m.match_id] = m;
            });

            setResults(prev => ({ ...prev, ...newResults }));
            setFetched(prev => [...prev, startStr]);

        } catch (e) {
            console.error(e);
        }

        setLoading(false);
    };

    /* =========================
       POINTS
    ========================= */

    const calculatePoints = (prono, real) => {
        if (!real || real.status !== "Final") return 0;

        let pts = 0;

        if (prono.gagnant === real.winner) {
            pts += 10;
            if (prono.score === real.score) pts += 10;
        }

        return pts;
    };

    const matches = [
        "R1-O1","R1-O2","R1-O3","R1-O4",
        "R1-E1","R1-E2","R1-E3","R1-E4"
    ];

    const joueurs = ["Guilhem","Ousset","Jeff","Daude","Antoine"];

    /* =========================
       RENDER
    ========================= */

    return (
        <div className="p-3">

            <h1 className="text-xl font-black mb-3">
                NBA PLAYOFFS 2026
            </h1>

            <button
                onClick={fetchResults}
                className="bg-red-600 text-white px-4 py-2 rounded"
            >
                {loading ? "Loading..." : "Fetch matches"}
            </button>

            <div className="mt-4 overflow-x-auto">

                <table className="w-full bg-white text-sm">

                    <thead>
                        <tr className="bg-blue-900 text-white">
                            <th className="p-2">Match</th>
                            <th className="p-2">Score</th>
                            {joueurs.map(j => (
                                <th key={j} className="p-2">{j}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>

                        {matches.map(id => {

                            const real = results[id];

                            return (
                                <tr key={id} className="border-b">

                                    <td className="p-2 font-bold">
                                        {id}
                                    </td>

                                    <td className="p-2">
                                        {real ? real.score : "-"}
                                    </td>

                                    {joueurs.map(j => {

                                        const prono = PRONOS.find(
                                            p => p.joueur === j && p.match_id === id
                                        );

                                        const pts = prono ? calculatePoints(prono, real) : 0;

                                        return (
                                            <td key={j} className="p-2 text-center">
                                                {prono ? (
                                                    <div>
                                                        <div>{prono.gagnant}</div>
                                                        <div className="font-bold">
                                                            +{pts}
                                                        </div>
                                                    </div>
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);