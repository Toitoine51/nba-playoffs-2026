function loadResults() {
    const saved = localStorage.getItem("nba_results");
    return saved ? JSON.parse(saved) : {};
}

function saveResults(results) {
    localStorage.setItem("nba_results", JSON.stringify(results));
}

function loadFetchedKeys() {
    const saved = localStorage.getItem("nba_fetched_keys");
    return saved ? new Set(JSON.parse(saved)) : new Set();
}

function saveFetchedKeys(keys) {
    localStorage.setItem(
        "nba_fetched_keys",
        JSON.stringify([...keys])
    );
}
