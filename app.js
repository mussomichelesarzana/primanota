let currentType = 'spesa';
let db;

// Inizializza IndexedDB
const request = indexedDB.open('PrimaNotaDB', 1);
request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains('transactions')) {
    db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
  }
};
request.onsuccess = (e) => {
  db = e.target.result;
  if (localStorage.getItem('isLoggedIn') === 'true') {
    initApp();
  }
};

// Categorie predefinite (inclusa Gioco d'azzardo)
let categories = JSON.parse(localStorage.getItem('categories')) || [
  'Alimentari', 'Ristoranti', 'Carburante', 'Bollette', 'Stipendio', 'Gioco d\'azzardo', 'Svago', 'Varie'
];

// Imposta la data odierna nel form e il mese corrente nel filtro
const today = new Date();
document.getElementById('date').valueAsDate = today;
document.getElementById('month-filter').value = today.toISOString().slice(0, 7);

// Auth Logic
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  if (u === 'michele' && p === '12345678') {
    localStorage.setItem('isLoggedIn', 'true');
    initApp();
  } else {
    alert('Credenziali errate!');
  }
});

function logout() {
  localStorage.removeItem('isLoggedIn');
  location.reload();
}

function initApp() {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderCategories();
  loadData();
}

function setType(type) {
  currentType = type;
  const btnSpesa = document.getElementById('btn-spesa');
  const btnIncasso = document.getElementById('btn-incasso');
  if (type === 'spesa') {
    btnSpesa.className = 'py-2.5 rounded-xl font-bold bg-rose-500 text-white transition';
    btnIncasso.className = 'py-2.5 rounded-xl font-bold bg-gray-700 text-gray-300 transition';
  } else {
    btnIncasso.className = 'py-2.5 rounded-xl font-bold bg-emerald-500 text-white transition';
    btnSpesa.className = 'py-2.5 rounded-xl font-bold bg-gray-700 text-gray-300 transition';
  }
}

function renderCategories() {
  const sel = document.getElementById('category');
  sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function addCategory() {
  const name = prompt('Nome nuova categoria:');
  if (name && !categories.includes(name)) {
    categories.push(name);
    localStorage.setItem('categories', JSON.stringify(categories));
    renderCategories();
    document.getElementById('category').value = name;
  }
}

// Inserimento transazione
document.getElementById('transaction-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const tx = {
    type: currentType,
    amount: parseFloat(document.getElementById('amount').value),
    date: document.getElementById('date').value,
    category: document.getElementById('category').value,
    account: document.getElementById('account').value,
    note: document.getElementById('note').value,
    timestamp: Date.now()
  };

  const store = db.transaction('transactions', 'readwrite').objectStore('transactions');
  store.add(tx).onsuccess = () => {
    document.getElementById('amount').value = '';
    document.getElementById('note').value = '';
    loadData();
  };
});

// Caricamento Dati e Filtraggio
function loadData() {
  const filterMonth = document.getElementById('month-filter').value; // Formato YYYY-MM
  const store = db.transaction('transactions', 'readonly').objectStore('transactions');
  
  store.getAll().onsuccess = (e) => {
    const allItems = e.target.result;
    
    // Filtra in base al mese/anno selezionato
    const filteredList = allItems.filter(item => item.date.startsWith(filterMonth))
                                 .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderHistory(filteredList);
    renderStats(filteredList);
  };
}

