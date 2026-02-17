document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('scanBtn');

  function setStatus(msg, isError = false) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? '#FF6B6B' : 'rgba(143, 227, 164, 0.6)';
    }
  }

  setStatus('Ready');

  try {
    if (!btn) throw new Error('Scan button not found');

    btn.addEventListener('click', async () => {
      try {
        setStatus('Initializing...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab) {
          setStatus('No active tab', true);
          return;
        }

        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          setStatus('Analyzing...');

          async function fetchSkeletonData(attempts = 5, delay = 200) {
            for (let i = 0; i < attempts; i++) {
              try {
                const res = await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => { return window.__skeletonizerData || null; }
                });
                const data = res && res[0] && res[0].result;
                if (data) return data;
              } catch (e) { }
              await new Promise(r => setTimeout(r, delay));
            }
            return null;
          }

          const pageData = await fetchSkeletonData();
          if (!pageData) {
            setStatus('Analysis failed', true);
            return;
          }

          setStatus('Complete');
        } catch (e) {
          setStatus('Error: ' + (e.message || e), true);
          return;
        }

        const originalText = btn.innerText;
        btn.innerText = 'Analyzing...';
        btn.style.background = 'rgba(143, 227, 164, 0.15)';
        btn.style.color = '#8FE3A4';
        btn.style.boxShadow = 'none';

        setTimeout(() => {
          btn.innerText = 'Success';
          btn.style.background = 'rgba(143, 227, 164, 0.8)';
          btn.style.color = '#050D0C';

          setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = 'linear-gradient(135deg, #8FE3A4, #7BC990)';
            btn.style.color = '#050D0C';
            btn.style.boxShadow = '0 4px 15px rgba(143, 227, 164, 0.2)';
            setStatus('Saved to JSON');
          }, 4000);
        }, 1200);
      } catch (err) {
        setStatus('Critical error', true);
      }
    });
  } catch (err) {
    setStatus('Init failed', true);
  }
});