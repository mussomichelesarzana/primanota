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

// --- Toggle Password Visibility ---
function togglePasswordVisibility() {
  const pwdInput = document.getElementById('password');
  const icon = document.getElementById('password-toggle-icon');
  
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    pwdInput.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// --- Credenziali & Login ---
function doLogin(e) {
  if (e) e.preventDefault();

  const u = document.getElementById('username').value.trim().toLowerCase();
  const p = document.getElementById('password').value.trim();
  const remember = document.getElementById('remember-me').checked;

  if (!u || !p) {
    alert('Compila tutti i campi!');
    return;
  }

  // Verifica diretta senza Crypto API
  if (u === 'michele' && p === 't0p3tt4!') {
    localStorage.setItem('isLoggedIn', 'true');
    if (remember) {
      localStorage.setItem('saved_username', u);
    } else {
      localStorage.removeItem('saved_username');
    }
    initApp();
  } else {
    alert('Credenziali errate!');
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('password-toggle-icon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('password-toggle-icon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

// Registrazione Service Worker per supporto PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

function logout() {
  if (confirm('Vuoi disconnetterti?')) {
    localStorage.removeItem('isLoggedIn');
    location.reload();
  }
}

// --- Formattatore Valuta ---
const formatCurrency = (val) => {
  return new Intl.NumberFormat('it-IT', { 
    style: 'currency', 
    currency: 'EUR',
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

// --- Categorie Predefinite ---
const defaultCategories = [
  'Aperitivo',
  'Autostrada',
  'Benzina',
  'Bolletta ADSL',
  'Bolletta Acqua',
  'Bolletta GAS',
  'Bolletta Luce',
  'Colazione',
  'Dealer',
  'GPL',
  'Gioco d\'azzardo',
  'Ristorante',
  'Saldo Iniziale',
  'Spesa',
  'Stipendio'
];

let categories = JSON.parse(localStorage.getItem('categories')) || defaultCategories;
categories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));

// --- App Logic & DB ---
let currentType = 'spesa';
let currentChartType = 'doughnut';
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
  if (savedUser) document.getElementById('username').value = savedUser;

  if (localStorage.getItem('isLoggedIn') === 'true') {
    initApp();
  }
};

const today = new Date();
document.getElementById('date').valueAsDate = today;
document.getElementById('month-filter').value = today.toISOString().slice(0, 7);

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
    btnSpesa.className = 'py-2 rounded-xl font-bold bg-rose-500 text-white transition text-xs flex items-center justify-center gap-1.5';
    btnIncasso.className = 'py-2 rounded-xl font-bold bg-gray-700 text-gray-300 transition text-xs flex items-center justify-center gap-1.5';
  } else {
    btnIncasso.className = 'py-2 rounded-xl font-bold bg-emerald-500 text-white transition text-xs flex items-center justify-center gap-1.5';
    btnSpesa.className = 'py-2 rounded-xl font-bold bg-gray-700 text-gray-300 transition text-xs flex items-center justify-center gap-1.5';
  }
}

function renderCategories() {
  categories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
  const sel = document.getElementById('category');
  sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function addCategory() {
  const name = prompt('Nome nuova categoria:');
  if (name && !categories.includes(name.trim())) {
    categories.push(name.trim());
    categories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    localStorage.setItem('categories', JSON.stringify(categories));
    renderCategories();
    document.getElementById('category').value = name.trim();
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
  document.getElementById('btn-submit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salva';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
  setType('spesa');
}

function loadData() {
  const filterMonth = document.getElementById('month-filter').value;
  const store = db.transaction('transactions', 'readonly').objectStore('transactions');
  
  store.getAll().onsuccess = (e) => {
    const allItems = e.target.result;
    
    calculateAccountBalances(allItems, filterMonth);

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

    if (item.account === 'cash') {
      cashTotal += amount;
    } else if (item.account === 'banca') {
      bancaTotal += amount;
    } else if (item.account === 'carta') {
      if (item.date.startsWith(filterMonth)) {
        cartaMonthTotal += isSpesa ? item.amount : -item.amount;
      }
    }
  });

  const cashEl = document.getElementById('bal-cash');
  cashEl.textContent = formatCurrency(cashTotal);
  cashEl.className = `text-xs font-black ${cashTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const bancaEl = document.getElementById('bal-banca');
  bancaEl.textContent = formatCurrency(bancaTotal);
  bancaEl.className = `text-xs font-black ${bancaTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const cartaEl = document.getElementById('bal-carta');
  cartaEl.textContent = formatCurrency(cartaMonthTotal);
  cartaEl.className = `text-xs font-black ${cartaMonthTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`;
}

function renderHistory(list) {
  const container = document.getElementById('content-history');
  
  container.innerHTML = list.map(item => {
    const isSpesa = item.type === 'spesa';
    const accLabel = item.account === 'cash' ? 'Contanti' : (item.account === 'banca' ? 'Banca' : 'Carta');
    const signedValue = isSpesa ? -item.amount : item.amount;
    
    return `
      <div class="flex justify-between items-center p-3 bg-gray-800/60 rounded-xl border border-gray-700/80">
        <div>
          <div class="font-bold text-xs text-gray-200">${item.category} <span class="text-[10px] font-normal text-gray-400">(${accLabel})</span></div>
          <div class="text-[10px] text-gray-400">${item.date} ${item.note ? '• ' + item.note : ''}</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="font-black text-right text-xs ${isSpesa ? 'text-rose-400' : 'text-emerald-400'}">
            ${formatCurrency(signedValue)}
          </div>
          <div class="flex gap-1">
            <button onclick="editTransaction(${item.id})" class="text-xs bg-gray-700 hover:bg-gray-600 p-1.5 rounded-lg text-gray-200"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteTransaction(${item.id})" class="text-xs bg-gray-700 hover:bg-rose-600 p-1.5 rounded-lg text-gray-200"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<div class="text-gray-400 text-center py-4 text-xs">Nessun movimento nel periodo selezionato</div>';
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
    document.getElementById('btn-submit').innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Aggiorna';
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

function setChartType(type) {
  currentChartType = type;
  const btnDoughnut = document.getElementById('btn-chart-doughnut');
  const btnBar = document.getElementById('btn-chart-bar');

  if (type === 'doughnut') {
    btnDoughnut.className = 'px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-500 text-gray-950 transition';
    btnBar.className = 'px-2 py-1 text-[10px] font-bold rounded-md text-gray-300 transition';
  } else {
    btnBar.className = 'px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-500 text-gray-950 transition';
    btnDoughnut.className = 'px-2 py-1 text-[10px] font-bold rounded-md text-gray-300 transition';
  }
  loadData();
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

  const sortMode = document.getElementById('stats-sort')?.value || 'alpha';
  let catKeys = Object.keys(catAnalysis);

  if (sortMode === 'alpha') {
    catKeys.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
  } else if (sortMode === 'max') {
    catKeys.sort((a, b) => catAnalysis[b].spese - catAnalysis[a].spese);
  } else if (sortMode === 'min') {
    catKeys.sort((a, b) => catAnalysis[a].spese - catAnalysis[b].spese);
  }

  const catContainer = document.getElementById('category-analysis');

  if (catKeys.length === 0) {
    catContainer.innerHTML = '<div class="text-gray-400 text-center text-xs py-2">Nessun dato per le statistiche</div>';
  } else {
    catContainer.innerHTML = catKeys.map(cat => {
      const inc = catAnalysis[cat].incassi;
      const spe = catAnalysis[cat].spese;
      const utile = inc - spe;
      const isPositive = utile >= 0;

      return `
        <div class="bg-gray-800/40 p-2.5 rounded-xl border border-gray-700/80">
          <div class="font-bold text-xs text-gray-200 mb-1">${cat}</div>
          <div class="grid grid-cols-3 gap-1 text-[10px] text-center">
            <div class="bg-gray-900/60 p-1 rounded-lg">
              <span class="text-gray-400 block text-[9px]">Incassati</span>
              <span class="font-semibold text-emerald-400">${formatCurrency(inc)}</span>
            </div>
            <div class="bg-gray-900/60 p-1 rounded-lg">
              <span class="text-gray-400 block text-[9px]">Spesi</span>
              <span class="font-semibold text-rose-400">${formatCurrency(-spe)}</span>
            </div>
            <div class="bg-gray-900/60 p-1 rounded-lg">
              <span class="text-gray-400 block text-[9px]">Utile / Netto</span>
              <span class="font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                ${formatCurrency(utile)}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const chartLabels = [];
  const chartData = [];
  catKeys.forEach(cat => {
    if (catAnalysis[cat].spese > 0) {
      chartLabels.push(cat);
      chartData.push(catAnalysis[cat].spese);
    }
  });

  const ctx = document.getElementById('chart-categories').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  
  chartInstance = new Chart(ctx, {
    type: currentChartType,
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Spesa',
        data: chartData,
        backgroundColor: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#84cc16', '#a855f7'],
        borderRadius: currentChartType === 'bar' ? 6 : 0
      }]
    },
    options: { 
      responsive: true,
      plugins: { 
        legend: { 
          display: currentChartType === 'doughnut',
          labels: { color: '#9ca3af', font: { size: 10 } } 
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              const rawVal = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
              return label + formatCurrency(rawVal);
            }
          }
        }
      },
      scales: currentChartType === 'bar' ? {
        x: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: '#9ca3af', callback: (value) => formatCurrency(value) }, grid: { color: '#374151' } }
      } : {}
    }
  });
}

