// Buchstaben-Auswahl (Admin): Kacheln beim Antippen sofort umfärben.
document.querySelectorAll('.letters-form .letter input').forEach((cb) => {
  cb.addEventListener('change', () => {
    cb.parentElement.classList.toggle('on', cb.checked);
    cb.parentElement.classList.toggle('off', !cb.checked);
  });
});
