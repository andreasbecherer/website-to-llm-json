document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('scanBtn');

  function setStatus(msg, isError = false) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? '#A11A1A' : 'rgba(0, 66, 175, 0.6)';
    }
    console.log('popup status:', msg);
  }

  setStatus('Ready');

  try {
    if (!btn) throw new Error('Scan button not found');

    btn.addEventListener('click', async () => {
      try {
        setStatus('Requesting active tab...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab) {
          setStatus('No active tab found.', true);
          return;
        }

        // Skript-Injektion
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          setStatus('Collecting data...');

          // Try to fetch the data object the content script placed on window
          async function fetchSkeletonData(attempts = 5, delay = 200) {
            for (let i = 0; i < attempts; i++) {
              try {
                const res = await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => { return window.__skeletonizerData || null; }
                });
                const data = res && res[0] && res[0].result;
                if (data) return data;
              } catch (e) {
                console.warn('fetchSkeletonData attempt failed', e);
              }
              // small pause before retry
              await new Promise(r => setTimeout(r, delay));
            }
            return null;
          }

          const pageData = await fetchSkeletonData();
          if (!pageData) {
            setStatus('No data found — page blocked?', true);
            console.warn('No skeleton data available on the page.');
            return;
          }

          setStatus('Analysis complete');
        } catch (e) {
          console.error('Injection failed', e);
          setStatus('Injection failed: ' + (e.message || e), true);
          return;
        }

        // Button Feedback
        const originalText = btn.innerText;
        btn.innerText = 'ANALYZING...';
        btn.style.backgroundColor = 'rgb(0, 66, 175)';
        btn.style.color = 'rgb(255, 252, 245)';

        setTimeout(() => {
          btn.innerText = 'DONE';
          setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = 'transparent';
            btn.style.color = 'rgb(0, 66, 175)';
            setStatus('Download successful');
          }, 3000);
        }, 1000);
      } catch (err) {
        console.error('Unexpected error in click handler', err);
        setStatus('Error: ' + (err.message || err), true);
      }
    });
  } catch (err) {
    console.error('Popup init failed', err);
    setStatus('Initialization failed: ' + (err.message || err), true);
  }
});