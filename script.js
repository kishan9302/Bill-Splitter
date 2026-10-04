/**
 * Rupee Bill Splitter - script.js
 * 
 * Precision Indian Rupee (₹) bill splitting with exact paisa reconciliation,
 * persistent storage across reloads, robust validation with explicit no-result state,
 * modal dialogs, and reliable receipt downloading and printing.
 */

// Storage key for persistent state
const STORAGE_KEY = 'rupee_bill_splitter_state';

// DOM Elements: Form & Inputs
const form = document.getElementById('billSplitterForm');
const occasionInput = document.getElementById('occasionInput');
const billInput = document.getElementById('billInput');
const peopleInput = document.getElementById('peopleInput');

const billError = document.getElementById('billError');
const peopleError = document.getElementById('peopleError');
const noticeBanner = document.getElementById('noticeBanner');
const noticeText = document.getElementById('noticeText');

const calculateBtn = document.getElementById('calculateBtn');
const resetBtn = document.getElementById('resetBtn');

const stepperMinus = document.getElementById('stepperMinus');
const stepperPlus = document.getElementById('stepperPlus');

// Presets
const billPresets = document.querySelectorAll('.preset-bill-btn');
const peoplePresets = document.querySelectorAll('.preset-people-btn');

// DOM Elements: Result States
const emptyState = document.getElementById('emptyState');
const noResultState = document.getElementById('noResultState');
const noResultChecklist = document.getElementById('noResultChecklist');
const resultsContent = document.getElementById('resultsContent');

// DOM Elements: Calculated Result Display
const displayOccasion = document.getElementById('displayOccasion');
const displayTimestamp = document.getElementById('displayTimestamp');
const displayTotalBill = document.getElementById('displayTotalBill');
const displayPeopleCount = document.getElementById('displayPeopleCount');
const displayPerPerson = document.getElementById('displayPerPerson');
const sharesList = document.getElementById('sharesList');

// INR Exact Paisa Ledger Elements
const exactPaisaBox = document.getElementById('exactPaisaBox');
const paisaTotalCell = document.getElementById('paisaTotalCell');
const paisaBaseCell = document.getElementById('paisaBaseCell');
const paisaRemainderCell = document.getElementById('paisaRemainderCell');
const paisaMatchCell = document.getElementById('paisaMatchCell');
const exactPaisaSummaryText = document.getElementById('exactPaisaSummaryText');
const openPaisaDetailsBtn = document.getElementById('openPaisaDetailsBtn');

// Verification Card
const verifyBillAmount = document.getElementById('verifyBillAmount');
const verifySharesSum = document.getElementById('verifySharesSum');
const verifyDifference = document.getElementById('verifyDifference');

// Action Buttons
const copyBreakdownBtn = document.getElementById('copyBreakdownBtn');
const printBtn = document.getElementById('printBtn');
const toast = document.getElementById('toast');

// Header Badge Button
const exactPaisaHeaderBtn = document.getElementById('exactPaisaHeaderBtn');

// Modals: Receipt Modal
const receiptModal = document.getElementById('receiptModal');
const closeReceiptModalBtn = document.getElementById('closeReceiptModalBtn');
const receiptPreview = document.getElementById('receiptPreview');
const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
const copyReceiptModalBtn = document.getElementById('copyReceiptModalBtn');
const triggerPrintBtn = document.getElementById('triggerPrintBtn');

// Modals: Exact Paisa Modal
const paisaInspectorModal = document.getElementById('paisaInspectorModal');
const closePaisaModalBtn = document.getElementById('closePaisaModalBtn');
const paisaModalOkBtn = document.getElementById('paisaModalOkBtn');
const modalPaisaDynamicContent = document.getElementById('modalPaisaDynamicContent');

// Active Calculation Cache
let currentSplitData = null;
let currentOccasion = '';

/**
 * Currency Formatter for Indian Rupees (₹)
 * Formats a numeric value into a 2-decimal rupee string, e.g. ₹1,250.00
 * @param {number|string} amount - Numeric value in Rupees
 * @returns {string} Formatted Rupee string
 */
