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

  return true;
});

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
});

console.log('Domain Abuse Reporter Extension loaded');
