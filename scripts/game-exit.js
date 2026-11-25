document.querySelectorAll('[data-game-exit]').forEach(button => {
  button.addEventListener('click', () => {
    if (window.parent !== window && window.name === 'edugram-game') {
      // Local file previews have an opaque origin. The dashboard also checks the sending frame.
      const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
      window.parent.postMessage({ action: 'closeGame' }, targetOrigin);
    } else {
      window.location.href = button.dataset.gameExit;
    }
  });
});