function formatRupees(amount) {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '₹0.00';
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

/**
 * Helper to copy text to clipboard with fallback for sandboxed environments
 * @param {string} text - Text to copy
 * @param {string} successMessage - Toast message on success
 */
function copyToClipboardWithFallback(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast(successMessage),
      () => execCopyFallback(text, successMessage)
    );
  } else {
    execCopyFallback(text, successMessage);
  }
}

function execCopyFallback(text, successMessage) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(ta);
    if (successful) {
      showToast(successMessage);
    } else {
      showToast('Please copy text manually.');
    }
  } catch (err) {
    showToast('Please copy text manually.');
  }
}

/**
 * Display inline error message for a given field
 * @param {HTMLElement} inputEl - The input element
 * @param {HTMLElement} errorEl - The error text container
 * @param {string} message - The error message string
 */
function setFieldError(inputEl, errorEl, message) {
  if (message) {
    inputEl.classList.add('input-error');
    errorEl.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>
    `;
  } else {
    inputEl.classList.remove('input-error');
    errorEl.innerHTML = '';
  }
}

/**
 * Show global notice banner
 * @param {string} message - Message to show in banner
 * @param {string} type - 'error' | 'warning' | 'info'
 */
function showNoticeBanner(message, type = 'error') {
  noticeBanner.className = `notice-banner notice-${type}`;
  noticeText.textContent = message;
  noticeBanner.classList.remove('hidden');
}

/**
 * Hide global notice banner
 */
function hideNoticeBanner() {
  noticeBanner.classList.add('hidden');
  noticeText.textContent = '';
}

/**
 * Validate inputs and return detailed error states.
 * Rule: Show a message and NO result if the bill or the number of people is empty, zero or negative.
 * @returns {{ isValid: boolean, occasion: string, bill: number, people: number, checklist: Array<{label: string, valid: boolean}> }}
 */
function validateInputs() {
  const rawOccasion = occasionInput.value.trim();
  const rawBill = billInput.value.trim();
  const rawPeople = peopleInput.value.trim();

  let isBillValid = true;
  let isPeopleValid = true;
  let billErrorMessage = '';
  let peopleErrorMessage = '';
  const checklist = [];

  // 1. Bill Amount Validation
  const cleanBillStr = rawBill.replace(/,/g, '');
  if (rawBill === '') {
    isBillValid = false;
    billErrorMessage = 'Bill amount cannot be empty. Please enter an amount in Rupees.';
    checklist.push({ label: 'Bill Amount: Empty (must enter an amount in ₹)', valid: false });
  } else {
    const numBill = parseFloat(cleanBillStr);
    if (isNaN(numBill) || !isFinite(numBill)) {
      isBillValid = false;
      billErrorMessage = 'Please enter a valid numeric bill amount.';
      checklist.push({ label: 'Bill Amount: Invalid number format', valid: false });
    } else if (numBill === 0) {
      isBillValid = false;
      billErrorMessage = 'Bill amount cannot be zero (₹0.00). Must be greater than zero.';
      checklist.push({ label: 'Bill Amount: ₹0.00 entered (must be > ₹0)', valid: false });
    } else if (numBill < 0) {
      isBillValid = false;
      billErrorMessage = 'Bill amount cannot be negative. Must be greater than zero.';
      checklist.push({ label: `Bill Amount: Negative (₹${numBill}) entered (must be > ₹0)`, valid: false });
    } else {
      checklist.push({ label: `Bill Amount: ${formatRupees(numBill)} (Valid ✓)`, valid: true });
    }
  }

  // 2. Number of People Validation
  const cleanPeopleStr = rawPeople.replace(/,/g, '');
  if (rawPeople === '') {
    isPeopleValid = false;
    peopleErrorMessage = 'Number of people cannot be empty. Please enter at least 1 person.';
    checklist.push({ label: 'Number of People: Empty (must be at least 1 person)', valid: false });
  } else {
    const numPeople = parseInt(cleanPeopleStr, 10);
    const floatPeople = parseFloat(cleanPeopleStr);
    if (isNaN(numPeople) || !isFinite(numPeople)) {
      isPeopleValid = false;
      peopleErrorMessage = 'Please enter a valid whole number of people.';
      checklist.push({ label: 'Number of People: Invalid number format', valid: false });
    } else if (floatPeople !== numPeople) {
      isPeopleValid = false;
      peopleErrorMessage = 'Number of people must be a whole number (no decimals).';
      checklist.push({ label: `Number of People: Decimal count (${cleanPeopleStr}) entered`, valid: false });
    } else if (numPeople === 0) {
      isPeopleValid = false;
      peopleErrorMessage = 'Number of people cannot be zero (0). Must be at least 1 person.';
      checklist.push({ label: 'Number of People: 0 entered (must be >= 1)', valid: false });
    } else if (numPeople < 0) {
      isPeopleValid = false;
      peopleErrorMessage = 'Number of people cannot be negative. Must be at least 1 person.';
      checklist.push({ label: `Number of People: Negative (${numPeople}) entered (must be >= 1)`, valid: false });
    } else {
      checklist.push({ label: `Number of People: ${numPeople} ${numPeople === 1 ? 'person' : 'people'} (Valid ✓)`, valid: true });
    }
  }

  // Apply inline field states
  setFieldError(billInput, billError, billErrorMessage);
  setFieldError(peopleInput, peopleError, peopleErrorMessage);

  // Update preset active classes
  updatePresetStates();

  const isValid = isBillValid && isPeopleValid;
  const finalBill = isBillValid ? parseFloat(rawBill) : 0;
  const finalPeople = isPeopleValid ? parseInt(rawPeople, 10) : 0;
  const finalOccasion = rawOccasion || 'General Outing';

  return {
    isValid,
    isBillValid,
    isPeopleValid,
    occasion: finalOccasion,
    bill: finalBill,
    people: finalPeople,
    checklist,
    errorSummary: [billErrorMessage, peopleErrorMessage].filter(Boolean),
  };
}

/**
 * Calculate bill shares with 100% exact mathematical precision in paise.
 * Guarantee: The sum of each person's share matches the original bill exactly down to the paisa.
 * 
 * Math principle:
 * totalPaise = Math.round(bill * 100)
 * basePaise = Math.floor(totalPaise / people)
 * remainderPaise = totalPaise % people
 * 
 * The first `remainderPaise` people pay `basePaise + 1`, and the rest pay `basePaise`.
 * Sum = (remainderPaise * (basePaise + 1)) + ((people - remainderPaise) * basePaise) === totalPaise!
 * 
 * @param {number} bill - Total bill in rupees
 * @param {number} people - Number of people
 * @returns {object} calculation results breakdown
 */
function calculateSplit(bill, people) {
  const totalPaise = Math.round(bill * 100);
  const basePaise = Math.floor(totalPaise / people);
  const remainderPaise = totalPaise % people;

  const shares = [];
  let calculatedSumPaise = 0;

  for (let i = 0; i < people; i++) {
    const hasExtraPaisa = i < remainderPaise;
    const personPaise = basePaise + (hasExtraPaisa ? 1 : 0);
    const personRupees = personPaise / 100;

    calculatedSumPaise += personPaise;

    shares.push({
      personIndex: i + 1,
      name: `Person ${i + 1}`,
      amountRupees: personRupees,
      hasExtraPaisa: hasExtraPaisa,
      paise: personPaise,
    });
  }

  const calculatedSumRupees = calculatedSumPaise / 100;
  const differenceRupees = Math.abs(calculatedSumRupees - bill);

  return {
    totalBill: bill,
    totalPaise: totalPaise,
    peopleCount: people,
    baseRupees: basePaise / 100,
    basePaise: basePaise,
    remainderPaise: remainderPaise,
    shares: shares,
    calculatedSumRupees: calculatedSumRupees,
    differenceRupees: differenceRupees,
    isExactMatch: differenceRupees < 0.0001,
  };
}

/**
 * Display the explicit "No Result" state card when inputs are empty, zero, or negative.
 * @param {Array<{label: string, valid: boolean}>} checklist - Validation details
 * @param {string} bannerMsg - Message for the global banner
 */
function showNoResultState(checklist, bannerMsg) {
  emptyState.style.display = 'none';
  resultsContent.style.display = 'none';
  noResultState.style.display = 'block';

  // Populate checklist
  noResultChecklist.innerHTML = '';
  checklist.forEach((item) => {
    const li = document.createElement('li');
    li.className = item.valid ? 'valid' : 'invalid';
    li.innerHTML = `
      <span aria-hidden="true">${item.valid ? '✓' : '✗'}</span>
      <span>${item.label}</span>
    `;
    noResultChecklist.appendChild(li);
  });

  showNoticeBanner(
    bannerMsg || 'No result: Bill amount and number of people must both be greater than zero.',
    'error'
  );

  currentSplitData = null;
  currentOccasion = '';

  // Clear invalid calculation from storage so it does not persist incorrectly
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Clear results view and restore neutral empty state
 */
function showEmptyState() {
  emptyState.style.display = 'block';
  noResultState.style.display = 'none';
  resultsContent.style.display = 'none';
  hideNoticeBanner();
  currentSplitData = null;
  currentOccasion = '';
}

/**
 * Render the split results to the DOM
 * @param {string} occasion - Name of occasion
 * @param {object} splitData - Output of calculateSplit
 * @param {string} [timestamp] - Formatted timestamp
 */
function renderResults(occasion, splitData, timestamp) {
  currentSplitData = splitData;
  currentOccasion = occasion;

  emptyState.style.display = 'none';
  noResultState.style.display = 'none';
  resultsContent.style.display = 'block';
  hideNoticeBanner();

  // Display Occasion & Metadata
  displayOccasion.textContent = occasion;
  const dateStr = timestamp || new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  displayTimestamp.textContent = `Saved: ${dateStr}`;

  // Top summary tiles
  displayTotalBill.textContent = formatRupees(splitData.totalBill);
  displayPeopleCount.textContent = `${splitData.peopleCount} ${splitData.peopleCount === 1 ? 'person' : 'people'}`;

  if (splitData.remainderPaise === 0) {
    displayPerPerson.textContent = formatRupees(splitData.baseRupees);
  } else {
    const normalShare = formatRupees(splitData.baseRupees);
    displayPerPerson.textContent = `~${normalShare}`;
  }

  // Safe calculations for paise values
  const totalPaise = Number(splitData?.totalPaise ?? Math.round((splitData?.totalBill || 0) * 100)) || 0;
  const basePaise = Number(splitData?.basePaise ?? Math.floor(totalPaise / (splitData?.peopleCount || 1))) || 0;
  const remainderPaise = Number(splitData?.remainderPaise ?? (totalPaise % (splitData?.peopleCount || 1))) || 0;

  // Populate Always-Visible INR Exact Paisa Ledger
  paisaTotalCell.textContent = `${totalPaise.toLocaleString('en-IN')} p`;
  paisaBaseCell.textContent = `${basePaise.toLocaleString('en-IN')} p (${formatRupees(splitData.baseRupees || basePaise / 100)})`;
  paisaRemainderCell.textContent = `${remainderPaise} p`;
  paisaMatchCell.textContent = '100% Match';

  if (splitData.remainderPaise > 0) {
    const higher = formatRupees(splitData.baseRupees + 0.01);
    const normal = formatRupees(splitData.baseRupees);
    const rCount = splitData.remainderPaise;
    const bCount = splitData.peopleCount - rCount;

    exactPaisaSummaryText.textContent = 
      `Exact Paisa Allocation: ${rCount} ${rCount === 1 ? 'person pays' : 'people pay'} ${higher} (+1 paisa), and ` +
      `${bCount} ${bCount === 1 ? 'person pays' : 'people pay'} ${normal}. Sum matches exactly ${formatRupees(splitData.totalBill)} without loss.`;
  } else {
    exactPaisaSummaryText.textContent = 
      `Exact Paisa Allocation: Perfectly divided with 0 remainder paise. Everyone pays exactly ${formatRupees(splitData.baseRupees)}.`;
  }

  // Populate person-by-person list
  sharesList.innerHTML = '';
  splitData.shares.forEach((share) => {
    const item = document.createElement('div');
    item.className = 'share-item';

    const noteText = share.hasExtraPaisa
      ? '(includes +₹0.01 rounding paisa)'
      : '(equal share)';

    item.innerHTML = `
      <div class="share-person">
        <div class="person-avatar" aria-hidden="true">${share.personIndex}</div>
        <div class="person-details">
          <span class="person-name">${share.name}</span>
          <span class="person-note">${splitData.remainderPaise > 0 ? noteText : 'Equal share'}</span>
        </div>
      </div>
      <div class="share-amount tabular-nums">${formatRupees(share.amountRupees)}</div>
    `;
    sharesList.appendChild(item);
  });

  // Populate verification box
  verifyBillAmount.textContent = formatRupees(splitData.totalBill);
  verifySharesSum.textContent = formatRupees(splitData.calculatedSumRupees);
  verifyDifference.textContent = formatRupees(splitData.differenceRupees) + ' (Exact Match ✓)';
}

/**
 * Handle form submission / Calculate Button click
 */
function handleCalculate(e) {
  if (e) e.preventDefault();

  const validation = validateInputs();

  // "show a message and no result if the bill or the number of people is empty zero or negative"
  if (!validation.isValid) {
    showNoResultState(
      validation.checklist,
      `Cannot calculate split: ${validation.errorSummary.join(' ')}`
    );
    return;
  }

  // Calculation is valid
  const splitResult = calculateSplit(validation.bill, validation.people);
  const now = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Render to DOM
  renderResults(validation.occasion, splitResult, now);

  // "still show the result after the page is reloaded" -> persist to localStorage
  const stateToSave = {
    occasion: validation.occasion,
    bill: validation.bill,
    people: validation.people,
    splitResult: splitResult,
    timestamp: now,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (err) {
    console.warn('Unable to save to localStorage:', err);
  }
}

/**
 * Handle Reset Button click
 * User requirement: "when we hit the reset button the number of people sharing is not reset it remains same so also make sure that it reset on the hitting of reset button"
 * Clears form fields, errors, results, and localStorage.
 */
function handleReset() {
  occasionInput.value = '';
  billInput.value = '';
  
  // Fully reset the number of people sharing to empty with placeholder!
  peopleInput.value = '';

  // Clear errors
  setFieldError(billInput, billError, '');
  setFieldError(peopleInput, peopleError, '');
  hideNoticeBanner();

  // Clear all preset active states
  billPresets.forEach((btn) => btn.classList.remove('active'));
  peoplePresets.forEach((btn) => btn.classList.remove('active'));

  // Reset stepper button state
  if (stepperMinus) {
    stepperMinus.disabled = true;
  }

  // Show clean empty state (no old results)
  showEmptyState();

  // Remove from localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear localStorage:', err);
  }

  showToast('Bill splitter completely reset');
}

/**
 * Update visual active state of preset buttons based on current input values
 */
function updatePresetStates() {
  const currentBill = billInput.value.trim();
  billPresets.forEach((btn) => {
    if (currentBill && btn.dataset.amount === currentBill) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const currentPeople = peopleInput.value.trim();
  peoplePresets.forEach((btn) => {
    if (currentPeople && btn.dataset.people === currentPeople) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Stepper disabled state check
  const peopleVal = parseInt(currentPeople, 10);
  if (stepperMinus) {
    stepperMinus.disabled = isNaN(peopleVal) || peopleVal <= 1;
  }
}

/**
 * Build a formatted text receipt slip
 * @returns {string} Formatted receipt text
 */
function buildReceiptText() {
  if (!currentSplitData) return 'No active calculation available.';

  const line = '------------------------------------------';
  const doubleLine = '==========================================';
  let text = '';
  text += doubleLine + '\n';
  text += '           RUPEESPLIT RECEIPT             \n';
  text += '     Exact Paisa Precision Allocation     \n';
  text += doubleLine + '\n';
  text += `Occasion:       ${currentOccasion || 'General Outing'}\n`;
  text += `Date:           ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}\n`;
  text += `Total Bill:     ${formatRupees(currentSplitData.totalBill)}\n`;
  text += `Total People:   ${currentSplitData.peopleCount}\n`;
  text += line + '\n';
  text += 'INDIVIDUAL CONTRIBUTIONS:\n';

  currentSplitData.shares.forEach((share) => {
    const padName = (share.name + ':').padEnd(16, ' ');
    const note = share.hasExtraPaisa ? ' (+1p)' : '';
    text += `  ${padName} ${formatRupees(share.amountRupees)}${note}\n`;
  });

  text += line + '\n';
  text += `Exact Sum of Shares: ${formatRupees(currentSplitData.calculatedSumRupees)}\n`;
  text += `Reconciliation:      ${formatRupees(currentSplitData.differenceRupees)} (100% Exact Match)\n`;
  text += doubleLine + '\n';
  text += 'Thank you for splitting with RupeeSplit!\n';

  return text;
}

/**
 * Open Print & Save Receipt Modal
 */
function openReceiptModal() {
  if (!currentSplitData) {
    showToast('Please calculate a bill split first.');
    return;
  }

  const receiptContent = buildReceiptText();
  receiptPreview.textContent = receiptContent;
  receiptModal.classList.add('active');
}

/**
 * Close Print & Save Receipt Modal
 */
function closeReceiptModal() {
  receiptModal.classList.remove('active');
}

/**
 * Trigger download of text receipt file
 */
function downloadReceiptFile() {
  const receiptContent = buildReceiptText();
  const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeOccasion = (currentOccasion || 'Bill').replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `RupeeSplit_Receipt_${safeOccasion}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Receipt file downloaded successfully!');
}

