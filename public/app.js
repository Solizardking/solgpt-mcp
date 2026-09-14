'use strict';
const $ = (id) => document.getElementById(id);
let session = null;
let provider = null;
let revealedKey = '';
let busy = false;
let endpoint = ((location.hostname.includes('solgpt')||location.hostname.includes('x402')) ? (location.origin + '/mcp') : 'https://solgpt.trade/mcp');
let walletEpoch = 0;
let toastTimer;
function notify(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3500); }
function status(text = '', error = false) { $('status-message').textContent = text; $('status-message').classList.toggle('error', error); $('status-message').hidden = !text; }
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'content-type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Something went wrong. Please retry.'); error.status = response.status; throw error; }
  return data;
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); notify(label); } catch { notify('Clipboard unavailable. Select and copy the text manually.'); }
}
function hideSecret() { revealedKey = ''; $('key-secret').textContent = ''; $('new-key').hidden = true; }
function renderSession() {
  $('disconnected').hidden = !!session;
  $('connected').hidden = !session;
  $('key-management').hidden = !session;
  $('access-badge').textContent = session ? session.eligible ? 'HOLDER VERIFIED' : 'WALLET VERIFIED' : 'NOT CONNECTED';
  $('access-badge').classList.toggle('verified', !!session?.eligible);
  $('step-connect').classList.toggle('done', !!session);
  $('step-verify').classList.toggle('active', !!session);
  $('step-verify').classList.toggle('done', !!session?.eligible);
  $('step-key').classList.toggle('active', !!session?.eligible);
  if (!session) { $('key-list').replaceChildren(); $('key-form').reset(); hideSecret(); return; }
  $('wallet-address').textContent = session.wallet.slice(0, 6) + '…' + session.wallet.slice(-6);
  $('wallet-address').title = session.wallet;
  $('wallet-balance').textContent = session.balance;
  $('eligibility').textContent = session.eligible ? '✓ You hold Clawd. Your access is ready.' : 'This wallet does not hold Clawd yet.';
  $('eligibility').classList.toggle('ineligible', !session.eligible);
  $('key-form').hidden = !session.eligible || !!revealedKey;
  $('apply-key').disabled = !session.eligible || busy;
}
async function loadSession(silent = false) {
  const epoch = walletEpoch;
  try {
    const data = await api('/api/session');
    if (epoch !== walletEpoch) return;
    session = data.wallet ? data : null;
    renderSession();
    await loadKeys();
    return true;
  } catch (error) {
    if (epoch !== walletEpoch) return;
    if (error.status === 401) { session = null; renderSession(); if (!silent) status('Your session expired. Connect your wallet again.', true); }
    else { if (session) { session.eligible = false; session.balance = "—"; renderSession(); } status(error.message, true); }
    return false;
  }
}
async function loadKeys() {
  if (!session) return;
  const epoch = walletEpoch;
  const { keys } = await api('/api/keys');
  if (epoch !== walletEpoch || !session) return;
  const list = $('key-list'); list.replaceChildren();
  if (!keys.length) { const empty = document.createElement('p'); empty.className = 'micro muted'; empty.textContent = 'No keys yet. Your first project is waiting.'; list.append(empty); return; }
  for (const key of keys) {
    const row = document.createElement('div'); row.className = 'key-row' + (key.revoked ? ' revoked' : '');
    const details = document.createElement('div'); details.className = 'key-details';
    const name = document.createElement('strong'); name.textContent = key.name;
    const prefix = document.createElement('code'); prefix.textContent = key.prefix + '…'; details.append(name, prefix);
    const date = document.createElement('span'); date.className = 'micro muted'; date.textContent = new Date(key.created).toLocaleDateString();
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = key.revoked ? 'REVOKED' : 'ACTIVE';
    row.append(details, date, badge);
    if (!key.revoked) {
      const button = document.createElement('button'); button.className = 'small-button'; button.textContent = 'Revoke'; button.setAttribute('aria-label', 'Revoke key for ' + key.name);
      button.onclick = async () => {
        if (!confirm('Revoke the key for ' + key.name + '? Connected clients will lose access.')) return;
        button.disabled = true;
        try { await api('/api/keys/' + key.id, { method: 'DELETE' }); hideSecret(); renderSession(); await loadKeys(); notify('API key revoked'); }
        catch (error) { status(error.message, true); button.disabled = false; }
      };
      row.append(button);
    }
    list.append(row);
  }
}
function availableWallets() {
  return [
    ['Phantom', window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null)],
    ['Solflare', window.solflare],
    ['Backpack', window.backpack?.solana || (window.backpack?.isBackpack ? window.backpack : null)],
  ];
}
$('connect-wallet').onclick = () => {
  if (busy) return;
  const options = $('wallet-options'); options.replaceChildren();
  for (const [name, wallet] of availableWallets()) {
    const button = document.createElement('button'); button.className = 'wallet-option';
    const label = document.createElement('span'); label.textContent = name;
    const detail = document.createElement('small'); detail.textContent = wallet ? 'CONNECT ↗' : 'NOT DETECTED';
    button.append(label, detail); button.disabled = !wallet;
    button.onclick = () => { $('wallet-dialog').close(); connect(wallet); };
    options.append(button);
  }
  $('wallet-dialog').showModal();
};
$('close-wallet-dialog').onclick = () => $('wallet-dialog').close();
$('wallet-dialog').addEventListener('click', event => { if (event.target === $('wallet-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
async function connect(wallet) {
  busy = true; $('connect-wallet').disabled = true; status('Connect your wallet, then approve the sign-in message.');
  hideSecret();
  const epoch = ++walletEpoch;
  try {
    const connected = await wallet.connect();
    const address = (connected?.publicKey || wallet.publicKey)?.toString();
    if (!address) throw new Error('The wallet did not provide a Solana address.');
    const challenge = await api('/api/challenge', { method: 'POST', body: JSON.stringify({ wallet: address }) });
    const signed = await wallet.signMessage(new TextEncoder().encode(challenge.message), 'utf8');
    const bytes = signed.signature || signed;
    const signature = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    if (epoch !== walletEpoch) return;
    await api('/api/login', { method: 'POST', body: JSON.stringify({ id: challenge.id, signature }) });
    if (provider !== wallet) {
      provider?.removeListener?.('accountChanged', accountChanged);
      provider?.removeListener?.('disconnect', accountChanged);
      provider = wallet;
      provider.on?.('accountChanged', accountChanged);
      provider.on?.('disconnect', accountChanged);
    }
    status('Wallet verified. Checking your Clawd balance…');
    if (await loadSession()) status();
  } catch (error) { status(error.code === 4001 || /reject|cancel/i.test(error.message) ? 'Sign-in was cancelled. You can connect again whenever you’re ready.' : error.message, true); }
  finally { busy = false; $('connect-wallet').disabled = false; renderSession(); }
}
async function accountChanged() {
  ++walletEpoch; session = null; hideSecret(); renderSession();
  try { await api('/api/logout', { method: 'POST' }); } catch { /* cookie expires independently */ }
  status('Wallet changed or disconnected. Sign in again to continue.');
}
$('disconnect-wallet').onclick = async () => {
  try {
    await api('/api/logout', { method: 'POST' });
    ++walletEpoch; session = null; hideSecret(); renderSession(); status();
    provider?.removeListener?.('accountChanged', accountChanged); provider?.removeListener?.('disconnect', accountChanged);
    await provider?.disconnect?.(); provider = null;
  } catch (error) { status(error.message, true); }
};
$('refresh-balance').onclick = async () => { $('refresh-balance').disabled = true; status('Checking holdings…'); if (await loadSession()) status(); $('refresh-balance').disabled = false; };
$('key-form').onsubmit = async (event) => {
  event.preventDefault(); if (busy || !session?.eligible) return;
  busy = true; $('apply-key').disabled = true; status('Verifying holdings and creating your personal key…');
  const epoch = walletEpoch;
  try {
    const result = await api('/api/keys', { method: 'POST', body: JSON.stringify({ name: $('project-name').value.trim(), purpose: $('project-purpose').value.trim() }) });
    if (epoch !== walletEpoch) return;
    revealedKey = result.key; $('key-secret').textContent = revealedKey; $('new-key').hidden = false;
    $('key-form').reset(); status(); renderSession(); await loadKeys(); $('new-key').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('copy-key').focus({ preventScroll: true });
  } catch (error) { status(error.message, true); if (error.status === 403 || error.status === 401) await loadSession(true); }
  finally { busy = false; renderSession(); }
};
$('copy-key').onclick = () => { if (revealedKey) copy(revealedKey, 'API key copied. Store it somewhere safe.'); };
$('dismiss-key').onclick = () => { hideSecret(); renderSession(); };
$('copy-endpoint').onclick = () => copy(endpoint, 'MCP endpoint copied');
$('copy-example').onclick = () => copy($('code-example').textContent, 'Example copied');
async function initialize() {
  try {
    const config = await api('/api/config'); endpoint = config.endpoint; $('holder-tool-count').textContent = config.toolCount;
    $('code-example').textContent = $('code-example').textContent.replace('https://solgpt-pumpfun-mcp.fly.dev/mcp', endpoint);
  } catch { /* static connection details remain usable */ }
  try { const health = await api('/health'); const element = $('gateway-status'); element.replaceChildren(); const dot = document.createElement('span'); dot.className = 'live-dot'; element.append(dot, health.ok ? 'All systems operational' : 'Status unavailable'); }
  catch { $('gateway-status').textContent = 'Status unavailable'; }
  await loadSession(true);
}
initialize();
