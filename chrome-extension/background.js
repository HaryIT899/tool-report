chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'fillForm',
          data: request.data,
        });
      }
    });
    sendResponse({ success: true });
  }

  if (request.action === 'openReportUrls') {
    const { urls, data } = request;
    
    urls.forEach((url, index) => {
      setTimeout(() => {
        chrome.tabs.create({ url, active: index === 0 }, (tab) => {
          chrome.storage.local.set({
            [`tab_${tab.id}`]: data,
          });
        });
      }, index * 500);
    });

    sendResponse({ success: true, count: urls.length });
  }

  if (request.action === 'setTabPayload') {
    const tabId = sender?.tab?.id;
    if (!tabId) {
      sendResponse({ success: false });
      return true;
    }
    chrome.storage.local.set({ [`tabPayload_${tabId}`]: request.payload || null }, () => {
      sendResponse({ success: true });
    });
  }

  if (request.action === 'getTabPayload') {
    const tabId = sender?.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, payload: null });
      return true;
    }
    chrome.storage.local.get(`tabPayload_${tabId}`, (result) => {
      sendResponse({ success: true, payload: result[`tabPayload_${tabId}`] || null });
    });
  }

  if (request.action === 'solve_captcha') {
    solveCaptcha(request.siteKey, request.pageUrl)
      .then(token => sendResponse({ success: true, token }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // keep channel open for async response
  }

  if (request.action === 'solve_turnstile') {
    solveTurnstile(request.siteKey, request.pageUrl)
      .then(token => sendResponse({ success: true, token }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // keep channel open for async response
  }

  return true;
});

// 2Captcha Integration
const CAPTCHA_API_KEY = '6ad3ceb8cb9bd2b76d47aeadf9dba6de';

async function solveCaptcha(siteKey, pageUrl) {
  console.log('[2Captcha] Submitting captcha task...', { siteKey, pageUrl });
  
  // Submit task
  const submitUrl = `https://2captcha.com/in.php?key=${CAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
  
  try {
    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json();
    
    console.log('[2Captcha] Submit response:', submitData);
    
    if (submitData.status !== 1) {
      throw new Error(submitData.request || 'Failed to submit captcha');
    }
    
    const taskId = submitData.request;
    console.log('[2Captcha] Task ID:', taskId);
    
    // Poll for result (max 60 seconds)
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      
      const resultUrl = `https://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${taskId}&json=1`;
      const resultRes = await fetch(resultUrl);
      const resultData = await resultRes.json();
      
      console.log(`[2Captcha] Poll attempt ${i + 1}/12:`, resultData);
      
      if (resultData.status === 1) {
        console.log('[2Captcha] Captcha solved successfully!');
        return resultData.request; // captcha token
      }
      
      if (resultData.request !== 'CAPCHA_NOT_READY') {
        throw new Error(resultData.request);
      }
    }
    
    throw new Error('Timeout waiting for captcha solution (60s)');
  } catch (error) {
    console.error('[2Captcha] Error:', error);
    throw error;
  }
}

async function solveTurnstile(siteKey, pageUrl) {
  console.log('[2Captcha] Submitting Turnstile task...', { siteKey, pageUrl });
  
  // Submit Turnstile task (method=turnstile)
  const submitUrl = `https://2captcha.com/in.php?key=${CAPTCHA_API_KEY}&method=turnstile&sitekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
  
  try {
    const submitRes = await fetch(submitUrl);
    const submitData = await submitRes.json();
    
    console.log('[2Captcha] Turnstile submit response:', submitData);
    
    if (submitData.status !== 1) {
      throw new Error(submitData.request || 'Failed to submit Turnstile');
    }
    
    const taskId = submitData.request;
    console.log('[2Captcha] Turnstile Task ID:', taskId);
    
    // Poll for result (max 60 seconds)
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      
      const resultUrl = `https://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${taskId}&json=1`;
      const resultRes = await fetch(resultUrl);
      const resultData = await resultRes.json();
      
      console.log(`[2Captcha] Turnstile poll attempt ${i + 1}/12:`, resultData);
      
      if (resultData.status === 1) {
        console.log('[2Captcha] Turnstile solved successfully!');
        return resultData.request; // turnstile token
      }
      
      if (resultData.request !== 'CAPCHA_NOT_READY') {
        throw new Error(resultData.request);
      }
    }
    
    throw new Error('Timeout waiting for Turnstile solution (60s)');
  } catch (error) {
    console.error('[2Captcha] Turnstile error:', error);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(`tab_${tabId}`, (result) => {
      const data = result[`tab_${tabId}`];
      if (data) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'fillForm',
            data: data,
          });
        }, 1000);
      }
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`tab_${tabId}`);
  chrome.storage.local.remove(`tabPayload_${tabId}`);
});

console.log('Domain Abuse Reporter Extension loaded');