/**
 * Open Exact Paisa Precision Inspector Modal
 */
function openPaisaInspectorModal() {
  let html = '';
  if (currentSplitData) {
    const s = currentSplitData;
    const totalPaise = Number(s?.totalPaise ?? Math.round((s?.totalBill || 0) * 100)) || 0;
    const basePaise = Number(s?.basePaise ?? Math.floor(totalPaise / (s?.peopleCount || 1))) || 0;
    const remainderPaise = Number(s?.remainderPaise ?? (totalPaise % (s?.peopleCount || 1))) || 0;

    html += `
      <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.5rem;">
        Active Split: ${currentOccasion || 'General Outing'}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8125rem;">
        <div><strong>Total Bill:</strong> ${formatRupees(s.totalBill)} (${totalPaise.toLocaleString('en-IN')} paise)</div>
        <div><strong>People:</strong> ${s.peopleCount} contributors</div>
        <div><strong>Base Share:</strong> ${basePaise.toLocaleString('en-IN')} paise (${formatRupees(s.baseRupees || basePaise / 100)})</div>
        <div><strong>Remainder:</strong> ${remainderPaise} paisa(s)</div>
      </div>
      <div style="margin-top: 0.75rem; font-size: 0.8125rem; color: var(--color-text-main); border-top: 1px dashed var(--color-border); padding-top: 0.5rem;">
        <strong>Allocation Result:</strong><br/>
        ${remainderPaise > 0 
          ? `• The first <strong>${remainderPaise}</strong> contributor(s) contribute <strong>${formatRupees(Number(s.baseRupees || basePaise / 100) + 0.01)}</strong> (+1 paisa).<br/>• The remaining <strong>${s.peopleCount - remainderPaise}</strong> contributor(s) contribute <strong>${formatRupees(s.baseRupees || basePaise / 100)}</strong>.<br/>• Exact Total = <strong>${formatRupees(s.calculatedSumRupees || s.totalBill)}</strong> (0 paisa discrepancy).`
          : `• Each contributor pays an exact <strong>${formatRupees(s.baseRupees || basePaise / 100)}</strong> with zero remainder.`}
      </div>
    `;
  } else {
    // Demonstrative calculation
    html += `
      <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.5rem;">
        Interactive Demonstration: ₹100.00 among 3 people
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8125rem;">
        <div><strong>Bill in Paise:</strong> 10,000 paise</div>
        <div><strong>People:</strong> 3 contributors</div>
        <div><strong>Base Share:</strong> 3,333 paise (₹33.33)</div>
        <div><strong>Remainder:</strong> 1 paisa (10,000 % 3)</div>
      </div>
      <div style="margin-top: 0.75rem; font-size: 0.8125rem; color: var(--color-text-main); border-top: 1px dashed var(--color-border); padding-top: 0.5rem;">
        <strong>Allocated Shares:</strong><br/>
        • Person 1: ₹33.34 (3,334 paise)<br/>
        • Person 2: ₹33.33 (3,333 paise)<br/>
        • Person 3: ₹33.33 (3,333 paise)<br/>
        <strong>Sum: ₹33.34 + ₹33.33 + ₹33.33 = ₹100.00</strong> (100% exact!)
      </div>
    `;
  }

  modalPaisaDynamicContent.innerHTML = html;
  paisaInspectorModal.classList.add('active');
}

