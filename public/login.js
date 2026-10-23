// Bilder-Login: drei Tiere antippen, dann wird automatisch abgeschickt.
const form = document.getElementById('code-form');
const input = document.getElementById('code-input');
const dots = [...document.querySelectorAll('.code-dots span')];
const picked = [];

document.querySelectorAll('.pic').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (picked.length >= 3) return;
    picked.push(btn.dataset.id);
    dots[picked.length - 1].textContent = btn.textContent;
    dots[picked.length - 1].classList.add('on');
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 200);
    if (picked.length === 3) {
      input.value = picked.join(',');
      setTimeout(() => form.submit(), 250);
    }
  });
});
