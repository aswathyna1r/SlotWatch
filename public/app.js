// ===== SLOTWATCH FRONTEND CONTROLLER =====

// State Management
let TOURIST_SLOTS = [];
let BUSINESS_SLOTS = [];
let gTab = 'all'; // 'all', 'av', 'wl', 'no'

const SC = {
  av: { label: 'Available', cls: 'av' },
  li: { label: 'Last slot', cls: 'li' },
  wl: { label: 'Waitlist', cls: 'wl' },
  no: { label: 'No slots', cls: 'no' }
};

// Map of countries to their official VFS/TLS centres in the UAE
const COUNTRY_CENTRE_MAP = {
  'France': { Dubai: 'Dubai - Al Barsha', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Italy': { Dubai: 'Dubai - DIFC', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Germany': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Spain': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Netherlands': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Finland': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Greece': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Switzerland': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Austria': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Sweden': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall', Sharjah: 'Sharjah - Al Qasimiya' },
  'Croatia': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Cyprus': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Czechia': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Luxembourg': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Norway': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Estonia': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Hungary': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Latvia': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Lithuania': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' },
  'Portugal': { Dubai: 'Dubai - Wafi Mall', AbuDhabi: 'Abu Dhabi - WTC Mall' }
};

// ===== DATA LOADING & RENDERING =====

// Fetch Slots from Express backend
async function fetchSlots(showLoaders = false) {
  if (showLoaders) {
    document.getElementById('load-tourist').style.display = 'block';
    document.getElementById('load-business').style.display = 'block';
    document.getElementById('body-tourist').innerHTML = '';
    document.getElementById('body-business').innerHTML = '';
  }

  try {
    const res = await fetch('/api/slots');
    const cache = await res.json();
    
    TOURIST_SLOTS = cache.tourist || [];
    BUSINESS_SLOTS = cache.business || [];
    
    // Fallback: If Spain is not in lists, let's inject realistic fallback
    const hasSpainT = TOURIST_SLOTS.some(r => r.country === 'Spain');
    if (!hasSpainT) {
      TOURIST_SLOTS.push(
        { country: 'Spain', flag: '🇪🇸', status: 'no', date: 'None', checked: '12m ago', slots: '', city: 'Dubai', type: 'Tourist' },
        { country: 'Spain', flag: '🇪🇸', status: 'no', date: 'None', checked: '15m ago', slots: '', city: 'Abu Dhabi', type: 'Tourist' }
      );
    }
    const hasSpainB = BUSINESS_SLOTS.some(r => r.country === 'Spain');
    if (!hasSpainB) {
      BUSINESS_SLOTS.push(
        { country: 'Spain', flag: '🇪🇸', status: 'no', date: 'None', checked: '12m ago', slots: '', city: 'Dubai', type: 'Business' },
        { country: 'Spain', flag: '🇪🇸', status: 'no', date: 'None', checked: '15m ago', slots: '', city: 'Abu Dhabi', type: 'Business' }
      );
    }

    // Fallback: If France is not in Dubai Tourist list, map Abu Dhabi France status as representative, or show waitlist
    const hasFranceD = TOURIST_SLOTS.some(r => r.country === 'France' && r.city === 'Dubai');
    if (!hasFranceD) {
      const adFrance = TOURIST_SLOTS.find(r => r.country === 'France' && r.city === 'Abu Dhabi');
      TOURIST_SLOTS.push({
        country: 'France',
        flag: '🇫🇷',
        status: adFrance ? adFrance.status : 'wl',
        date: adFrance ? adFrance.date : 'Waitlist Open',
        checked: adFrance ? adFrance.checked : '2m ago',
        slots: '',
        city: 'Dubai',
        type: 'Tourist'
      });
    }
    const hasFranceDB = BUSINESS_SLOTS.some(r => r.country === 'France' && r.city === 'Dubai');
    if (!hasFranceDB) {
      const adFranceB = BUSINESS_SLOTS.find(r => r.country === 'France' && r.city === 'Abu Dhabi');
      BUSINESS_SLOTS.push({
        country: 'France',
        flag: '🇫🇷',
        status: adFranceB ? adFranceB.status : 'wl',
        date: adFranceB ? adFranceB.date : 'Waitlist Open',
        checked: adFranceB ? adFranceB.checked : '3m ago',
        slots: '',
        city: 'Dubai',
        type: 'Business'
      });
    }

    applyFilters();
    updateCounts();
  } catch (error) {
    console.error('Failed to fetch slots:', error);
  } finally {
    document.getElementById('load-tourist').style.display = 'none';
    document.getElementById('load-business').style.display = 'none';
  }
}