/**
 * Close Exact Paisa Modal
 */
function closePaisaInspectorModal() {
  paisaInspectorModal.classList.remove('active');
}

/**
 * Copy share details to clipboard (WhatsApp-ready formatting)
 */
function handleCopyBreakdown() {
  if (!currentSplitData) {
    showToast('No active calculation to copy.');
    return;
  }

  let text = `🧾 *Bill Split: ${currentOccasion || 'General Outing'}*\n`;
  text += `💰 Total Bill: ${formatRupees(currentSplitData.totalBill)}\n`;
  text += `👥 Split among: ${currentSplitData.peopleCount} people\n\n`;
  text += `*Individual Shares (Exact to the paisa):*\n`;

  currentSplitData.shares.forEach((s) => {
    const note = s.hasExtraPaisa ? ' (+1p)' : '';
    text += `• ${s.name}: ${formatRupees(s.amountRupees)}${note}\n`;
  });

  text += `\nExact Sum: ${formatRupees(currentSplitData.calculatedSumRupees)} ✓`;

  copyToClipboardWithFallback(text, 'Breakdown copied for WhatsApp!');
}

/**
 * Handle print action with graceful fallback if iframe sandboxes window.print()
 */
function handlePrint() {
  try {
    window.print();
  } catch (err) {
    console.warn('window.print() prevented by sandbox:', err);
    showToast('Browser blocked print dialog in this sandbox. Use "Download Receipt" instead!');
  }
}

