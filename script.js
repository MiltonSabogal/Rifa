const container = document.getElementById('numeros-container');
const inputNumero = document.getElementById('numero');
let selectedNumber = null;

// Crear los números
for (let i = 1; i <= 100; i++) {
  const div = document.createElement('div');
  div.classList.add('number');
  div.innerText = i;
  div.addEventListener('click', () => {
    if (selectedNumber) {
      selectedNumber.classList.remove('selected');
    }
    div.classList.add('selected');
    selectedNumber = div;
    inputNumero.value = i;
  });
  container.appendChild(div);
}

// Manejar envío de formulario
document.getElementById('form-rifa').addEventListener('submit', function (e) {
  e.preventDefault();

  const numero = document.getElementById('numero').value;
  const nombre = document.getElementById('nombre').value;
  const telefono = document.getElementById('telefono').value;

  fetch('https://script.google.com/macros/s/AKfycbylDpVzxqhM8o9k1yvNkY8zP6d4hIxMfyyAbf7IH9SsWgnSEGGCPNLlKfbPkiILrX0F9Q/exec', {
    method: 'POST',
    body: JSON.stringify({
      numero,
      nombre,
      telefono
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(data => {
      alert('Número reservado con éxito 🎉');
      // Limpia el formulario
      document.getElementById('form-rifa').reset();
      if (selectedNumber) {
        selectedNumber.classList.add('selected');
        selectedNumber.style.backgroundColor = '#999';
        selectedNumber.style.pointerEvents = 'none';
      }
    })
    .catch(error => {
      alert('Error al enviar el formulario');
      console.error('Error:', error);
    });
});
