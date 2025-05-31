const container = document.getElementById('numeros-container');
const form = document.getElementById('formulario');
const inputNombre = document.getElementById('nombre');
const inputTelefono = document.getElementById('telefono');
const inputNumero = document.getElementById('numero-seleccionado');
const formCompra = document.getElementById('compra-form');

// Lista de números ocupados (puedes cargarla desde una hoja o base de datos luego)
let numerosOcupados = [];

for (let i = 1; i <= 100; i++) {
  const div = document.createElement('div');
  div.textContent = i;
  div.classList.add('numero');
  if (numerosOcupados.includes(i)) {
    div.classList.add('ocupado');
  } else {
    div.addEventListener('click', () => {
      inputNumero.value = i;
      form.style.display = 'block';
    });
  }
  container.appendChild(div);
}

formCompra.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = inputNombre.value;
  const telefono = inputTelefono.value;
  const numero = inputNumero.value;

  // Aquí podríamos conectar con Google Sheets
  alert(`Gracias ${nombre}, reservaste el número ${numero}`);

  form.reset();
  form.style.display = 'none';
});