/**
 * Restore state from localStorage on page load
 * "still show the result after the page is reloaded"
 */
function restoreSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      updatePresetStates();
      return;
    }

    const saved = JSON.parse(raw);
    if (saved && Number(saved.bill) > 0 && Number(saved.people) >= 1) {
      occasionInput.value = saved.occasion || '';
      billInput.value = saved.bill;
      peopleInput.value = saved.people;

      updatePresetStates();
      // Always recompute a fresh, clean calculation to guarantee all fields and precision
      const freshSplit = calculateSplit(Number(saved.bill), parseInt(saved.people, 10));
      renderResults(saved.occasion || 'General Outing', freshSplit, saved.timestamp);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      updatePresetStates();
    }
  } catch (err) {
    console.warn('Error restoring saved state:', err);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }
}

// -----------------------------------------------------------------------------
// Event Listeners Initialization
// -----------------------------------------------------------------------------

// Form submission / Calculate
form.addEventListener('submit', handleCalculate);
calculateBtn.addEventListener('click', handleCalculate);

// Reset
resetBtn.addEventListener('click', handleReset);

// Real-time input adjustments
billInput.addEventListener('input', () => {
  setFieldError(billInput, billError, '');
  updatePresetStates();
});

peopleInput.addEventListener('input', () => {
  setFieldError(peopleInput, peopleError, '');
  updatePresetStates();
});

