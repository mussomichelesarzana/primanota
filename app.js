// --- Matrix Rain Engine ---
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let matrixInterval = null;
let rainDrops = [];

const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const fontSize = 16;

function initMatrix() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const columns = Math.floor(canvas.width / fontSize);
  rainDrops = Array(columns).fill(1);
}

function drawMatrix() {
  if (!ctx) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f0';
  ctx.font = fontSize + 'px monospace';

  for (let i = 0; i < rainDrops.length; i++) {
    const text = chars.charAt(Math.floor(Math.random() * chars.length));
    ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

    if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      rainDrops[i] = 0;
    }
    rainDrops[i]++;
  }
}

function startMatrix() {
  initMatrix();
  if (canvas) canvas.style.display = 'block';
  if (!matrixInterval) {
    matrixInterval = setInterval(drawMatrix, 35);
  }
}

function stopMatrix() {
  if (matrixInterval) {
    clearInterval(matrixInterval);
    matrixInterval = null;
  }
  if (canvas) {
    canvas.style.display = 'none';
  }
}

window.addEventListener('resize', initMatrix);
startMatrix();

// --- App Logic ---
let currentType = 'spesa';
let db;

const request = indexedDB.open('PrimaNotaDB', 1);
request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains('transactions')) {
    db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
  }
};
request.onsuccess = (e) => {
  db = e.target.result;
  
  const savedUser = localStorage.getItem('saved_username');
  const savedPass = localStorage.getItem('saved_password');
  if (savedUser) document.getElementById('username').value = savedUser;
  if (savedPass) document.getElementById('password').value = savedPass;

  if (localStorage.getItem('isLoggedIn') === 'true') {
    initApp();
  }
};

let categories = JSON.parse(localStorage.getItem('categories')) || [
  'Alimentari', 'Ristoranti', 'Carburante', 'Bollette', 'Stipendio', 'Gioco d\'azzardo', 'Svago', 'Varie'
];

const today = new Date();
document.getElementById('date').valueAsDate = today;
document.getElementById('month-filter').value = today.toISOString().slice(0, 7);

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const remember = document.getElementById('remember-me').checked;

  if (u === 'michele' && p === '12345678') {
    localStorage.setItem('isLoggedIn', 'true');
    if (remember) {
      localStorage.setItem('saved_username', u);
      localStorage.setItem('saved_password', p);
    } else {
      localStorage.removeItem('saved_username');
      localStorage.removeItem('saved_password');
    }
    initApp();
  } else {
    alert('Credenziali errate!');
  }
});

function logout() {
  if (confirm('Vuoi disconnetterti?')) {
    localStorage.removeItem('isLoggedIn');
    location.reload();
  }
}

function initApp() {
  stopMatrix();
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

document.getElementById('transaction-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const editId = document.getElementById('edit-id').value;

  const tx = {
    type: currentType,
    amount: parseFloat(document.getElementById('amount').value),
    date: document.getElementById('date').value,
    category: document.getElementById('category').value,
    account: document.getElementById('account').value,
    note: document.getElementById('note').value,
    timestamp: Date.now()
  };

  const transaction = db.transaction('transactions', 'readwrite');
  const store = transaction.objectStore('transactions');

  if (editId) {
    tx.id = parseInt(editId);
    store.put(tx).onsuccess = () => {
      resetForm();
      loadData();
    };
  } else {
    store.add(tx).onsuccess = () => {
      resetForm();
      loadData();
    };
  }
});

function resetForm() {
  document.getElementById('edit-id').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('note').value = '';
  document.getElementById('date').valueAsDate = new Date();
  document.getElementById('form-title').textContent = 'Nuova Registrazione';
  document.getElementById('btn-submit').textContent = 'Salva';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
  setType('spesa');
}

function loadData() {
  const filterMonth = document.getElementById('month-filter').value;
  const store = db.transaction('transactions', 'readonly').objectStore('transactions');
  
  store.getAll().onsuccess = (e) => {
    const allItems = e.target.result;
    
    // 1. Calcolo saldi in tempo reale
    calculateAccountBalances(allItems, filterMonth);

    // 2. Filtra per la lista visibile
    const filteredList = allItems.filter(item => item.date.startsWith(filterMonth))
                                 .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderHistory(filteredList);
    renderStats(filteredList);
  };
}

