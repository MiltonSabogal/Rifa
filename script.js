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

// Elementos del DOM
const container = document.getElementById('numeros-container');
const inputNumero = document.getElementById('numero');
const totalPago = document.getElementById('total-pago');
const notification = document.getElementById('notification');
const form = document.getElementById('form-rifa');
const spinner = document.getElementById('spinner');
const submitSpinner = document.getElementById('submit-spinner');
const submitBtn = document.getElementById('submit-btn');
const submitText = document.getElementById('submit-text');

// Modal elements
const modalPago = document.getElementById('modalPago');
const closeModal = document.querySelector('.close');
const metodosPago = document.querySelectorAll('.metodo-option');
const infoNequi = document.getElementById('info-nequi');
const btnConfirmar = document.getElementById('confirmarReserva');

// Variables globales
let selectedNumbers = [];
let selectedMetodo = '';
let currentReservationData = null;
let numerosOcupados = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

// Función para mostrar notificaciones
function showNotification(message, isSuccess) {
  notification.textContent = message;
  notification.className = isSuccess ? 'notification success show' : 'notification error show';
  setTimeout(() => notification.classList.remove('show'), 4000);
}

// Validaciones
const validatePhone = phone => /^[0-9]{10,15}$/.test(phone);
const validateName = name => name.trim().length >= 5;

// Función para generar los números en la interfaz
function generarNumeros() {
  container.innerHTML = '';

  if (!numerosOcupados || numerosOcupados.length === 0) {
    // Si no hay números ocupados, generar todos como disponibles
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      crearElementoNumero(num, 'disponible');
    }
    spinner.style.display = 'none';
    return;
  }

  // Crear array de todos los números del 00 al 99
  const todosNumeros = Array.from({length: 100}, (_, i) => i.toString().padStart(2, '0'));
  
  // Crear elementos para cada número
  todosNumeros.forEach(num => {
    const numeroInfo = numerosOcupados.find(n => n.numero === num);
    
    if (numeroInfo) {
      if (numeroInfo.estado === 'pagado') {
        crearElementoNumero(num, 'pagado', 'Pagado');
      } else if (numeroInfo.estado === 'reservado') {
        crearElementoNumero(num, 'reservado', 'Reservado');
      }
    } else {
      crearElementoNumero(num, 'disponible');
    }
  });
  
  spinner.style.display = 'none';
}