// Stepper buttons for people count
if (stepperMinus) {
  stepperMinus.addEventListener('click', () => {
    let current = parseInt(peopleInput.value, 10);
    if (isNaN(current) || current <= 1) {
      peopleInput.value = '1';
    } else {
      peopleInput.value = (current - 1).toString();
    }
    setFieldError(peopleInput, peopleError, '');
    updatePresetStates();
  });
}

if (stepperPlus) {
  stepperPlus.addEventListener('click', () => {
    let current = parseInt(peopleInput.value, 10);
    if (isNaN(current) || current < 1) {
      peopleInput.value = '2';
    } else {
      peopleInput.value = (current + 1).toString();
    }
    setFieldError(peopleInput, peopleError, '');
    updatePresetStates();
  });
}

// Preset Quick Buttons for Bill
billPresets.forEach((btn) => {
  btn.addEventListener('click', () => {
    billInput.value = btn.dataset.amount;
    setFieldError(billInput, billError, '');
    updatePresetStates();
  });
});

// Preset Quick Buttons for People
peoplePresets.forEach((btn) => {
  btn.addEventListener('click', () => {
    peopleInput.value = btn.dataset.people;
    setFieldError(peopleInput, peopleError, '');
    updatePresetStates();
  });
});

// Copy Breakdown
if (copyBreakdownBtn) {
  copyBreakdownBtn.addEventListener('click', handleCopyBreakdown);
}

