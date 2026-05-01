export const loadResults = () => {
    const saved = localStorage.getItem("nba_results");
    return saved ? JSON.parse(saved) : {};
};

export const saveResults = (results) => {
    localStorage.setItem("nba_results", JSON.stringify(results));
};

export const loadFetchedKeys = () => {
    const saved = localStorage.getItem("nba_fetched_keys");
    return saved ? new Set(JSON.parse(saved)) : new Set();
};

export const saveFetchedKeys = (keys) => {
    localStorage.setItem(
        "nba_fetched_keys",
        JSON.stringify([...keys])
    );
};