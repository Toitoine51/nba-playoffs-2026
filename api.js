export const fetchMatches = async (startStr) => {
    const res = await fetch(
        `https://scrap.toitoine51.workers.dev/?start=${startStr}&days=3`
    );
    return await res.json();
};