function renderHistory(list) {
  const container = document.getElementById('content-history');
  let total = 0;
  
  container.innerHTML = list.map(item => {
    const isSpesa = item.type === 'spesa';
    total += isSpesa ? -item.amount : item.amount;
    return `
      <div class="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl border border-gray-700">
        <div>
          <div class="font-bold text-sm">${item.category} <span class="text-xs font-normal text-gray-400">(${item.account})</span></div>
          <div class="text-xs text-gray-400">${item.date} ${item.note ? '• ' + item.note : ''}</div>
        </div>
        <div class="font-black ${isSpesa ? 'text-rose-400' : 'text-emerald-400'}">
          ${isSpesa ? '-' : '+'}€ ${item.amount.toFixed(2)}
        </div>
      </div>
    `;
  }).join('') || '<div class="text-gray-400 text-center py-4">Nessun movimento nel periodo selezionato</div>';

  const totalEl = document.getElementById('total-balance');
  totalEl.textContent = `€ ${total.toFixed(2)}`;
  totalEl.className = `text-2xl font-black ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
}

let chartInstance = null;
function renderStats(list) {
  const catAnalysis = {};
  const accountsMap = { cash: 0, banca: 0, carta: 0 };

  // Calcola Incassi, Spese e Utile per ogni Categoria
  list.forEach(item => {
    if (!catAnalysis[item.category]) {
      catAnalysis[item.category] = { incassi: 0, spese: 0 };
    }

    if (item.type === 'spesa') {
      catAnalysis[item.category].spese += item.amount;
      accountsMap[item.account] = (accountsMap[item.account] || 0) - item.amount;
    } else {
      catAnalysis[item.category].incassi += item.amount;
      accountsMap[item.account] = (accountsMap[item.account] || 0) + item.amount;
    }
  });

  // Render Resoconto Dettagliato per Categoria
  const catContainer = document.getElementById('category-analysis');
  const catKeys = Object.keys(catAnalysis);

  if (catKeys.length === 0) {
    catContainer.innerHTML = '<div class="text-gray-400 text-center text-xs py-2">Nessun dato per le statistiche</div>';
  } else {
    catContainer.innerHTML = catKeys.map(cat => {
      const inc = catAnalysis[cat].incassi;
      const spe = catAnalysis[cat].spese;
      const utile = inc - spe;
      const isPositive = utile >= 0;

      return `
        <div class="bg-gray-700/40 p-3 rounded-xl border border-gray-700/80">
          <div class="font-bold text-sm text-gray-200 mb-1">${cat}</div>
          <div class="grid grid-cols-3 gap-1 text-xs text-center">
            <div class="bg-gray-800/60 p-1.5 rounded-lg">
              <span class="text-gray-400 block text-[10px]">Incassati</span>
              <span class="font-semibold text-emerald-400">+€ ${inc.toFixed(2)}</span>
            </div>
            <div class="bg-gray-800/60 p-1.5 rounded-lg">
              <span class="text-gray-400 block text-[10px]">Spesi</span>
              <span class="font-semibold text-rose-400">-€ ${spe.toFixed(2)}</span>
            </div>
            <div class="bg-gray-800/60 p-1.5 rounded-lg">
              <span class="text-gray-400 block text-[10px]">Utile / Netto</span>
              <span class="font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                ${isPositive ? '+' : ''}€ ${utile.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Saldi Conto
  document.getElementById('account-breakdown').innerHTML = `
    <div class="text-xs font-semibold text-gray-400 mb-2 uppercase">Flusso per Conto (Periodo)</div>
    <div class="flex justify-between text-sm"><span>Contanti:</span> <span class="font-bold">€ ${accountsMap.cash.toFixed(2)}</span></div>
    <div class="flex justify-between text-sm"><span>Banca:</span> <span class="font-bold">€ ${accountsMap.banca.toFixed(2)}</span></div>
    <div class="flex justify-between text-sm"><span>Carta di Credito:</span> <span class="font-bold">€ ${accountsMap.carta.toFixed(2)}</span></div>
  `;

  // Render Grafico Torta Spese
  const chartLabels = [];
  const chartData = [];
  Object.keys(catAnalysis).forEach(cat => {
    if (catAnalysis[cat].spese > 0) {
      chartLabels.push(cat);
      chartData.push(catAnalysis[cat].spese);
    }
  });

  const ctx = document.getElementById('chart-categories').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']
      }]
    },
    options: { 
      plugins: { 
        legend: { labels: { color: '#9ca3af', font: { size: 11 } } } 
      } 
    }
  });
}

function showTab(tab) {
  if (tab === 'history') {
    document.getElementById('content-history').classList.remove('hidden');
    document.getElementById('content-stats').classList.add('hidden');
    document.getElementById('tab-history').className = 'flex-1 py-2 text-center text-sm font-bold border-b-2 border-emerald-400 text-emerald-400';
    document.getElementById('tab-stats').className = 'flex-1 py-2 text-center text-sm font-bold text-gray-400';
  } else {
    document.getElementById('content-history').classList.add('hidden');
    document.getElementById('content-stats').classList.remove('hidden');
    document.getElementById('tab-stats').className = 'flex-1 py-2 text-center text-sm font-bold border-b-2 border-emerald-400 text-emerald-400';
    document.getElementById('tab-history').className = 'flex-1 py-2 text-center text-sm font-bold text-gray-400';
  }
}