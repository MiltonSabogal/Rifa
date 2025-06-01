// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCvNhHpsbjinSUFRK3HTDJCCnVFh4DVoXI",
  authDomain: "rifa-misaga.firebaseapp.com",
  databaseURL: "https://rifa-misaga-default-rtdb.firebaseio.com",
  projectId: "rifa-misaga",
  storageBucket: "rifa-misaga.firebasestorage.app",
  messagingSenderId: "495411826218",
  appId: "1:495411826218:web:5fb2d24364b496d0cfbd53",
  measurementId: "G-CNPG01QT6H"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Verificar estado de conexión a Firebase
firebase.firestore().enableNetwork()
  .then(() => {
    console.log("Conectado a Firestore");
    // Podemos mostrar un indicador visual si lo deseamos
  })
  .catch((error) => {
    console.error("Error de conexión a Firestore:", error);
    showNotification('Error de conexión. Intenta recargar.', false);
  });

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
    const numerosOcupados = snapshot.docs.map(doc => doc.data().numero);
    
    // Generar todos los números del 00 al 99
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      const div = document.createElement('div');
      div.classList.add('number');
      div.innerText = num;
      div.dataset.num = num;

      // Marcar como ocupado si está en la lista
      if (numerosOcupados.includes(num)) {
        div.classList.add('ocupado');
        div.style.pointerEvents = 'none';
      }

      // Evento click para seleccionar/deseleccionar - CORREGIDO
      div.addEventListener('click', () => {
        if (div.classList.contains('ocupado')) return;
        
        // Limitar a 10 números máximo
        if (!selectedNumbers.includes(num) && selectedNumbers.length >= 10) {
          showNotification('Puedes seleccionar máximo 10 números', false);
          return;
        }
        
        if (selectedNumbers.includes(num)) {
          // Deseleccionar
          selectedNumbers = selectedNumbers.filter(n => n !== num);
          div.classList.remove('selected');
        } else {
          // Seleccionar
          selectedNumbers.push(num);
          div.classList.add('selected');
        }

        // Actualizar input y total
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
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();

    if (selectedNumbers.length === 0) return showNotification('Selecciona al menos un número.', false);
    if (!validateName(nombre)) return showNotification('Nombre inválido (mínimo 5 caracteres).', false);
    if (!validatePhone(telefono)) return showNotification('Teléfono inválido (10 a 15 dígitos).', false);

    submitBtn.disabled = true;
    submitSpinner.style.display = 'block';

    try {
      // Verificar disponibilidad con una sola consulta
      const snapshot = await db.collection('rifa')
        .where('numero', 'in', selectedNumbers)
        .get();

      if (!snapshot.empty) {
        const ocupados = snapshot.docs.map(doc => doc.data().numero);
        showNotification(`Los números ${ocupados.join(', ')} ya están ocupados. Por favor selecciona otros.`, false);
        return;
      }

      // Registrar cada número seleccionado
      const batch = db.batch();
      const reservaRef = db.collection('compradores').doc();
      
      // Guardar información del comprador
      batch.set(reservaRef, {
        nombre,
        telefono,
        numeros: selectedNumbers,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Marcar números como ocupados
      selectedNumbers.forEach(num => {
        const numRef = db.collection('rifa').doc();
        batch.set(numRef, { 
          numero: num,
          compradorId: reservaRef.id,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();

      // Actualizar UI: marcar números como ocupados
      selectedNumbers.forEach(num => {
        const div = document.querySelector(`.number[data-num="${num}"]`);
        if (div) {
          div.classList.add('ocupado');
          div.classList.remove('selected');
          div.style.pointerEvents = 'none';
        }
      });
      
      showNotification('¡Reserva exitosa! Gracias por tu apoyo. 🎉', true);
      
      // Resetear formulario
      selectedNumbers = [];
      inputNumero.value = '';
      totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
      form.reset();
      
    } catch (error) {
      console.error('Error al guardar:', error);
      
      // Mostrar mensaje de error más específico
      if (error.code === 'resource-exhausted') {
        showNotification('Límite de operaciones excedido. Intenta con menos números.', false);
      } else if (error.code === 'unavailable') {
        showNotification('Error de conexión con la base de datos. Verifica tu internet.', false);
      } else {
        showNotification('Error al procesar la reserva. Intenta de nuevo.', false);
      }
    } finally {
      submitBtn.disabled = false;
      submitSpinner.style.display = 'none';
    }
  });
});