// Función auxiliar para crear elementos de número
function crearElementoNumero(num, estado, textoExtra = '') {
  const div = document.createElement('div');
  div.classList.add('number', estado);
  div.dataset.num = num;

  if (estado === 'pagado') {
    div.innerHTML = `${num}<br><small>Pagado</small>`;
    div.style.pointerEvents = 'none';
  } else if (estado === 'reservado') {
    div.innerHTML = `${num}<br><small>Reservado</small>`;
    div.style.pointerEvents = 'none';
  } else {
    div.innerText = num;
    
    // Evento click para seleccionar/deseleccionar
    div.addEventListener('click', () => {
      if (!selectedNumbers.includes(num) && selectedNumbers.length >= 10) {
        showNotification('Puedes seleccionar máximo 10 números', false);
        return;
      }

      if (selectedNumbers.includes(num)) {
        selectedNumbers = selectedNumbers.filter(n => n !== num);
        div.classList.remove('selected');
      } else {
        selectedNumbers.push(num);
        div.classList.add('selected');
      }

      inputNumero.value = selectedNumbers.join(', ');
      totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 10000).toLocaleString('es-CO')}`;
    });
  }

  container.appendChild(div);
}

// Función para cargar números ocupados desde Firestore
function cargarNumerosOcupados() {
  const now = Date.now();

  if (now - cacheTimestamp < CACHE_DURATION && numerosOcupados.length > 0) {
    console.log("Cargando números desde caché local.");
    generarNumeros();
    return;
  }

  spinner.style.display = 'block';

  db.collection('numeros').get().then(snapshot => {
    numerosOcupados = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        numero: data.numero,
        estado: data.estado || 'reservado',
        metodo_pago: data.metodo_pago || 'efectivo',
        nombre: data.nombre,
        telefono: data.telefono
      };
    });
    
    cacheTimestamp = Date.now();
    console.log("Números cargados de Firestore:", numerosOcupados);
    generarNumeros();

    localStorage.setItem('cacheRifa', JSON.stringify({
      numerosOcupados,
      timestamp: cacheTimestamp
    }));
  }).catch(error => {
    console.error('Error al cargar números desde Firestore:', error);

    const cache = localStorage.getItem('cacheRifa');
    if (cache) {
      const data = JSON.parse(cache);
      numerosOcupados = data.numerosOcupados || [];
      cacheTimestamp = data.timestamp || 0;
      showNotification('Error al conectar. Usando datos locales.', false);
    } else {
      showNotification('Error al cargar números. Intenta recargar.', false);
      numerosOcupados = [];
    }

    generarNumeros();
  });
}

// Manejar envío del formulario
form.addEventListener('submit', function(e) {
  e.preventDefault();
  
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  
  // Validaciones
  if (selectedNumbers.length === 0) {
    showNotification('Por favor, selecciona al menos un número.', false);
    return;
  }
  
  if (!validateName(nombre)) {
    showNotification('Por favor, ingresa tu nombre completo (mínimo 5 caracteres).', false);
    return;
  }
  
  if (!validatePhone(telefono)) {
    showNotification('Por favor, ingresa un número de teléfono válido (10 a 15 dígitos).', false);
    return;
  }
  
  // Guardar datos de la reserva y mostrar modal de pago
  currentReservationData = {
    numero: selectedNumbers.join(', '),
    nombre: nombre,
    telefono: telefono,
    estado: 'reservado'
  };
  
  // Mostrar modal de pago
  modalPago.style.display = 'block';
});

// Cerrar modal
closeModal.addEventListener('click', function() {
  modalPago.style.display = 'none';
  resetModal();
});

// Cerrar modal al hacer click fuera
window.addEventListener('click', function(event) {
  if (event.target === modalPago) {
    modalPago.style.display = 'none';
    resetModal();
  }
});

// Seleccionar método de pago
metodosPago.forEach(metodo => {
  metodo.addEventListener('click', function() {
    metodosPago.forEach(m => m.classList.remove('selected'));
    this.classList.add('selected');
    selectedMetodo = this.dataset.metodo;
    
    // Mostrar información adicional para Nequi/DaviPlata
    if (selectedMetodo === 'nequi' || selectedMetodo === 'daviplata') {
      infoNequi.style.display = 'block';
      // Auto-scroll suave al botón de confirmar
      setTimeout(() => {
        btnConfirmar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } else {
      infoNequi.style.display = 'none';
    }
  });
});

// Confirmar reserva
btnConfirmar.addEventListener('click', function() {
  if (!selectedMetodo) {
    showNotification('Por favor, selecciona un método de pago.', false);
    return;
  }
  
  procesarReserva();
});

// Función para procesar la reserva en Firebase - ACTUALIZADA
function procesarReserva() {
  // Determinar estado según método de pago - CORREGIDO
  if (selectedMetodo === 'efectivo') {
    // Para efectivo, el usuario elige si ya pagó o va a pagar después
    mostrarOpcionPagoEfectivo();
    return;
  } else {
    // Para Nequi/DaviPlata, se marca como PAGADO inmediatamente
    currentReservationData.estado = 'pagado';
    currentReservationData.metodo_pago = selectedMetodo;
    guardarReservaEnFirebase();
  }
}

// Nueva función para opción de pago en efectivo
function mostrarOpcionPagoEfectivo() {
  const modalContent = document.querySelector('.modal-content');
  const contenidoOriginal = modalContent.innerHTML;
  
  modalContent.innerHTML = `
    <span class="close">&times;</span>
    <h2>💵 Pago en Efectivo</h2>
    <div class="opciones-efectivo">
      <div class="opcion-pago" data-estado="pagado">
        <h3>✅ Ya pagué</h3>
        <p>Marcar número como <strong>PAGADO</strong> (verde)</p>
      </div>
      <div class="opcion-pago" data-estado="reservado">
        <h3>⏰ Pagaré después</h3>
        <p>Marcar número como <strong>RESERVADO</strong> (amarillo)</p>
      </div>
    </div>
    <button id="confirmarOpcionPago" class="btn-confirmar">✅ Confirmar</button>
  `;

  // Nuevo listener para cerrar modal
  document.querySelector('.close').addEventListener('click', function() {
    modalPago.style.display = 'none';
    resetModal();
    modalContent.innerHTML = contenidoOriginal;
    restaurarEventListenersModal();
  });

  // Listeners para las opciones de pago
  document.querySelectorAll('.opcion-pago').forEach(opcion => {
    opcion.addEventListener('click', function() {
      document.querySelectorAll('.opcion-pago').forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      currentReservationData.estado_efectivo = this.dataset.estado;
    });
  });

  // Confirmar opción de pago
  document.getElementById('confirmarOpcionPago').addEventListener('click', function() {
    if (!currentReservationData.estado_efectivo) {
      showNotification('Por favor, selecciona una opción de pago.', false);
      return;
    }

    currentReservationData.estado = currentReservationData.estado_efectivo;
    currentReservationData.metodo_pago = 'efectivo';
    
    guardarReservaEnFirebase();
  });
}

// Función para guardar en Firebase (separada para reutilizar)
function guardarReservaEnFirebase() {
  submitBtn.disabled = true;
  submitText.textContent = 'Procesando...';
  submitSpinner.style.display = 'inline-block';

  // Verificar disponibilidad de números
  const verificaciones = selectedNumbers.map(num => 
    db.collection('numeros')
      .where('numero', '==', num)
      .limit(1)
      .get()
      .then(snap => ({ num, disponible: snap.empty }))
  );

  Promise.all(verificaciones)
    .then(results => {
      const ocupadosRecien = results
        .filter(result => !result.disponible)
        .map(result => result.num);

      if (ocupadosRecien.length > 0) {
        showNotification(`Los números ${ocupadosRecien.join(', ')} ya están ocupados. Por favor selecciona otros.`, false);
        ocupadosRecien.forEach(num => {
          const div = document.querySelector(`.number[data-num="${num}"]`);
          if (div) {
            div.classList.add('ocupado');
            div.classList.remove('selected');
            div.style.pointerEvents = 'none';
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        inputNumero.value = selectedNumbers.join(', ');
        totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 10000).toLocaleString('es-CO')}`;
        throw new Error('Números ocupados');
      }

      // Guardar en Firebase
      const batch = db.batch();
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

      // Guardar cada número individualmente
      selectedNumbers.forEach(num => {
        const numRef = db.collection('numeros').doc();
        batch.set(numRef, {
          numero: num,
          nombre: currentReservationData.nombre,
          telefono: currentReservationData.telefono,
          estado: currentReservationData.estado,
          metodo_pago: currentReservationData.metodo_pago,
          timestamp: timestamp
        });
      });

      // Guardar en compradores para tener un registro completo
      const compradorRef = db.collection('compradores').doc();
      batch.set(compradorRef, {
        nombre: currentReservationData.nombre,
        telefono: currentReservationData.telefono,
        numeros: selectedNumbers,
        estado: currentReservationData.estado,
        metodo_pago: currentReservationData.metodo_pago,
        timestamp: timestamp
      });

      return batch.commit();
    })
    .then(() => {
      let mensaje = '';
      
      if (currentReservationData.estado === 'pagado') {
        mensaje = '¡Pago confirmado! Gracias por tu apoyo. 🎉';
      } else {
        mensaje = '¡Reserva exitosa! Recuerda realizar tu pago en efectivo. 💵';
      }
      
      showNotification(mensaje, true);
      
      // Actualizar UI
      selectedNumbers.forEach(num => {
        const div = document.querySelector(`.number[data-num="${num}"]`);
        if (div) {
          if (currentReservationData.estado === 'pagado') {
            div.classList.remove('selected', 'disponible');
            div.classList.add('pagado');
            div.innerHTML = `${num}<br><small>Pagado</small>`;
          } else {
            div.classList.remove('selected', 'disponible');
            div.classList.add('reservado');
            div.innerHTML = `${num}<br><small>Reservado</small>`;
          }
          div.style.pointerEvents = 'none';
        }
      });
      
      // Actualizar caché local
      selectedNumbers.forEach(num => {
        numerosOcupados.push({
          numero: num,
          estado: currentReservationData.estado,
          metodo_pago: currentReservationData.metodo_pago,
          nombre: currentReservationData.nombre,
          telefono: currentReservationData.telefono
        });
      });

      localStorage.setItem('cacheRifa', JSON.stringify({
        numerosOcupados,
        timestamp: Date.now()
      }));
      
      // Resetear todo
      selectedNumbers = [];
      inputNumero.value = '';
      totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
      form.reset();
      modalPago.style.display = 'none';
      resetModal();
      
    })
    .catch(error => {
      console.error('Error al procesar la reserva:', error);
      if (error.message === 'Números ocupados') {
        // Ya se manejó arriba
      } else if (error.code === 'resource-exhausted') {
        showNotification('Límite de operaciones excedido. Intenta con menos números.', false);
      } else if (error.code === 'unavailable') {
        showNotification('Error de conexión. Verifica tu internet.', false);
      } else {
        showNotification('Error al procesar la reserva: ' + error.message, false);
      }
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitText.textContent = '🎄 Reservar números';
      submitSpinner.style.display = 'none';
    });
}