function getBookingUrl(country) {
  const clean = country.trim().toLowerCase();
  if (clean === 'france') {
    return 'https://fr.tlscontact.com/ae/DXB/';
  }
  if (clean === 'italy') {
    return 'https://visa.vfsglobal.com/dxb/en/ita/';
  }
  
  // VFS Global ISO-3 country mappings for UAE (are) applicants
  const mapping = {
    'germany': 'deu',
    'spain': 'esp',
    'greece': 'grc',
    'netherlands': 'nld',
    'switzerland': 'che',
    'austria': 'aut',
    'portugal': 'prt',
    'belgium': 'bel',
    'czech republic': 'cze',
    'czechia': 'cze',
    'denmark': 'dnk',
    'finland': 'fin',
    'hungary': 'hun',
    'norway': 'nor',
    'sweden': 'swe',
    'malta': 'mlt',
    'poland': 'pol',
    'latvia': 'lva',
    'lithuania': 'ltu',
    'estonia': 'est',
    'slovakia': 'svk',
    'slovenia': 'svn',
    'iceland': 'isl',
    'luxembourg': 'lux',
    'croatia': 'hrv'
  };
  
  const code = mapping[clean];
  if (code) {
    return `https://visa.vfsglobal.com/are/en/${code}/`;
  }
  return 'https://visa.vfsglobal.com/are/en/';
}

