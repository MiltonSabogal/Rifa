 const container = document.getElementById('numeros-container');
const inputNumero = document.getElementById('numero');
const totalPago = document.getElementById('total-pago');

let selectedNumbers = [];

fetch('https://script.google.com/macros/s/AKfycbz-045QvsDb_20GL4JCArMwLT168xZn2d7JvCY_pRUClkbu23K7-7dDBAqWrnFlIHiT/exec')
  .then(response => response.json())
  .then(data => {
    const numerosOcupados = data;

    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      const div = document.createElement('div');
      div.classList.add('number');
      div.innerText = num;
      div.dataset.num = num;

      if (numerosOcupados.includes(num)) {
        div.classList.add('ocupado');
        div.style.backgroundColor = '#999';
        div.style.pointerEvents = 'none';
      }

      div.addEventListener('click', () => {
        if (selectedNumbers.includes(num)) {
          selectedNumbers = selectedNumbers.filter(n => n !== num);
          div.classList.remove('selected');
        } else {
          selectedNumbers.push(num);
          div.classList.add('selected');
        }

        inputNumero.value = selectedNumbers
          .slice()
          .sort((a, b) => a - b)
          .join(', ');

        totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 20000).toLocaleString('es-CO')}`;
      });

      container.appendChild(div);
    }
  });

document.getElementById('form-rifa').addEventListener('submit', function (e) {
  e.preventDefault();

  const numero = inputNumero.value;
  const nombre = document.getElementById('nombre').value;
  const telefono = document.getElementById('telefono').value;

  if (!numero || !nombre || !telefono) {
    alert("Por favor completa todos los campos.");
    return;
  }

  fetch('https://script.google.com/macros/s/AKfycbz-045QvsDb_20GL4JCArMwLT168xZn2d7JvCY_pRUClkbu23K7-7dDBAqWrnFlIHiT/exec', {
    method: 'POST',
    body: JSON.stringify({ numero, nombre, telefono }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => response.json())
    .then(data => {
      alert('¡Números reservados con éxito! 🎉');

      document.querySelectorAll('.number.selected').forEach(div => {
        div.style.backgroundColor = '#999';
        div.style.pointerEvents = 'none';
        div.classList.remove('selected');
        div.classList.add('ocupado');
      });

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