function showTab(tab) {
  if (tab === 'history') {
    document.getElementById('content-history').classList.remove('hidden');
    document.getElementById('content-stats').classList.add('hidden');
    document.getElementById('tab-history').className = 'flex-1 py-1 text-center text-xs font-bold border-b-2 border-emerald-400 text-emerald-400';
    document.getElementById('tab-stats').className = 'flex-1 py-1 text-center text-xs font-bold text-gray-400';
  } else {
    document.getElementById('content-history').classList.add('hidden');
    document.getElementById('content-stats').classList.remove('hidden');
    document.getElementById('tab-stats').className = 'flex-1 py-1 text-center text-xs font-bold border-b-2 border-emerald-400 text-emerald-400';
    document.getElementById('tab-history').className = 'flex-1 py-1 text-center text-xs font-bold text-gray-400';
  }
}

// --- Funzioni Backup & Restore JSON ---
function exportData() {
  const transaction = db.transaction('transactions', 'readonly');
  const store = transaction.objectStore('transactions');
  
  store.getAll().onsuccess = (e) => {
    const backup = {
      version: 1,
      exportDate: new Date().toISOString(),
      categories: categories,
      transactions: e.target.result
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `prima_nota_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.transactions || !data.categories) {
        alert('File di backup non valido!');
        return;
      }

      if (confirm(`Ripristinare ${data.transactions.length} movimenti e ${data.categories.length} categorie? I dati attuali verranno sovrascritti.`)) {
        localStorage.setItem('categories', JSON.stringify(data.categories));
        categories = data.categories;

        const tx = db.transaction('transactions', 'readwrite');
        const store = tx.objectStore('transactions');
        
        store.clear().onsuccess = () => {
          let completed = 0;
          if (data.transactions.length === 0) {
            renderCategories();
            loadData();
            alert('Ripristino completato!');
            return;
          }
          data.transactions.forEach(item => {
            delete item.id;
            store.add(item).onsuccess = () => {
              completed++;
              if (completed === data.transactions.length) {
                renderCategories();
                loadData();
                alert('Ripristino completato con successo!');
              }
            };
          });
        };
      }
    } catch (err) {
      alert('Errore durante la lettura del file JSON.');
    }
  };
  reader.readAsText(file);
}