// Función para resetear modal
function resetModal() {
  metodosPago.forEach(m => m.classList.remove('selected'));
  selectedMetodo = '';
  infoNequi.style.display = 'none';
  currentReservationData = null;
}

// Función para restaurar event listeners del modal original
function restaurarEventListenersModal() {
  // Restaurar listeners del modal original
  closeModal.addEventListener('click', function() {
    modalPago.style.display = 'none';
    resetModal();
  });

  metodosPago.forEach(metodo => {
    metodo.addEventListener('click', function() {
      metodosPago.forEach(m => m.classList.remove('selected'));
      this.classList.add('selected');
      selectedMetodo = this.dataset.metodo;
      
      if (selectedMetodo === 'nequi' || selectedMetodo === 'daviplata') {
        infoNequi.style.display = 'block';
        setTimeout(() => {
          btnConfirmar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      } else {
        infoNequi.style.display = 'none';
      }
    });
  });

  btnConfirmar.addEventListener('click', function() {
    if (!selectedMetodo) {
      showNotification('Por favor, selecciona un método de pago.', false);
      return;
    }
    procesarReserva();
  });
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Cargar desde caché local al inicio
  const cache = localStorage.getItem('cacheRifa');
  if (cache) {
    const data = JSON.parse(cache);
    numerosOcupados = data.numerosOcupados || [];
    cacheTimestamp = data.timestamp || 0;
    generarNumeros();
  }

  // Cargar datos actualizados de Firestore
  cargarNumerosOcupados();
});
