// Configurar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCvNhHpsbjinSUFRK3HTDJCCnVFh4DVoXI",
  authDomain: "rifa-misaga.firebaseapp.com",
  projectId: "rifa-misaga",
  storageBucket: "rifa-misaga.firebasestorage.app",
  messagingSenderId: "495411826218",
  appId: "1:495411826218:web:5fb2d24364b496d0cfbd53"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('numeros-container');
  const inputNumero = document.getElementById('numero');
  const totalPago = document.getElementById('total-pago');
  const notification = document.getElementById('notification');
  const form = document.getElementById('form-rifa');
  const spinner = document.getElementById('spinner');
  const submitSpinner = document.getElementById('submit-spinner');
  const submitBtn = document.getElementById('submit-btn');

  let selectedNumbers = [];
  spinner.style.display = 'block';

  // Función para mostrar notificaciones
  function showNotification(message, isSuccess) {
    notification.textContent = message;
    notification.className = isSuccess ? 'notification success show' : 'notification error show';
    setTimeout(() => notification.classList.remove('show'), 4000);
  }

  // Validaciones
  const validatePhone = phone => /^[0-9]{10,15}$/.test(phone);
  const validateName = name => name.trim().length >= 5;

  // Cargar los números ocupados desde Firestore
  db.collection('rifa').get().then(snapshot => {
    const numerosOcupados = snapshot.docs.map(doc => doc.id);

    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      const div = document.createElement('div');
      div.classList.add('number');
      div.innerText = num;
      div.dataset.num = num;

      if (numerosOcupados.includes(num)) {
        div.classList.add('ocupado');
        div.style.pointerEvents = 'none';
      }

      div.addEventListener('click', () => {
        if (div.classList.contains('ocupado')) return;

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

    spinner.style.display = 'none';
  }).catch(error => {
    console.error('Error al cargar números:', error);
    showNotification('Error al cargar números. Intenta recargar.', false);
    spinner.style.display = 'none';
  });

  // Procesar el formulario
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();

    if (selectedNumbers.length === 0) return showNotification('Selecciona al menos un número.', false);
    if (!validateName(nombre)) return showNotification('Nombre inválido (mínimo 5 caracteres).', false);
    if (!validatePhone(telefono)) return showNotification('Teléfono inválido (10 a 15 dígitos).', false);

    submitBtn.disabled = true;
    submitSpinner.style.display = 'block';

    // Verificar que no hayan sido tomados mientras el usuario llenaba el formulario
    Promise.all(selectedNumbers.map(num => db.collection('rifa').doc(num).get()))
      .then(snapshots => {
        const yaOcupados = snapshots.filter(doc => doc.exists).map(doc => doc.id);

        if (yaOcupados.length > 0) {
          showNotification(`Los siguientes números ya están ocupados: ${yaOcupados.join(', ')}`, false);
          submitBtn.disabled = false;
          submitSpinner.style.display = 'none';
        } else {
          // Registrar al comprador
          db.collection('compradores').add({
            nombre,
            telefono,
            numeros: selectedNumbers,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          }).then(() => {
            // Marcar los números como ocupados en 'rifa'
            const batch = db.batch();
            selectedNumbers.forEach(num => {
              const ref = db.collection('rifa').doc(num);
              batch.set(ref, { reservado: true });
            });

            return batch.commit();
          }).then(() => {
            // UI feedback
            selectedNumbers.forEach(num => {
              const div = document.querySelector(`.number[data-num="${num}"]`);
              if (div) {
                div.classList.add('ocupado');
                div.classList.remove('selected');
                div.style.pointerEvents = 'none';
              }
            });

            showNotification('¡Reserva exitosa! 🎉', true);
            selectedNumbers = [];
            inputNumero.value = '';
            totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
            form.reset();
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        showNotification('Error al guardar. Intenta de nuevo.', false);
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitSpinner.style.display = 'none';
      });
  });
});
