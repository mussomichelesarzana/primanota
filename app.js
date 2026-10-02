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

// --- Formattatore Valuta Italiana ---
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
  'Stipendio',
  'Addebito Carta di Credito'
];

let currentUser = null;
let userSettings = {
  cardPayDay: 10,
  splitPlannedDay: 10
};

let categories = [];
let currentType = 'spesa';
let currentStatType = 'spesa'; // 'spesa', 'incasso', oppure 'diff'
let currentChartType = 'doughnut';
let db = null;

// Persistent Storage per prevenire la pulizia della cache Safari / iOS
async function requestStoragePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    const statusEl = document.getElementById('storage-status');
    if (statusEl) {
      statusEl.textContent = isPersisted 
        ? `Utente: ${currentUser.toUpperCase()} • Memoria protetta ✅` 
        : `Utente: ${currentUser.toUpperCase()} • Memoria locale standard`;
    }
  }
}

function initDB(user, callback) {
  const dbName = `PrimaNotaDB_${user}`;
  const request = indexedDB.open(dbName, 1);
  
  request.onupgradeneeded = (e) => {
    const database = e.target.result;
    if (!database.objectStoreNames.contains('transactions')) {
      database.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
    }
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    if (callback) callback();
  };
}

const today = new Date();
document.getElementById('date').valueAsDate = today;
document.getElementById('month-filter').value = today.toISOString().slice(0, 7);

// Auto-Fill Login salvato
const savedUser = localStorage.getItem('saved_username');
const savedPass = localStorage.getItem('saved_password');
if (savedUser) document.getElementById('username').value = savedUser;
if (savedPass) document.getElementById('password').value = savedPass;

if (localStorage.getItem('isLoggedIn') === 'true' && savedUser) {
  currentUser = savedUser;
  initDB(currentUser, () => {
    initApp();
  });
}

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('username').value.trim().toLowerCase();
  const p = document.getElementById('password').value;
  const remember = document.getElementById('remember-me').checked;

  const validUsers = {
    'michele': '12345678',
    'grazia': '12345678'
  };

  if (validUsers[u] && validUsers[u] === p) {
    currentUser = u;
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('active_user', u);

    if (remember) {
      localStorage.setItem('saved_username', u);
      localStorage.setItem('saved_password', p);
    } else {
      localStorage.removeItem('saved_username');
      localStorage.removeItem('saved_password');
    }

    initDB(currentUser, () => {
      initApp();
    });
  } else {
    alert('Credenziali errate! Inserisci un utente valido.');
  }
});

function logout() {
  if (confirm('Vuoi disconnetterti?')) {
    localStorage.removeItem('isLoggedIn');
    location.reload();
  }
}

function loadUserSettings() {
  const savedSettings = localStorage.getItem(`settings_${currentUser}`);
  if (savedSettings) {
    userSettings = JSON.parse(savedSettings);
  } else {
    // Valori predefiniti se non ancora personalizzati
    userSettings = {
      cardPayDay: currentUser === 'grazia' ? 15 : 10,
      splitPlannedDay: 10
    };
  }

  document.getElementById('setting-card-day').value = userSettings.cardPayDay;
  document.getElementById('setting-split-day').value = userSettings.splitPlannedDay;
  updatePlannedLabels();
}

function saveUserSettings() {
  const cardDay = parseInt(document.getElementById('setting-card-day').value) || 10;
  const splitDay = parseInt(document.getElementById('setting-split-day').value) || 10;

  userSettings.cardPayDay = Math.min(Math.max(cardDay, 1), 31);
  userSettings.splitPlannedDay = Math.min(Math.max(splitDay, 1), 31);

  localStorage.setItem(`settings_${currentUser}`, JSON.stringify(userSettings));
  updatePlannedLabels();
  toggleSettingsModal();
  loadData();
}

function updatePlannedLabels() {
  const day = userSettings.splitPlannedDay;
  document.getElementById('label-split-day').textContent = `Soglia: Giorno ${day}`;
  document.getElementById('title-prev-before').textContent = `Entro il giorno ${day}`;
  document.getElementById('title-prev-after').textContent = `Dal giorno ${day + 1} in poi`;
}

function toggleSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.classList.toggle('hidden');
}

