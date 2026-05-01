const { useState, useEffect } = React;

/* ===== LOAD PRONOS ===== */
const PRONOS = [];

fetch("./prono.json")
    .then(res => res.json())
    .then(data => {
        PRONOS.push(...data);
    });

function App() {

    const [results, setResults] = useState(loadResults());
    const [fetchedKeys, setFetchedKeys] = useState(loadFetchedKeys());
    const [tab, setTab] = useState("matches");

    useEffect(() => saveResults(results), [results]);
    useEffect(() => saveFetchedKeys(fetchedKeys), [fetchedKeys]);

    const fetchResults = async () => {

        const startStr = "20260414"; // simplifié ici

        if (fetchedKeys.has(startStr)) return;

        const json = await fetchMatches(startStr);

        const newResults = {};

        (json.events || []).forEach(m => {
            newResults[m.match_id] = m;
        });

        setResults(prev => ({ ...prev, ...newResults }));
        setFetchedKeys(prev => new Set(prev).add(startStr));
    };

    const calculatePoints = (prono, real) => {
        if (!real || real.status !== "Final") return 0;

        let pts = 0;

        if (prono.gagnant === real.winner) {
            pts += 10;
            if (prono.score === real.score) pts += 10;
        }

        return pts;
    };

    return (
        <div>
            <h1>NBA PLAYOFFS</h1>

            <button onClick={fetchResults}>
                Fetch
            </button>

        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);