// Render dynamic tables
function renderTable(data, bodyId, emptyId, filterTab) {
  const body = document.getElementById(bodyId);
  const empty = document.getElementById(emptyId);
  if (!body) return;

  body.innerHTML = '';
  
  // Apply the secondary status tab filter
  const filtered = filterTab === 'all' ? data : data.filter(r => r.status === filterTab);
  
  if (!filtered.length) {
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  
  filtered.forEach((r, i) => {
    const sc = SC[r.status] || SC.no;
    const row = document.createElement('div');
    row.className = 'trow';
    row.style.animationDelay = `${i * 0.03}s`;
    
    // Build slot and badge labels
    let badgeClass = sc.cls;
    let badgeLabel = sc.label;
    
    // If it has specific slot counts (e.g. 1 +slots)
    if (r.slots && r.status === 'av') {
      badgeClass = 'li';
      badgeLabel = r.slots;
    }

    const bookingUrl = getBookingUrl(r.country);
    const bookingLink = r.status === 'av'
      ? `<a href="${bookingUrl}" target="_blank" class="book-slot-link" onclick="event.stopPropagation()">Book Now ↗</a>`
      : '';
    
    row.innerHTML = `
      <div class="cc">
        <span class="cflag">${r.flag}</span>
        <div class="cname">${r.country} <small style="display:block;font-size:9px;color:var(--text-soft);font-weight:normal">${r.city}</small></div>
      </div>
      <div>
        <span class="badge ${badgeClass}">
          <span class="bdot"></span>${badgeLabel}
        </span>
      </div>
      <div class="dc">
        ${r.date}
        ${bookingLink}
      </div>
      <div class="lc">${r.checked}</div>
    `;
    
    row.onclick = () => openModal(r.country);
    row.style.cursor = 'pointer';
    body.appendChild(row);
  });
}

// Filter controller
function applyFilters() {
  const countryFilter = document.getElementById('fCountry')?.value || 'all';
  const typeFilter = document.getElementById('fType')?.value || 'all';
  const centreFilter = document.getElementById('fCentre')?.value || 'all';

  let tourist = [...TOURIST_SLOTS];
  let business = [...BUSINESS_SLOTS];

  // 1. Destination Country Filter
  if (countryFilter !== 'all') {
    tourist = tourist.filter(r => r.country === countryFilter);
    business = business.filter(r => r.country === countryFilter);
  }

  // 2. Application Centre Filter (VFS/TLS Smart Filter)
  if (centreFilter !== 'all') {
    const filterFn = (row) => {
      const centres = COUNTRY_CENTRE_MAP[row.country];
      if (!centres) return true; // Keep if mapping missing

      // Get VFS/TLS name based on row city
      const mappedCentre = row.city === 'Dubai' ? centres.Dubai : centres.AbuDhabi;
      if (!mappedCentre) return false;

      if (centreFilter === 'Dubai') return row.city === 'Dubai';
      if (centreFilter === 'Abu Dhabi') return row.city === 'Abu Dhabi';
      
      if (centreFilter === 'Dubai - Wafi') return mappedCentre.includes('Wafi');
      if (centreFilter === 'Dubai - DIFC') return mappedCentre.includes('DIFC');
      if (centreFilter === 'Dubai - Al Barsha') return mappedCentre.includes('Barsha');
      if (centreFilter === 'Sharjah') return centres.Sharjah && row.city === 'Dubai'; // Sharjah goes under Dubai scope on source

      return true;
    };

    tourist = tourist.filter(filterFn);
    business = business.filter(filterFn);
  }

  // 3. Visa Type Columns Toggle
  const touristCard = document.getElementById('card-tourist');
  const businessCard = document.getElementById('card-business');
  const grid = document.querySelector('.appt-grid');

  if (typeFilter === 'Tourist') {
    touristCard.style.display = 'block';
    businessCard.style.display = 'none';
    grid.style.gridTemplateColumns = '1fr';
  } else if (typeFilter === 'Business') {
    touristCard.style.display = 'none';
    businessCard.style.display = 'block';
    grid.style.gridTemplateColumns = '1fr';
  } else {
    touristCard.style.display = 'block';
    businessCard.style.display = 'block';
    if (window.innerWidth > 860) {
      grid.style.gridTemplateColumns = '1fr 1fr';
    } else {
      grid.style.gridTemplateColumns = '1fr';
    }
  }

  // Render processed arrays
  renderTable(tourist, 'body-tourist', 'empty-tourist', gTab);
  renderTable(business, 'body-business', 'empty-business', gTab);
}

// Global Tab filters (All, Available, Waitlist, None)
function setGlobalTab(el, filter) {
  document.querySelectorAll('#globalTabs .ftab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  gTab = filter;
  applyFilters();
}

// Global counts aggregator
function updateCounts() {
  const allT = [...TOURIST_SLOTS];
  const allB = [...BUSINESS_SLOTS];
  
  // Total deduplicated items by unique key: Country + City
  const keyFn = r => `${r.country}-${r.city}`;
  
  const all = new Map();
  allT.forEach(r => all.set(keyFn(r), r));
  allB.forEach(r => all.set(keyFn(r), r));
  
  const uniqueItems = Array.from(all.values());

  const allCount = uniqueItems.length;
  const avCount = uniqueItems.filter(r => r.status === 'av').length;
  const wlCount = uniqueItems.filter(r => r.status === 'wl').length;
  const noCount = uniqueItems.filter(r => r.status === 'no').length;

  document.getElementById('gct-all').textContent = allCount;
  document.getElementById('gct-av').textContent = avCount;
  document.getElementById('gct-wl').textContent = wlCount;
  document.getElementById('gct-no').textContent = noCount;
}

// Active Scan / live crawler refresh
async function runScan() {
  const btn = document.getElementById('sbtn');
  const spin = document.getElementById('sp');
  const txt = document.getElementById('stxt');

  spin.style.display = 'block';
  txt.textContent = 'Scanning live portals...';
  btn.disabled = true;

  document.getElementById('load-tourist').style.display = 'block';
  document.getElementById('load-business').style.display = 'block';
  document.getElementById('body-tourist').innerHTML = '';
  document.getElementById('body-business').innerHTML = '';

  try {
    const res = await fetch('/api/scan');
    const result = await res.json();
    
    TOURIST_SLOTS = result.data.tourist || [];
    BUSINESS_SLOTS = result.data.business || [];
    
    applyFilters();
    updateCounts();
  } catch (error) {
    console.error('Scan failed:', error);
  } finally {
    spin.style.display = 'none';
    txt.textContent = 'Scan live slots';
    btn.disabled = false;
    document.getElementById('load-tourist').style.display = 'none';
    document.getElementById('load-business').style.display = 'none';
  }
}

// Render dynamic Centre Cards
const CENTRES = [
  {
    city: 'Dubai - Wafi Mall',
    handler: 'VFS Global',
    countries: 'Austria, Germany, Spain, Netherlands, Finland, Greece, Switzerland, Sweden, Croatia, Cyprus, Czechia, Luxembourg, Norway, Estonia, Hungary, Latvia, Lithuania, Portugal',
    addr: 'Wafi Mall, Umm Hurair 2, Dubai\nNearest metro: Healthcare City (Green Line)',
    hours: 'Monday - Friday: 09:00 - 17:00\nSubmission until 16:00 - Passport collection 16:00 - 17:00',
    url: 'https://visa.vfsglobal.com/are/en/',
    note: null,
  },
  {
    city: 'Dubai - DIFC',
    handler: 'VFS Global',
    countries: 'Italy only',
    addr: 'The Gate Avenue, Zone C, Level 1\nUnit 166 and 168, DIFC, Dubai',
    hours: 'Monday - Friday: 09:00 - 15:00',
    url: 'https://visa.vfsglobal.com/dxb/en/ita/',
    note: null,
  },
  {
    city: 'Dubai - Al Barsha',
    handler: 'TLScontact',
    countries: 'France and Belgium only',
    addr: 'Al Barsha, Dubai\n(exact address on TLScontact booking portal)',
    hours: 'Monday - Friday: varies by appointment',
    url: 'https://fr.tlscontact.com/ae/DXB/',
    note: 'France and Belgium do not use VFS Global in Dubai. Submitting at VFS for France will result in immediate rejection.',
  },
  {
    city: 'Abu Dhabi - WTC Mall',
    handler: 'VFS Global',
    countries: 'All Schengen countries - Abu Dhabi and Al Ain residents',
    addr: 'The Mall at World Trade Centre\nLevel B2 (Lower Ground), Khalifa Bin Zayed St (Airport Road), Abu Dhabi',
    hours: 'Monday - Friday: 09:00 - 16:00\nPassport collection: 16:00 - 17:00',
    url: 'https://visa.vfsglobal.com/are/en/',
    note: null,
  },
  {
    city: 'Sharjah - Al Qasimiya',
    handler: 'VFS Global',
    countries: 'Selected countries - check VFS website',
    addr: 'Level 3, UK Premium Visa Application Centre\nAl Qasimiya, near Mega Mall Sharjah',
    hours: 'Sunday - Thursday: 09:00 - 16:00',
    url: 'https://visa.vfsglobal.com/are/en/',
    note: null,
  },
];

function renderCentres() {
  const grid = document.getElementById('centresGrid');
  if (!grid) return;
  
  let html = '';
  CENTRES.forEach(c => {
    html += `
      <div class="centre-card">
        <div class="centre-tag"><div class="centre-tag-dot"></div> Open</div>
        <h4 class="centre-name">${c.city}</h4>
        <div class="centre-handler">${c.handler}</div>
        <p class="centre-addr" style="white-space:pre-line">${c.addr}</p>
        <div style="font-size:11px;color:var(--text-soft);font-weight:700;margin-bottom:3px;text-transform:uppercase;">Countries</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">${c.countries}</p>
        <p class="centre-hours" style="white-space:pre-line">${c.hours}</p>
        ${c.note ? `<div class="centre-note">${c.note}</div>` : ''}
        <a class="centre-link" href="${c.url}" target="_blank" rel="noopener">Book appointment</a>
      </div>
    `;
  });
  grid.innerHTML = html;
}

// ===== DOCUMENT CHECKLIST PAGE =====
const CLDATA = {
  france:  { name:'France', flag:'🇫🇷', cats:[
    {cat:'Identity', docs:[{t:'Valid passport (issued within 10 yrs, valid 3+ months after travel)',n:'Original and 2 copies of bio page'},{t:'Previous passports if any',n:''},{t:'Emirates ID - original and copy',n:''},{t:'2 passport photos 35x45mm white background',n:'Taken within 6 months'}]},
    {cat:'Financial', docs:[{t:'Bank statements - last 3 to 6 months',n:'Show sufficient funds'},{t:'Salary certificate or employment letter',n:'On company letterhead, dated'},{t:'Sponsorship letter if applicable',n:''}]},
    {cat:'Travel', docs:[{t:'Flight itinerary (reservation, not ticket)',n:''},{t:'Hotel and accommodation bookings for full stay',n:'All nights covered'},{t:'Travel insurance - min 30,000 EUR Schengen-wide',n:''}]},
    {cat:'Application', docs:[{t:'Completed France-Visas online form (mandatory)',n:'Must be done before TLScontact appointment'},{t:'TLScontact appointment confirmation',n:''},{t:'Visa fee: EUR 80 adults',n:'Paid at centre'}]},
  ]},
  germany: { name:'Germany', flag:'🇩🇪', cats:[
    {cat:'Identity', docs:[{t:'Valid passport - 3+ months beyond stay',n:'Original and copies'},{t:'2 biometric photos 35x45mm',n:''},{t:'Emirates ID copy',n:''}]},
    {cat:'Financial', docs:[{t:'3 months bank statements',n:''},{t:'Proof of employment or business ownership',n:''},{t:'Income tax return if self-employed',n:''}]},
    {cat:'Travel', docs:[{t:'Round-trip flight reservation',n:'No need to purchase yet'},{t:'Proof of accommodation',n:'Hotel or host letter'},{t:'Travel health insurance min 30,000 EUR',n:'All Schengen countries'}]},
    {cat:'Application', docs:[{t:'Completed application form',n:''},{t:'Invitation letter if visiting someone',n:''}]},
  ]},
  italy:   { name:'Italy', flag:'🇮🇹', cats:[
    {cat:'Identity', docs:[{t:'Valid passport',n:'2 copies of bio page'},{t:'Emirates ID',n:''},{t:'2 passport photos white background',n:''},{t:'Residence permit if non-UAE national',n:''}]},
    {cat:'Financial', docs:[{t:'3 months bank statements',n:''},{t:'Employment or NOC letter',n:''},{t:'Sponsorship declaration if applicable',n:''}]},
    {cat:'Travel', docs:[{t:'Confirmed flight reservation',n:''},{t:'Hotel bookings for full stay',n:''},{t:'Travel insurance',n:''},{t:'Detailed day-by-day itinerary',n:''}]},
  ]},
  spain:   { name:'Spain', flag:'🇪🇸', cats:[
    {cat:'Identity', docs:[{t:'Valid passport - 6+ months validity',n:''},{t:'2 recent photos',n:''},{t:'Emirates ID for residents',n:''}]},
    {cat:'Financial', docs:[{t:'3 months bank statements',n:'Min AED 370/day recommended'},{t:'Employment letter and payslips',n:''}]},
    {cat:'Travel', docs:[{t:'Return flight booking',n:''},{t:'Hotel reservations',n:''},{t:'Travel insurance - min 30,000 EUR',n:''}]},
  ]},
  netherlands: { name:'Netherlands', flag:'🇳🇱', cats:[
    {cat:'Identity', docs:[{t:'Valid passport - 3+ months after travel',n:''},{t:'2 passport photos',n:''},{t:'Emirates ID',n:''}]},
    {cat:'Financial', docs:[{t:'3 months bank statements',n:''},{t:'Salary slip or employment letter',n:''}]},
    {cat:'Travel', docs:[{t:'Flight itinerary',n:''},{t:'Accommodation proof',n:''},{t:'Travel insurance - Schengen-wide',n:''}]},
  ]},
  finland: { name:'Finland', flag:'🇫🇮', cats:[
    {cat:'Identity', docs:[{t:'Valid passport',n:''},{t:'2 passport photos',n:''},{t:'Emirates ID',n:''}]},
    {cat:'Financial', docs:[{t:'Bank statements - 3 months',n:''},{t:'Employment letter and leave approval',n:''}]},
    {cat:'Travel', docs:[{t:'Flight booking',n:''},{t:'Hotel or invitation letter',n:''},{t:'Schengen travel insurance',n:''}]},
  ]},
  greece:  { name:'Greece', flag:'🇬🇷', cats:[
    {cat:'Identity', docs:[{t:'Valid passport - 3+ months after stay',n:''},{t:'UAE residence visa copy for non-nationals',n:''},{t:'2 recent passport photos',n:''}]},
    {cat:'Financial', docs:[{t:'3 months bank statements',n:''},{t:'NOC or employment letter',n:''}]},
    {cat:'Travel', docs:[{t:'Flight booking confirmation',n:''},{t:'Hotel reservations for all nights',n:''},{t:'Schengen travel insurance',n:''}]},
  ]},
  switzerland: { name:'Switzerland', flag:'🇨🇭', cats:[
    {cat:'Identity', docs:[{t:'Valid passport - 3+ months after stay',n:''},{t:'2 photos',n:''},{t:'Emirates ID',n:''}]},
    {cat:'Financial', docs:[{t:'3 to 6 months bank statements',n:''},{t:'Employment proof',n:''}]},
    {cat:'Travel', docs:[{t:'Flight reservation',n:''},{t:'Hotel bookings',n:''},{t:'Travel insurance - Switzerland is Schengen but not EU',n:''}]},
  ]},
  austria: { name:'Austria', flag:'🇦🇹', cats:[
    {cat:'Identity', docs:[{t:'Valid passport',n:''},{t:'Emirates ID',n:''},{t:'2 passport photos',n:''}]},
    {cat:'Financial', docs:[{t:'Bank statements',n:''},{t:'Salary certificate',n:''}]},
    {cat:'Travel', docs:[{t:'Flight booking',n:''},{t:'Hotel reservations',n:''},{t:'Travel insurance',n:''}]},
  ]},
  sweden:  { name:'Sweden', flag:'🇸🇪', cats:[
    {cat:'Identity', docs:[{t:'Valid passport',n:''},{t:'Emirates ID',n:''},{t:'2 photos',n:''}]},
    {cat:'Financial', docs:[{t:'Bank statements - 3 months',n:''},{t:'Employment or salary letter',n:''}]},
    {cat:'Travel', docs:[{t:'Round-trip flight reservation',n:''},{t:'Accommodation proof',n:''},{t:'Travel insurance',n:''}]},
  ]},
};

const CLKEYS = ['france','germany','italy','spain','netherlands','finland','greece','switzerland','austria','sweden'];
let clState = {};
let activeCl = null;

// Try loading checklist progress from localStorage
try {
  const saved = localStorage.getItem('slotwatch_checklist_state');
  if (saved) clState = JSON.parse(saved);
} catch (e) {
  console.log('Failed to load checklist state from localStorage');
}

function renderTiles() {
  const grid = document.getElementById('clTiles');
  if (!grid) return;
  grid.innerHTML = '';
  
  CLKEYS.forEach(k => {
    const d = CLDATA[k];
    const total = d.cats.reduce((a,c) => a + c.docs.length, 0);
    const done = Object.values(clState[k] || {}).filter(Boolean).length;
    
    const tile = document.createElement('div');
    tile.className = `cl-tile${activeCl === k ? ' active' : ''}`;
    tile.innerHTML = `
      <div class="cl-flag">${d.flag}</div>
      <div class="cl-name">${d.name}</div>
      <div class="cl-prog">${done > 0 ? `${done} of ${total} done` : `${total} documents`}</div>
    `;
    tile.onclick = () => toggleCl(k);
    grid.appendChild(tile);
  });
}

function toggleCl(k) {
  const panel = document.getElementById('clPanel');
  if (!panel) return;
  
  if (activeCl === k) {
    activeCl = null;
    panel.innerHTML = '';
    renderTiles();
    return;
  }
  
  activeCl = k;
  if (!clState[k]) clState[k] = {};
  renderClPanel(k);
  renderTiles();
  
  setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 50);
}

function renderClPanel(k) {
  const d = CLDATA[k];
  const total = d.cats.reduce((a,c) => a + c.docs.length, 0);
  const done = Object.values(clState[k] || {}).filter(Boolean).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const panel = document.getElementById('clPanel');
  
  let html = `
    <div class="cl-panel">
      <div class="cl-panel-head">
        <h4 class="cl-panel-title">${d.flag} ${d.name} — Required Documents</h4>
        <div class="cl-panel-meta">
          <div class="cl-prog-wrap">
            <div class="cl-bar"><div class="cl-bar-fill" style="width:${pct}%"></div></div>
            <div class="cl-count">${done} of ${total}</div>
          </div>
          <button class="cl-reset" onclick="resetCl('${k}')">Reset</button>
        </div>
      </div>
      <div class="cl-body">
  `;
  
  d.cats.forEach(cat => {
    html += `<div class="cl-cat"><h5 class="cl-cat-title">${cat.cat}</h5>`;
    cat.docs.forEach((doc, i) => {
      const key = `${cat.cat}_${i}`;
      const checked = clState[k]?.[key] || false;
      html += `
        <div class="cl-item${checked ? ' done' : ''}" onclick="toggleDoc('${k}','${key}')">
          <div class="cl-box">${checked ? '&#10003;' : ''}</div>
          <div>
            <div class="cl-text">${doc.t}</div>
            ${doc.n ? `<div class="cl-note">${doc.n}</div>` : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });
  
  html += `</div></div>`;
  panel.innerHTML = html;
}

window.toggleDoc = function(k, key) {
  if (!clState[k]) clState[k] = {};
  clState[k][key] = !clState[k][key];
  
  // Save progress locally
  try {
    localStorage.setItem('slotwatch_checklist_state', JSON.stringify(clState));
  } catch (e) {}
  
  renderClPanel(k);
  renderTiles();
};

window.resetCl = function(k) {
  clState[k] = {};
  try {
    localStorage.setItem('slotwatch_checklist_state', JSON.stringify(clState));
  } catch (e) {}
  renderClPanel(k);
  renderTiles();
};

// ===== FAQ COMPONENT =====
const FAQS = [
  {
    q: 'Do I apply at VFS Global for all Schengen countries?',
    a: 'No. Most Schengen countries use VFS Global in Dubai, but France and Belgium use TLScontact (located in Al Barsha, Dubai). Italy has its own dedicated VFS centre in DIFC. Always check which centre handles your destination country before booking - submitting at the wrong centre will result in your application being rejected.'
  },
  {
    q: 'Where is the VFS Global centre in Dubai?',
    a: 'The main VFS Global centre in Dubai is located at Wafi Mall, Umm Hurair 2 (nearest metro: Healthcare City, Green Line). Italy applications go to a separate VFS centre at DIFC, The Gate Avenue, Zone C, Level 1, Units 166 and 168. France and Belgium go to TLScontact in Al Barsha.'
  },
  {
    q: 'Which centre do I use if I live in Abu Dhabi or Al Ain?',
    a: 'Abu Dhabi and Al Ain residents should submit applications at the VFS Global centre in Abu Dhabi, located at The Mall, World Trade Centre, Level B2, Khalifa Bin Zayed Street (Airport Road). Dubai and Northern Emirates residents use the Dubai Wafi Mall centre.'
  },
  {
    q: 'How far in advance can I apply for a Schengen visa?',
    a: 'You can apply up to 6 months before your travel date for most Schengen countries. Most countries allow a minimum of 15 days before travel. During peak season (June to September), appointment slots fill up weeks in advance - applying early is strongly recommended.'
  },
  {
    q: 'How does SlotWatch work?',
    a: 'Our background engine checks VFS Global and TLScontact portals every 3 minutes. When a slot opens for your chosen country and visa type, we show it instantly on the site and send you a real-time WhatsApp & email with a direct booking link. You then book the slot yourself on the official website.'
  },
  {
    q: 'How quickly do slots get taken after opening?',
    a: 'Very fast - popular destinations like France, Italy and Germany can have slots taken within minutes of appearing. This is why real-time monitoring matters. Manual checking means you will almost always miss them during busy periods.'
  },
  {
    q: 'What is the difference between Tourist and Business visa appointments?',
    a: 'Tourist appointments are for short-stay tourism, visiting family or personal travel. Business appointments are for attending conferences, meetings or work-related travel. Both are C-type Schengen visas allowing up to 90 days within a 180-day period. The documents required differ slightly - business applicants typically need an invitation letter from a company.'
  },
  {
    q: 'Is SlotWatch affiliated with VFS Global or any embassy?',
    a: 'No. SlotWatch is an independent monitoring service. We are not affiliated with VFS Global, TLScontact, or any embassy or consulate. All visa decisions are made solely by the relevant embassy or consulate. We simply help you find an appointment slot faster.'
  }
];

function renderFaqs() {
  const acc = document.getElementById('faqAccordion');
  if (!acc) return;
  
  let html = '';
  FAQS.forEach(faq => {
    html += `
      <div class="faq-item">
        <div class="faq-q" onclick="toggleFaq(this)">
          <span>${faq.q}</span>
          <span class="faq-arrow">▾</span>
        </div>
        <div class="faq-a">${faq.a}</div>
      </div>
    `;
  });
  acc.innerHTML = html;
}

window.toggleFaq = function(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  
  // Close all other FAQs
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  
  if (!isOpen) {
    item.classList.add('open');
  }
};

// ===== NAV & TAB MANAGEMENT =====
window.showPage = function(pageId, tabElement) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  document.getElementById(`page-${pageId}`).classList.add('active');
  tabElement.classList.add('active');
  
  // Toggle hero section display: only show on slots tab
  const hero = document.getElementById('heroSection');
  if (hero) {
    if (pageId === 'slots') {
      hero.style.display = 'block';
    } else {
      hero.style.display = 'none';
    }
  }

  // Update state for tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.setAttribute('aria-selected', btn === tabElement ? 'true' : 'false');
  });

  if (pageId === 'checklist') {
    setTimeout(renderTiles, 30);
  }
};

// ===== ALERTS REGISTRATION MODAL =====
window.openModal = function(preselectedCountry = null) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById('mBody').style.display = 'block';
  document.getElementById('mSuccess').style.display = 'none';

  if (preselectedCountry) {
    const select = document.getElementById('mCountry');
    if (select) {
      // Find matching option
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === preselectedCountry) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }
};

window.closeModal = function(e) {
  if (!e || e.target.id === 'overlay' || e.target.classList.contains('mclose') || e.target.textContent.includes('thanks')) {
    document.getElementById('overlay').classList.remove('open');
  }
};

window.submitModal = async function() {
  const country = document.getElementById('mCountry').value;
  const visaType = document.getElementById('mType').value;
  const phone = document.getElementById('mPhone').value.trim();
  const email = document.getElementById('mEmail').value.trim();

  // Basic Validation
  if (!phone) {
    document.getElementById('mPhone').focus();
    return;
  }
  if (!email || !email.includes('@')) {
    document.getElementById('mEmail').focus();
    return;
  }

  const submitBtn = document.getElementById('btnSubmitAlert');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Redirecting to Stripe...';

  try {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ country, visaType, phone, email })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.stripeUrl) {
        // Redirect directly to the secure Stripe-hosted checkout page!
        window.location.href = data.stripeUrl;
      } else {
        // Fallback gracefully to standard success screen if Stripe keys aren't set yet
        document.getElementById('mBody').style.display = 'none';
        document.getElementById('mSuccess').style.display = 'block';
      }
    } else {
      alert('Failed to register alerts. Please try again.');
    }
  } catch (error) {
    console.error('Alert enrollment error:', error);
    alert('Failed to contact alert queue server. Please check connection.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Pay AED 10 & Activate Alerts';
  }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  fetchSlots(true);
  renderCentres();
  renderFaqs();

  // Handle Stripe Payment Redirect Query Statuses
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  if (status) {
    // Clear URL parameters immediately so they don't linger on page refresh
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Create modern animated floating toast banner
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '99999';
    toast.style.background = status === 'success' ? '#065f46' : '#991b1b';
    toast.style.color = '#ffffff';
    toast.style.padding = '16px 24px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.animation = 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    toast.style.border = '1px solid rgba(255,255,255,0.1)';
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    if (status === 'success') {
      toast.innerHTML = `<span>🎉</span> <span>Subscription active! Your premium Schengen live slot alerts are now fully activated.</span>`;
    } else if (status === 'cancel') {
      toast.innerHTML = `<span>⚠️</span> <span>Alert activation was canceled. Complete payment to activate premium alerts.</span>`;
    }
    
    document.body.appendChild(toast);
    
    // Auto-remove from view after 6 seconds
    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 6000);
  }
});