function initApp() {
  stopMatrix();
  requestStoragePersistence();
  loadUserSettings();

  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-greeting').textContent = `Prima Nota (${currentUser.charAt(0).toUpperCase() + currentUser.slice(1)})`;

  const savedCats = localStorage.getItem(`categories_${currentUser}`);
  categories = savedCats ? JSON.parse(savedCats) : [...defaultCategories];

  renderCategories();
  checkAndProcessCreditCardRollover(() => {
    loadData();
  });
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
  categories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
  const sel = document.getElementById('category');
  sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function addCategory() {
  const name = prompt('Nome nuova categoria:');
  if (name && !categories.includes(name.trim())) {
    categories.push(name.trim());
    categories.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
    localStorage.setItem(`categories_${currentUser}`, JSON.stringify(categories));
    renderCategories();
    document.getElementById('category').value = name.trim();
  }
}

function editCurrentCategory() {
  const sel = document.getElementById('category');
  const oldName = sel.value;

  if (!oldName) return;

  if (defaultCategories.includes(oldName)) {
    alert(`La categoria di sistema "${oldName}" non può essere rinominata.`);
    return;
  }

  const newName = prompt(`Modifica il nome della categoria "${oldName}":`, oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;

  const trimmedNew = newName.trim();

  if (categories.includes(trimmedNew)) {
    alert('Esiste già una categoria con questo nome!');
    return;
  }

  const index = categories.indexOf(oldName);
  if (index !== -1) {
    categories[index] = trimmedNew;
    localStorage.setItem(`categories_${currentUser}`, JSON.stringify(categories));
  }

  const transaction = db.transaction('transactions', 'readwrite');
  const store = transaction.objectStore('transactions');
  store.getAll().onsuccess = (e) => {
    const all = e.target.result;
    all.forEach(item => {
      if (item.category === oldName) {
        item.category = trimmedNew;
        store.put(item);
      }
    });
    renderCategories();
    document.getElementById('category').value = trimmedNew;
    loadData();
  };
}

function deleteCurrentCategory() {
  const sel = document.getElementById('category');
  const catToDelete = sel.value;

  if (!catToDelete) return;

  if (defaultCategories.includes(catToDelete)) {
    alert(`La categoria di sistema "${catToDelete}" non può essere eliminata.`);
    return;
  }

  const store = db.transaction('transactions', 'readonly').objectStore('transactions');
  store.getAll().onsuccess = (e) => {
    const all = e.target.result;
    const isUsed = all.some(item => item.category === catToDelete);

    if (isUsed) {
      alert(`Impossibile eliminare "${catToDelete}": ci sono già dei movimenti registrati con questa categoria!`);
      return;
    }

    if (confirm(`Sei sicuro di voler eliminare la categoria "${catToDelete}"?`)) {
      categories = categories.filter(c => c !== catToDelete);
      localStorage.setItem(`categories_${currentUser}`, JSON.stringify(categories));
      renderCategories();
      loadData();
    }
  };
}

// --- Gestione Rollover Carta di Credito con giorno personalizzabile ---
function checkAndProcessCreditCardRollover(callback) {
  if (!db) return;
  const tx = db.transaction('transactions', 'readwrite');
  const store = tx.objectStore('transactions');

  store.getAll().onsuccess = (e) => {
    const all = e.target.result;
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);

    const cardByMonth = {};

    all.forEach(item => {
      if (item.account === 'carta' && !item.cardProcessed) {
        const itemMonth = item.date.slice(0, 7);
        if (itemMonth < currentMonthStr) {
          if (!cardByMonth[itemMonth]) cardByMonth[itemMonth] = [];
          cardByMonth[itemMonth].push(item);
        }
      }
    });

    const monthsToProcess = Object.keys(cardByMonth);
    if (monthsToProcess.length === 0) {
      if (callback) callback();
      return;
    }

    monthsToProcess.forEach(mStr => {
      const items = cardByMonth[mStr];
      let monthTotal = 0;

      items.forEach(item => {
        monthTotal += item.type === 'spesa' ? item.amount : -item.amount;
        item.cardProcessed = true;
        store.put(item);
      });

      if (monthTotal > 0) {
        const [mYear, mMonth] = mStr.split('-').map(Number);
        let nextYear = mYear;
        let nextMonth = mMonth + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear++;
        }
        const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        
        // Usa il giorno d'addebito impostato dall'utente
        const payDay = String(userSettings.cardPayDay).padStart(2, '0');
        const chargeDate = `${nextMonthStr}-${payDay}`;
        const totalWithFee = monthTotal + 2.00;

        const newPlannedTx = {
          type: 'spesa',
          amount: parseFloat(totalWithFee.toFixed(2)),
          date: chargeDate,
          category: 'Addebito Carta di Credito',
          account: 'banca',
          status: 'planned',
          note: `Addebito Carta di Credito periodo ${mStr} (${formatCurrency(monthTotal)} + 2,00 € commissione)`,
          timestamp: Date.now()
        };

        store.add(newPlannedTx);
      }
    });

    if (callback) callback();
  };
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
    status: document.getElementById('status').value || 'confirmed',
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
  document.getElementById('status').value = 'confirmed';
  document.getElementById('date').valueAsDate = new Date();
  document.getElementById('form-title').textContent = 'Nuova Registrazione';
  document.getElementById('btn-submit').textContent = 'Salva Movimento';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
  setType('spesa');
}

