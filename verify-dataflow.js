const fs = require('fs');
const vm = require('vm');

function createLocalStorage() {
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key(index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
}

const elements = {
  blade: { value: '3' },
  endloss: { value: '150' },
  minRemnantLen: { value: '500' },
  spec: { value: 'H-100x100x6x8' },
  jobClient: { value: 'Test Client' },
  jobName: { value: 'Test Job' },
  jobDeadline: { value: '2026-03-25' },
  jobWorker: { value: 'Test Memo' }
};

global.window = global;
global.localStorage = createLocalStorage();
global.document = {
  readyState: 'complete',
  body: { appendChild() {} },
  getElementById(id) {
    return elements[id] || null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
  createElement() {
    return {
      style: {},
      innerHTML: '',
      querySelector() { return null; },
      querySelectorAll() { return []; },
      appendChild() {},
      remove() {}
    };
  }
};

global.navigator = {};
global.curKind = 'H';
global.totalRows = 0;
global.remnantCount = 0;
global.LS_CUT_HIST = 'so_cut_history';
global.LS_INVENTORY = 'so_inventory';
global.LS_INV_PREFIX = 'so_inv_';
global.syncInventoryToRemnants = function() {};
global.renderInventoryPage = function() {};
global.updateInvDropdown = function() {};
global.renderInventory = function() {};
global.getCurrentKind = function() { return global.curKind; };
global.isStdStockLength = function(len) {
  return [5500, 6000, 7000, 8000, 9000, 10000, 11000, 12000].indexOf(Number(len)) >= 0;
};
global.sortStockLengthsForDisplay = function(lengths) {
  return lengths.slice().sort(function(a, b) { return Number(b) - Number(a); });
};

vm.runInThisContext(fs.readFileSync('storage.js', 'utf8'), { filename: 'storage.js' });
vm.runInThisContext(fs.readFileSync('final-overrides.js', 'utf8'), { filename: 'final-overrides.js' });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resetState() {
  localStorage.clear();
  global._lastCalcResult = null;
  global._lastPrintedCardId = '';
  global._lastPrintedRemnantSignature = '';
  global._lastConsumedInventorySignature = '';
}

function test(name, fn) {
  resetState();
  fn();
  console.log('PASS', name);
}

function sampleMeta(extra) {
  return Object.assign({
    spec: 'H-100x100x6x8',
    kind: 'H',
    minRemnantLen: 500,
    blade: 3,
    endLoss: 150,
    selectedInventoryRemnants: []
  }, extra || {});
}

test('yield payload uses yield bars before bA fallback', function() {
  const result = {
    allDP: [{
      slA: 9000,
      bars: [{ pat: [1600, 600], loss: 29, sl: 9000 }],
      bA: [{ pat: [1], loss: 999, sl: 1 }],
      bB: []
    }],
    meta: sampleMeta()
  };
  const payload = buildCardSelectionPayload(result, 'card_yield_0');
  assert(payload.selectedBars.length === 1, 'expected one yield bar');
  assert(payload.selectedBars[0].sl === 9000, 'expected yield bar sl 9000');
  assert(payload.selectedBars[0].loss === 29, 'expected yield bar loss 29');
});

test('pattern B90 payload resolves correct plan bars', function() {
  const result = {
    patA: { sl: 7000, bars: [{ pat: [1600], loss: 400, sl: 7000 }] },
    patB: {
      plan90: { sl: 5500, bars: [{ pat: [1600, 600], loss: 941, sl: 5500 }] },
      plan80: { sl: 3000, bars: [{ pat: [300], loss: 188, sl: 3000 }] }
    },
    meta: sampleMeta()
  };
  const payload = buildCardSelectionPayload(result, 'card_pat_B90_123');
  assert(payload.selectedBars.length === 1, 'expected one B90 bar');
  assert(payload.selectedBars[0].sl === 5500, 'expected B90 stock length');
  assert(payload.selectedBars[0].loss === 941, 'expected B90 loss');
});

test('extractRemnants respects min remnant length', function() {
  const result = {
    patA: { sl: 5500, bars: [{ pat: [1600], loss: 499, sl: 5500 }, { pat: [1600], loss: 941, sl: 5500 }] },
    meta: sampleMeta({ minRemnantLen: 500 })
  };
  const rems = extractRemnants(result, 'card_pat_A_1');
  assert(rems.length === 1, 'expected only one remnant above threshold');
  assert(rems[0].len === 941, 'expected remnant 941');
});

test('saveCutHistory stores selected bars and remnants for chosen card', function() {
  const result = {
    patA: { sl: 5500, bars: [{ pat: [1600, 600], loss: 941, sl: 5500 }] },
    meta: sampleMeta()
  };
  const entry = saveCutHistory(result, 'card_pat_A_1');
  assert(entry.result.selectedBars.length === 1, 'history should store selected bars');
  assert(entry.result.remnants.length === 1, 'history should store remnants');
  assert(entry.result.remnants[0].len === 941, 'history remnant should be 941');
});

test('consumeSelectedInventoryRemnants removes exact selected ids', function() {
  saveInventory([
    { id: 'a', len: 941, spec: 'H-100x100x6x8', kind: 'H' },
    { id: 'b', len: 941, spec: 'H-100x100x6x8', kind: 'H' }
  ]);
  const consumed = consumeSelectedInventoryRemnants([{ ids: ['b'], qty: 1, len: 941, spec: 'H-100x100x6x8', kind: 'H' }]);
  const remain = getInventory();
  assert(consumed.length === 1, 'should consume one selected item');
  assert(remain.length === 1 && String(remain[0].id) === 'a', 'should leave only unselected id');
});

test('consumeInventoryBars removes selected standard stock and remnant stock', function() {
  saveInventory([
    { id: 'std1', len: 10000, spec: 'H-100x100x6x8', kind: 'H' },
    { id: 'rem1', len: 3147, spec: 'H-100x100x6x8', kind: 'H' }
  ]);
  const bars = [
    { pat: [1600], loss: 29, sl: 10000 },
    { pat: [1600, 600], loss: 235, sl: 3147 }
  ];
  const consumed = consumeInventoryBars(bars, sampleMeta({
    selectedInventoryRemnants: [{ ids: ['std1'], qty: 1, len: 10000, spec: 'H-100x100x6x8', kind: 'H' }]
  }));
  assert(consumed.length === 2, 'should consume both selected standard stock and remnant');
  assert(getInventory().length === 0, 'inventory should be empty after consumption');
});

test('buildPrintPayload prefers result payload over stale fallback bars', function() {
  const result = {
    allDP: [{
      slA: 9000,
      bars: [{ pat: [1600, 1600, 600, 600], loss: 29, sl: 9000 }],
      bA: [{ pat: [1], loss: 999, sl: 1 }],
      bB: []
    }],
    meta: sampleMeta()
  };
  global._lastCalcResult = result;
  const payload = buildPrintPayload('card_yield_0', result, {
    bars: [{ pat: [1], loss: 1, sl: 1 }],
    remnants: [{ len: 1, spec: 'x', kind: 'y', sl: 1 }]
  });
  assert(payload.bars.length === 1 && payload.bars[0].sl === 9000, 'print payload should use result bars');
  assert(payload.rems.length === 0, '29mm loss should not become remnant');
});

console.log('All verification cases passed.');
