async function fetchMatches(startStr) {
    const res = await fetch(
        `https://scrap2.toitoine51.workers.dev/?start=${startStr}&days=3`
    );
    return await res.json();
}