function loadData() {
  if (!db) return;
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
  let hypeTotal = 0;
  let fidatyTotal = 0;
  let cartaMonthTotal = 0;
  
  let plannedBeforeTotal = 0;
  let plannedAfterTotal = 0;

  const splitDay = userSettings.splitPlannedDay;

  allItems.forEach(item => {
    const isSpesa = item.type === 'spesa';
    const amount = isSpesa ? -item.amount : item.amount;
    const isPlanned = item.status === 'planned';

    if (isPlanned) {
      if (item.date.startsWith(filterMonth)) {
        const itemDay = parseInt(item.date.split('-')[2]);
        if (itemDay <= splitDay) {
          plannedBeforeTotal += amount;
        } else {
          plannedAfterTotal += amount;
        }
      }
      return;
    }

    if (item.account === 'cash') {
      cashTotal += amount;
    } else if (item.account === 'banca') {
      bancaTotal += amount;
    } else if (item.account === 'hype') {
      hypeTotal += amount;
    } else if (item.account === 'fidaty') {
      fidatyTotal += amount;
    } else if (item.account === 'carta') {
      if (item.date.startsWith(filterMonth) && !item.cardProcessed) {
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

  const hypeEl = document.getElementById('bal-hype');
  hypeEl.textContent = formatCurrency(hypeTotal);
  hypeEl.className = `text-xs font-black ${hypeTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const fidatyEl = document.getElementById('bal-fidaty');
  fidatyEl.textContent = formatCurrency(fidatyTotal);
  fidatyEl.className = `text-xs font-black ${fidatyTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const cartaEl = document.getElementById('bal-carta');
  cartaEl.textContent = formatCurrency(cartaMonthTotal);
  cartaEl.className = `text-xs font-black ${cartaMonthTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`;

  const plannedBeforeEl = document.getElementById('bal-planned-before');
  plannedBeforeEl.textContent = formatCurrency(plannedBeforeTotal);
  plannedBeforeEl.className = `font-bold ${plannedBeforeTotal >= 0 ? 'text-emerald-400' : 'text-amber-400'}`;

  const plannedAfterEl = document.getElementById('bal-planned-after');
  plannedAfterEl.textContent = formatCurrency(plannedAfterTotal);
  plannedAfterEl.className = `font-bold ${plannedAfterTotal >= 0 ? 'text-emerald-400' : 'text-amber-400'}`;
}

function renderHistory(list) {
  const container = document.getElementById('content-history');
  
  container.innerHTML = list.map(item => {
    const isSpesa = item.type === 'spesa';
    const isPlanned = item.status === 'planned';
    
    let accLabel = 'Contanti';
    if (item.account === 'banca') accLabel = 'Banca';
    else if (item.account === 'hype') accLabel = 'Hype';
    else if (item.account === 'carta') accLabel = 'Carta';
    else if (item.account === 'fidaty') accLabel = 'Fidaty Oro';

    const signedValue = isSpesa ? -item.amount : item.amount;
    
    return `
      <div class="flex justify-between items-center p-3 ${isPlanned ? 'bg-amber-950/20 border-amber-500/40 opacity-80' : 'bg-gray-700/50 border-gray-700'} rounded-xl border transition">
        <div>
          <div class="font-bold text-sm flex items-center gap-1.5">
            ${item.category} 
            <span class="text-xs font-normal text-gray-400">(${accLabel})</span>
            ${isPlanned ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">PREVISTO</span>' : ''}
          </div>
          <div class="text-xs text-gray-400">${item.date} ${item.note ? '• ' + item.note : ''}</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="font-black text-right text-xs ${isSpesa ? 'text-rose-400' : 'text-emerald-400'}">
            ${formatCurrency(signedValue)}
          </div>
          <div class="flex gap-1">
            ${isPlanned ? `<button onclick="confirmTransaction(${item.id})" title="Segna come contabilizzato" class="text-xs bg-emerald-600 hover:bg-emerald-500 p-1.5 rounded-lg text-white font-bold transition">✔</button>` : ''}
            <button onclick="editTransaction(${item.id})" class="text-xs bg-gray-600 hover:bg-gray-500 p-1.5 rounded-lg text-gray-200">✏️</button>
            <button onclick="deleteTransaction(${item.id})" class="text-xs bg-gray-600 hover:bg-rose-600 p-1.5 rounded-lg text-gray-200">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('') || '<div class="text-gray-400 text-center py-4">Nessun movimento nel periodo selezionato</div>';
}

function confirmTransaction(id) {
  const store = db.transaction('transactions', 'readwrite').objectStore('transactions');
  store.get(id).onsuccess = (e) => {
    const item = e.target.result;
    if (!item) return;
    item.status = 'confirmed';
    store.put(item).onsuccess = () => {
      loadData();
    };
  };
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
    document.getElementById('status').value = item.status || 'confirmed';
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

function setStatType(type) {
  currentStatType = type;
  const btnSpesa = document.getElementById('btn-stat-spesa');
  const btnIncasso = document.getElementById('btn-stat-incasso');
  const btnDiff = document.getElementById('btn-stat-diff');

  btnSpesa.className = 'py-2 rounded-lg text-xs font-black bg-gray-700 text-gray-300 transition';
  btnIncasso.className = 'py-2 rounded-lg text-xs font-black bg-gray-700 text-gray-300 transition';
  btnDiff.className = 'py-2 rounded-lg text-xs font-black bg-gray-700 text-gray-300 transition';

  if (type === 'spesa') {
    btnSpesa.className = 'py-2 rounded-lg text-xs font-black bg-rose-500 text-white transition';
    document.getElementById('stats-section-title').textContent = 'Resoconto Spese per Categoria';
    document.getElementById('chart-section-title').textContent = 'Ripartizione Spese';
  } else if (type === 'incasso') {
    btnIncasso.className = 'py-2 rounded-lg text-xs font-black bg-emerald-500 text-white transition';
    document.getElementById('stats-section-title').textContent = 'Resoconto Incassi per Categoria';
    document.getElementById('chart-section-title').textContent = 'Ripartizione Incassi';
  } else {
    btnDiff.className = 'py-2 rounded-lg text-xs font-black bg-amber-500 text-white transition';
    document.getElementById('stats-section-title').textContent = 'Saldo Netto per Categoria (Miste)';
    document.getElementById('chart-section-title').textContent = 'Differenza Netta per Categoria';
  }
  loadData();
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
  const accountFilter = document.getElementById('stats-account-filter')?.value || 'all';
  
  // Filtra per conto nelle statistiche
  const filteredList = list.filter(item => {
    if (accountFilter === 'all') return true;
    return item.account === accountFilter;
  });

  const catAnalysis = {};

  filteredList.forEach(item => {
    if (!catAnalysis[item.category]) {
      catAnalysis[item.category] = { incassi: 0, spese: 0 };
    }

    if (item.type === 'spesa') {
      catAnalysis[item.category].spese += item.amount;
    } else {
      catAnalysis[item.category].incassi += item.amount;
    }
  });

  const sortMode = document.getElementById('stats-sort')?.value || 'max';
  
  // Filtro differenze: mostra solo se ci sono entrate E uscite contemporanee
  let catKeys = Object.keys(catAnalysis).filter(cat => {
    if (currentStatType === 'spesa') return catAnalysis[cat].spese > 0;
    if (currentStatType === 'incasso') return catAnalysis[cat].incassi > 0;
    return (catAnalysis[cat].spese > 0 && catAnalysis[cat].incassi > 0);
  });

  if (sortMode === 'alpha') {
    catKeys.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
  } else if (sortMode === 'max') {
    catKeys.sort((a, b) => {
      const getVal = (cat) => {
        if (currentStatType === 'spesa') return catAnalysis[cat].spese;
        if (currentStatType === 'incasso') return catAnalysis[cat].incassi;
        return Math.abs(catAnalysis[cat].incassi - catAnalysis[cat].spese);
      };
      return getVal(b) - getVal(a);
    });
  } else if (sortMode === 'min') {
    catKeys.sort((a, b) => {
      const getVal = (cat) => {
        if (currentStatType === 'spesa') return catAnalysis[cat].spese;
        if (currentStatType === 'incasso') return catAnalysis[cat].incassi;
        return Math.abs(catAnalysis[cat].incassi - catAnalysis[cat].spese);
      };
      return getVal(a) - getVal(b);
    });
  }

  const catContainer = document.getElementById('category-analysis');

  if (catKeys.length === 0) {
    const emptyMsg = currentStatType === 'diff' 
      ? 'Nessuna categoria con entrate e uscite contemporanee nel periodo o conto selezionato'
      : 'Nessun movimento registrato nel periodo o conto selezionato';
    catContainer.innerHTML = `<div class="text-gray-400 text-center text-xs py-4">${emptyMsg}</div>`;
  } else {
    catContainer.innerHTML = catKeys.map(cat => {
      const inc = catAnalysis[cat].incassi;
      const spe = catAnalysis[cat].spese;
      const diff = inc - spe;

      if (currentStatType === 'diff') {
        const isPositive = diff >= 0;
        return `
          <div class="bg-gray-700/40 p-3 rounded-xl border border-gray-700/80 flex justify-between items-center">
            <div>
              <div class="font-bold text-sm text-gray-200">${cat}</div>
              <div class="text-[11px] text-gray-400">
                Entrate: ${formatCurrency(inc)} • Uscite: ${formatCurrency(-spe)}
              </div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-gray-400 uppercase font-semibold">Saldo Netto</div>
              <div class="font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                ${formatCurrency(diff)}
              </div>
            </div>
          </div>
        `;
      }

      const targetVal = currentStatType === 'spesa' ? spe : inc;
      return `
        <div class="bg-gray-700/40 p-3 rounded-xl border border-gray-700/80 flex justify-between items-center">
          <div>
            <div class="font-bold text-sm text-gray-200">${cat}</div>
            <div class="text-[11px] text-gray-400">
              ${currentStatType === 'spesa' ? `Incassi correlati: ${formatCurrency(inc)}` : `Spese correlate: ${formatCurrency(-spe)}`}
            </div>
          </div>
          <div class="font-black text-sm ${currentStatType === 'spesa' ? 'text-rose-400' : 'text-emerald-400'}">
            ${currentStatType === 'spesa' ? formatCurrency(-targetVal) : formatCurrency(targetVal)}
          </div>
        </div>
      `;
    }).join('');
  }

  const chartLabels = [];
  const chartData = [];
  catKeys.forEach(cat => {
    let val = 0;
    if (currentStatType === 'spesa') val = catAnalysis[cat].spese;
    else if (currentStatType === 'incasso') val = catAnalysis[cat].incassi;
    else val = catAnalysis[cat].incassi - catAnalysis[cat].spese;

    if (val !== 0) {
      chartLabels.push(cat);
      chartData.push(val);
    }
  });

  const ctx = document.getElementById('chart-categories').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  
  let chartColor = '#10b981';
  if (currentStatType === 'spesa') chartColor = '#f43f5e';
  else if (currentStatType === 'diff') chartColor = '#f59e0b';

  chartInstance = new Chart(ctx, {
    type: currentChartType,
    data: {
      labels: chartLabels,
      datasets: [{
        label: currentStatType === 'spesa' ? 'Spesa (€)' : (currentStatType === 'incasso' ? 'Incasso (€)' : 'Differenza (€)'),
        data: chartData,
        backgroundColor: currentChartType === 'bar' 
          ? chartColor 
          : ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#a855f7', '#64748b'],
        borderRadius: currentChartType === 'bar' ? 6 : 0
      }]
    },
    options: { 
      responsive: true,
      plugins: { 
        legend: { 
          display: currentChartType === 'doughnut',
          labels: { color: '#9ca3af', font: { size: 11 } } 
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
        x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#9ca3af', callback: (value) => formatCurrency(value) }, grid: { color: '#374151' } }
      } : {}
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

// --- Backup & Restore JSON con isolamento utente ---
function exportData() {
  if (!db) return;
  const transaction = db.transaction('transactions', 'readonly');
  const store = transaction.objectStore('transactions');
  
  store.getAll().onsuccess = (e) => {
    const backup = {
      version: 2,
      user: currentUser,
      exportDate: new Date().toISOString(),
      settings: userSettings,
      categories: categories,
      transactions: e.target.result
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `prima_nota_${currentUser}_${new Date().toISOString().slice(0,10)}.json`);
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

      if (confirm(`Ripristinare il backup per ${currentUser.toUpperCase()}? (${data.transactions.length} movimenti). I dati attuali verranno sovrascritti.`)) {
        if (data.settings) {
          userSettings = data.settings;
          localStorage.setItem(`settings_${currentUser}`, JSON.stringify(userSettings));
          loadUserSettings();
        }

        localStorage.setItem(`categories_${currentUser}`, JSON.stringify(data.categories));
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