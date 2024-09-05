const endpoint = 'http://localhost:8080/';

function normalizeText(text) {
  text = text.toLowerCase();
    text = text.normalize('NFD'); 

  text = text.replace(/[\u0300-\u036f]/g, '');

  text = text.replace(/[\u2080-\u2089]/g, match => {
    return String.fromCharCode(match.charCodeAt(0) - 0x2080 + 0x0030);
  });

  text = text.replace(/[\u2070-\u2079]/g, match => {
    return String.fromCharCode(match.charCodeAt(0) - 0x2070 + 0x0030);
  });
  return text;
}

async function getSizes() {
  try {
    const response = await fetch(`${endpoint}ordbogen`);
    if (!response.ok) throw new Error('Network response was not ok.');
    return response.json();
  } catch (error) {
    console.error('Fejl ved hentning af størrelser:', error);
    return { min: 0, max: 0 }; 
  }
}

async function getEntryAt(index) {
  try {
    const response = await fetch(`${endpoint}ordbogen/${index}`);
    if (!response.ok) throw new Error('Network response was not ok.');
    return response.json();
  } catch (error) {
    console.error(`Fejl ved hentning af entry ${index}:`, error);
    return null; 
  }
}

async function binarySearch(searchTerm) {
  const { min, max } = await getSizes();
  let low = min;
  let high = max;
  let iterations = 0;
  let startTime = performance.now();
  const normalizedSearchTerm = normalizeText(searchTerm);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    iterations++;

    const entry = await getEntryAt(mid);
    if (!entry) break;

    const normalizedEntry = normalizeText(entry.inflected);
    const comp = normalizedSearchTerm.localeCompare(normalizedEntry);

    if (comp === 0) {
      const endTime = performance.now();
      return { entry, iterations, time: endTime - startTime };
    } else if (comp < 0) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const endTime = performance.now();
  return { entry: null, iterations, time: endTime - startTime };
}

async function handleSearchEvent() {
  const searchTerm = document.getElementById('searchTerm').value;
  await performSearch(searchTerm);
}

document.getElementById('searchButton').addEventListener('click', handleSearchEvent);
document.getElementById('searchTerm').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleSearchEvent();
  }
});

async function performSearch(searchTerm) {
  const resultDiv = document.getElementById('result');
  const statsDiv = document.getElementById('stats');

  if (!searchTerm) {
    resultDiv.textContent = 'Indtast venligst et ord!';
    return;
  }

  const { entry, iterations, time } = await binarySearch(searchTerm);

  if (entry) {
    resultDiv.innerHTML = `
      <h2>Fundet ord</h2>
      <p><strong>Bøjningsform:</strong> ${entry.inflected}</p>
      <p><strong>Opslagsord:</strong> ${entry.headword}</p>
      <p><strong>Ordklasse:</strong> ${entry.partofspeech}</p>
      <p><strong>ID:</strong> ${entry.id}</p>
    `;
  } else {
    resultDiv.textContent = 'Ordet blev ikke fundet.';
  }

  statsDiv.innerHTML = `
    <h2>Statistik</h2>
    <p><strong>Antal iterationer:</strong> ${iterations}</p>
    <p><strong>Brugt tid:</strong> ${time.toFixed(2)} ms</p>
  `;
}
