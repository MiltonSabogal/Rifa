const container = document.getElementById('numeros-container');
const inputNumero = document.getElementById('numero');
let selectedNumber = null;

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
