window.afterInit = (T, S) => {
  const t = T.find((q) => q.key === 'INV-72033');
  const p = t.pl.test;
  const d = document.createElement('div'); d.className = 'ov shotnote'; d.style.left = ((p.x + 18) * 2) + 'px'; d.style.top = ((p.y - 30) * 2) + 'px'; d.textContent = 'what it saw'; document.getElementById('stage').appendChild(d);
};
