document.body.innerHTML = "APP JS CHARGE";

const { useState, useEffect } = React;

/* ======================
   LOAD PRONOS
====================== */

const [pronos, setPronos] = React.useState([]);

React.useEffect(() => {
    fetch("./pronos.json")
        .then(r => r.json())
        .then(data => setPronos(data));
}, []); 

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

    const [results, setResults] = useState(loadResults());
    const [loading, setLoading] = useState(false);

    const fetchResults = async () => {

        setLoading(true);

        const res = await fetch(
            "https://scrap.toitoine51.workers.dev/?start=20260414&days=3"
        );

        const json = await res.json();

        const newResults = {};

        (json.events || []).forEach(m => {
            newResults[m.match_id] = m;
        });

        const updated = { ...results, ...newResults };

        setResults(updated);
        saveResults(updated);

        setLoading(false);
    };

    const matches = [
        "R1-O1","R1-O2","R1-O3","R1-O4",
        "R1-E1","R1-E2","R1-E3","R1-E4"
    ];

    const joueurs = ["Guilhem","Ousset","Jeff","Daude","Antoine"];

    return (
        <div style={{ padding: 10 }}>

            <h2>NBA PLAYOFFS 2026</h2>

            <button onClick={fetchResults}>
                {loading ? "Loading..." : "Fetch"}
            </button>

               <pre style={{ background: "black", color: "lime", padding: 10, fontSize: 10 }}>
{JSON.stringify(results, null, 2)}
</pre>

            <table border="1" width="100%" cellPadding="5">

                <thead>
                    <tr>
                        <th>Match</th>
                        <th>Score</th>
                        {joueurs.map(j => <th key={j}>{j}</th>)}
                    </tr>
                </thead>

                <tbody>

                    {matches.map(id => {

                        const real = results[id];

                        return (
                            <tr key={id}>
                                <td>{id}</td>
                                <td>{real ? real.score : "-"}</td>

                                {joueurs.map(j => {

                                    const prono = pronos.find(
                                        p => p.joueur === j && p.match_id === id
                                    );

                                    return (
                                        <td key={j}>
                                            {prono ? prono.gagnant : "-"}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}

                </tbody>

            </table>

        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