function calculateAccountBalances(allItems, filterMonth) {
  let cashTotal = 0;
  let bancaTotal = 0;
  let cartaMonthTotal = 0;

  allItems.forEach(item => {
    const isSpesa = item.type === 'spesa';
    const amount = isSpesa ? -item.amount : item.amount;

    // Contanti e Banca mantengono lo storico complessivo
    if (item.account === 'cash') {
      cashTotal += amount;
    } else if (item.account === 'banca') {
      bancaTotal += amount;
    } else if (item.account === 'carta') {
      // Carta di Credito: somma solo il mese filtrato attuale
      if (item.date.startsWith(filterMonth)) {
        cartaMonthTotal += isSpesa ? item.amount : -item.amount;
      }
    }
  });

  // Render Contanti
  const cashEl = document.getElementById('bal-cash');
  cashEl.textContent = `€ ${cashTotal.toFixed(2)}`;
  cashEl.className = `text-sm font-black ${cashTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  // Render Banca
  const bancaEl = document.getElementById('bal-banca');
  bancaEl.textContent = `€ ${bancaTotal.toFixed(2)}`;
  bancaEl.className = `text-sm font-black ${bancaTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  // Render Carta (Addebito previsto)
  const cartaEl = document.getElementById('bal-carta');
  cartaEl.textContent = `€ ${cartaMonthTotal.toFixed(2)}`;
  cartaEl.className = `text-sm font-black ${cartaMonthTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`;
}

function renderHistory(list) {
  const container = document.getElementById('content-history');
  
  container.innerHTML = list.map(item => {
    const isSpesa = item.type === 'spesa';
    const accLabel = item.account === 'cash' ? 'Contanti' : (item.account === 'banca' ? 'Banca' : 'Carta');
    
    return `
      <div class="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl border border-gray-700">
        <div>
          <div class="font-bold text-sm">${item.category} <span class="text-xs font-normal text-gray-400">(${accLabel})</span></div>
          <div class="text-xs text-gray-400">${item.date} ${item.note ? '• ' + item.note : ''}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="font-black text-right ${isSpesa ? 'text-rose-400' : 'text-emerald-400'}">
            ${isSpesa ? '-' : '+'}€ ${item.amount.toFixed(2)}
          </div>
          <div class="flex gap-1">
            <button onclick="editTransaction(${item.id})" class="text-xs bg-gray-600 hover:bg-gray-500 p-1.5 rounded-lg text-gray-200">✏️</button>
            <button onclick="deleteTransaction(${item.id})" class="text-xs bg-gray-600 hover:bg-rose-600 p-1.5 rounded-lg text-gray-200">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<div class="text-gray-400 text-center py-4">Nessun movimento nel periodo selezionato</div>';
}

function editTransaction(id) {
  const store = db.transaction('transactions', 'readonly').objectStore('transactions');
  store.get(id).onsuccess = (e) => {
    const item = e.target.result;
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('amount').value = item.amount;
    document.getElementById('date').value = item.date;
    document.getElementById('category').value = item.category;
    document.getElementById('account').value = item.account;
    document.getElementById('note').value = item.note || '';
    
    setType(item.type);
    
    document.getElementById('form-title').textContent = 'Modifica Registrazione';
    document.getElementById('btn-submit').textContent = 'Aggiorna Movimento';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

function deleteTransaction(id) {
  if (confirm('Sei sicuro di voler eliminare questa registrazione?')) {
    const store = db.transaction('transactions', 'readwrite').objectStore('transactions');
    store.delete(id).onsuccess = () => {
      loadData();
    };
  }
}

let chartInstance = null;
function renderStats(list) {
  const catAnalysis = {};

  list.forEach(item => {
    if (!catAnalysis[item.category]) {
      catAnalysis[item.category] = { incassi: 0, spese: 0 };
    }

    if (item.type === 'spesa') {
      catAnalysis[item.category].spese += item.amount;
    } else {
      catAnalysis[item.category].incassi += item.amount;
    }
  });

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