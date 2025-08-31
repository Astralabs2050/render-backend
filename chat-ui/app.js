(() => {
  const qs = (s) => document.querySelector(s);
  const messages = qs('#messages');
  const baseUrlEl = qs('#baseUrl');
  const emailEl = qs('#email');
  const passwordEl = qs('#password');
  const loginBtn = qs('#loginBtn');
  const authStatus = qs('#authStatus');
  const promptInput = qs('#promptInput');
  const sendPromptBtn = qs('#sendPromptBtn');
  const previewsEl = document.getElementById('previews');

  let token = '';
  // restore token if previously saved
  const savedToken = localStorage.getItem('chatui_token');
  if (savedToken) token = savedToken;
  let lastChatId = '';
  // Minimal chat-only UI; no stream
  baseUrlEl.value = localStorage.getItem('chatui_base') || 'http://localhost:3000';
  emailEl.value = localStorage.getItem('chatui_email') || 'kases14120@discrip.com';

  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function req(path, opts = {}) {
    const base = baseUrlEl.value.trim();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    
    // Handle token expiration
    if (res.status === 401 && data?.message?.includes('token')) {
      token = '';
      localStorage.removeItem('chatui_token');
      const loginOk = await autoLoginIfNeeded();
      if (loginOk) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${token}`;
        const retryRes = await fetch(`${base}${path}`, { ...opts, headers });
        const retryData = await retryRes.json().catch(() => ({}));
        if (!retryRes.ok) throw new Error(retryData?.message || retryRes.statusText);
        return retryData;
      }
    }
    
    if (!res.ok) throw new Error(data?.message || res.statusText);
    return data;
  }

  async function autoLoginIfNeeded() {
    if (token) return true;
    try {
      // use saved creds or provided defaults
      const email = (emailEl.value.trim() || localStorage.getItem('chatui_email') || 'kases14120@discrip.com');
      const password = (passwordEl.value || 'Password123!');
      const base = (baseUrlEl.value.trim() || 'http://localhost:3000');
      localStorage.setItem('chatui_base', base);
      localStorage.setItem('chatui_email', email);
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || `Login failed (${res.status})`);
      token = json?.access_token || json?.data?.access_token || json?.accessToken || json?.data?.accessToken || '';
      if (!token) throw new Error('No access token returned');
      localStorage.setItem('chatui_token', token);
      authStatus.textContent = 'Logged in';
      authStatus.style.color = '#4da3ff';
      return true;
    } catch (e) {
      authStatus.textContent = e.message;
      authStatus.style.color = '#ff6b6b';
      return false;
    }
  }

  loginBtn.onclick = async () => {
    try {
      const email = emailEl.value.trim();
      const password = passwordEl.value;
      localStorage.setItem('chatui_base', baseUrlEl.value.trim());
      localStorage.setItem('chatui_email', email);
      // do not use req() here since we may not have token yet
      const base = baseUrlEl.value.trim();
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || `Login failed (${res.status})`);
      }
      // accept either {access_token} or {data:{access_token}} or {data:{accessToken}}
      token = json?.access_token || json?.data?.access_token || json?.accessToken || json?.data?.accessToken || '';
      if (!token) throw new Error('No access token returned');
      localStorage.setItem('chatui_token', token);
      authStatus.textContent = 'Logged in';
      authStatus.style.color = token ? '#4da3ff' : '#ff6b6b';
    } catch (e) {
      authStatus.textContent = e.message;
      authStatus.style.color = '#ff6b6b';
    }
  };

  // no-op: stream removed

  sendPromptBtn.onclick = async () => {
    if (!token) {
      const ok = await autoLoginIfNeeded();
      if (!ok) { addMessage('ai', 'Login failed. Please verify Base URL and credentials.'); return; }
    }
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    addMessage('user', prompt);
    promptInput.value = '';
    try {
      // No commands: let backend infer next step
      const body = { content: prompt };
      if (lastChatId) body.chatId = lastChatId;
      const r = await req('/ai-chat/message', { method: 'POST', body: JSON.stringify(body) });
      const chatId = r?.data?.chatId; if (chatId) lastChatId = chatId;
      const imgs = r?.data?.designPreviews || [];
      const text = r?.data?.aiResponse || (imgs.length ? `Here are ${imgs.length} variations. Click to select.` : '');
      if (text) addMessage('ai', text);
      if (previewsEl) {
        previewsEl.innerHTML = '';
        previewsEl.style.display = imgs.length ? 'block' : 'none';
        imgs.slice(0, 3).forEach((url, i) => {
          const img = document.createElement('img');
          img.src = url;
          img.alt = `variation_${i+1}`;
          img.style.maxWidth = '160px';
          img.style.border = '1px solid #1c2533';
          img.style.borderRadius = '8px';
          img.style.marginRight = '8px';
          img.style.cursor = 'pointer';
          img.onclick = async () => {
            addMessage('user', `Selected variation_${i+1}`);
            try {
              const selBody = { content: `variation_${i+1}` };
              if (lastChatId) selBody.chatId = lastChatId;
              const rr = await req('/ai-chat/message', { method: 'POST', body: JSON.stringify(selBody) });
              const txt = rr?.data?.aiResponse || `variation_${i+1} selected.`;
              addMessage('ai', txt);
              previewsEl.style.display = 'none';
              previewsEl.innerHTML = '';
              
              // Check if AI is asking for minting confirmation
              if (txt.toLowerCase().includes('mint') && txt.includes('$50')) {
                showMintingOptions(i+1);
              }
            } catch (e) {
              addMessage('ai', `Error: ${e.message}`);
            }
          };
          previewsEl.appendChild(img);
        });
      }
    } catch (e) {
      addMessage('ai', `Error: ${e.message}`);
    }
  };
  // Minting test flow functions
  function showMintingOptions(variationNumber) {
    const mintingDiv = document.createElement('div');
    mintingDiv.className = 'minting-options';
    mintingDiv.style.cssText = `
      background: #2a3441;
      border: 1px solid #4da3ff;
      border-radius: 8px;
      padding: 16px;
      margin: 8px 0;
      display: flex;
      gap: 12px;
      align-items: center;
    `;
    
    mintingDiv.innerHTML = `
      <span style="color: #4da3ff; font-weight: bold;">💎 Mint Design for $50</span>
      <button id="mockPayBtn" style="
        background: #4da3ff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Simulate Payment</button>
      <button id="mintBtn" style="
        background: #28a745;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        opacity: 0.5;
      " disabled>Mint NFT</button>
      <span id="paymentStatus" style="color: #ffa500;"></span>
    `;
    
    messages.appendChild(mintingDiv);
    messages.scrollTop = messages.scrollHeight;
    
    // Mock payment simulation
    document.getElementById('mockPayBtn').onclick = async () => {
      const payBtn = document.getElementById('mockPayBtn');
      const mintBtn = document.getElementById('mintBtn');
      const status = document.getElementById('paymentStatus');
      
      payBtn.disabled = true;
      payBtn.textContent = 'Processing...';
      status.textContent = 'Processing payment...';
      
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      payBtn.style.display = 'none';
      mintBtn.disabled = false;
      mintBtn.style.opacity = '1';
      status.textContent = `✅ Payment confirmed: ${mockTxHash.substr(0, 10)}...`;
      status.style.color = '#28a745';
      
      // Store for minting
      mintBtn.onclick = () => mintDesign(variationNumber, mockTxHash);
    };
  }
  
  async function mintDesign(variationNumber, paymentTxHash) {
    const mintBtn = document.getElementById('mintBtn');
    const status = document.getElementById('paymentStatus');
    
    mintBtn.disabled = true;
    mintBtn.textContent = 'Minting...';
    status.textContent = 'Minting NFT on blockchain...';
    status.style.color = '#ffa500';
    
    try {
      const mintBody = {
        chatId: lastChatId,
        selectedVariation: `variation_${variationNumber}`,
        paymentTransactionHash: paymentTxHash
      };
      
      const result = await req('/web3/nft/mint', { 
        method: 'POST', 
        body: JSON.stringify(mintBody) 
      });
      
      addMessage('ai', `🎉 NFT minted successfully! Token ID: ${result.id}`);
      addMessage('ai', `Your design is now available in "My Designs" section.`);
      
      mintBtn.textContent = '✅ Minted';
      mintBtn.style.background = '#28a745';
      status.textContent = `NFT #${result.id} created successfully!`;
      status.style.color = '#28a745';
      
    } catch (e) {
      addMessage('ai', `❌ Minting failed: ${e.message}`);
      mintBtn.disabled = false;
      mintBtn.textContent = 'Retry Mint';
      status.textContent = `Error: ${e.message}`;
      status.style.color = '#ff6b6b';
    }
  }

  // no extra handlers; no command parsing
})();