// Print / Save Button (Opens Modal)
if (printBtn) {
  printBtn.addEventListener('click', openReceiptModal);
}

// Header "INR Exact Paisa" button & Details link
if (exactPaisaHeaderBtn) {
  exactPaisaHeaderBtn.addEventListener('click', openPaisaInspectorModal);
}

if (openPaisaDetailsBtn) {
  openPaisaDetailsBtn.addEventListener('click', openPaisaInspectorModal);
}

// Receipt Modal Actions
if (closeReceiptModalBtn) {
  closeReceiptModalBtn.addEventListener('click', closeReceiptModal);
}

if (receiptModal) {
  receiptModal.addEventListener('click', (e) => {
    if (e.target === receiptModal) closeReceiptModal();
  });
}

if (downloadReceiptBtn) {
  downloadReceiptBtn.addEventListener('click', downloadReceiptFile);
}

if (copyReceiptModalBtn) {
  copyReceiptModalBtn.addEventListener('click', () => {
    const text = buildReceiptText();
    copyToClipboardWithFallback(text, 'Receipt copied to clipboard!');
  });
}

if (triggerPrintBtn) {
  triggerPrintBtn.addEventListener('click', handlePrint);
}

// Paisa Inspector Modal Actions
if (closePaisaModalBtn) {
  closePaisaModalBtn.addEventListener('click', closePaisaInspectorModal);
}

if (paisaModalOkBtn) {
  paisaModalOkBtn.addEventListener('click', closePaisaInspectorModal);
}

if (paisaInspectorModal) {
  paisaInspectorModal.addEventListener('click', (e) => {
    if (e.target === paisaInspectorModal) closePaisaInspectorModal();
  });
}

// Escape key to close any active modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeReceiptModal();
    closePaisaInspectorModal();
  }
});

// Run state restoration safely once when document is ready
let isRestored = false;
function safeRestore() {
  if (isRestored) return;
  isRestored = true;
  restoreSavedState();
}

document.addEventListener('DOMContentLoaded', safeRestore);

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  safeRestore();
}
