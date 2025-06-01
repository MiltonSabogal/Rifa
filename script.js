const container = document.getElementById('numeros-container');
const inputNumero = document.getElementById('numero');
const totalPago = document.getElementById('total-pago');

let selectedNumbers = [];

// Crear los números del 00 al 99
for (let i = 0; i < 100; i++) {
  const num = i.toString().padStart(2, '0');
  const div = document.createElement('div');
  div.classList.add('number');
  div.innerText = num;
  div.dataset.num = num;

  div.addEventListener('click', () => {
    if (selectedNumbers.includes(num)) {
      selectedNumbers = selectedNumbers.filter(n => n !== num);
      div.classList.remove('selected');
    } else {
      selectedNumbers.push(num);
      div.classList.add('selected');
    }
    inputNumero.value = selectedNumbers.join(', ');
    totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 20000).toLocaleString('es-CO')}`;
  });

  container.appendChild(div);
}

document.getElementById('form-rifa').addEventListener('submit', function (e) {
  e.preventDefault();

  const numero = inputNumero.value;
  const nombre = document.getElementById('nombre').value;
  const telefono = document.getElementById('telefono').value;

  fetch('https://script.google.com/macros/s/AKfycbylDpVzxqhM8o9k1yvNkY8zP6d4hIxMfyyAbf7IH9SsWgnSEGGCPNLlKfbPkiILrX0F9Q/exec', {
    method: 'POST',
    body: JSON.stringify({ numero, nombre, telefono }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(data => {
      alert('¡Números reservados con éxito! 🎉');

      // Desactivar números seleccionados
      document.querySelectorAll('.number.selected').forEach(div => {
        div.style.backgroundColor = '#999';
        div.style.pointerEvents = 'none';
      });

      // Limpiar selección
      selectedNumbers = [];
      document.getElementById('form-rifa').reset();
      inputNumero.value = '';
      totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
    })
    .catch(error => {
      alert('Error al enviar el formulario');
      console.error('Error:', error);
    });
});
