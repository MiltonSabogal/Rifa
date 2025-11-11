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

// Inicializar Firebase (sintaxis compat v8)
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
const formularioContainer = document.getElementById('formulario-container');
const connectionStatus = document.getElementById('connection-status');

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
const PRECIO_NUMERO = 10000; // $10.000 por número

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

  if (!numerosOcupados) {
    container.innerHTML = '<p class="error">Error al cargar números. Recarga la página</p>';
    spinner.style.display = 'none';
    return;
  }

  for (let i = 0; i < 100; i++) {
    const num = i.toString().padStart(2, '0');
    const div = document.createElement('div');
    div.classList.add('number');
    div.dataset.num = num;

    // Verificar estado del número
    const numeroInfo = numerosOcupados.find(n => n.numero === num);
    if (numeroInfo) {
      if (numeroInfo.estado === 'pagado') {
        div.classList.add('pagado');
        div.innerHTML = `${num}<br><small>Pagado</small>`;
        div.style.pointerEvents = 'none';
      } else if (numeroInfo.estado === 'reservado') {
        div.classList.add('reservado');
        div.innerHTML = `${num}<br><small>Reservado</small>`;
        div.style.pointerEvents = 'none';
      }
    } else {
      div.classList.add('disponible');
      div.innerText = num;
      
      // Evento click para seleccionar/deseleccionar
      div.addEventListener('click', () => {
        if (div.classList.contains('pagado') || div.classList.contains('reservado')) return;

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
        totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * PRECIO_NUMERO).toLocaleString('es-CO')}`;
      });
    }

    container.appendChild(div);
  }
  spinner.style.display = 'none';
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

    // Actualizar estado de conexión
    connectionStatus.textContent = 'Conectado';
    connectionStatus.className = 'connection-status online';

  }).catch(error => {
    console.error('Error al cargar números desde Firestore:', error);

    const cache = localStorage.getItem('cacheRifa');
    if (cache) {
      const data = JSON.parse(cache);
      numerosOcupados = data.numerosOcupados || [];
      cacheTimestamp = data.timestamp || 0;
      showNotification('Error al conectar. Usando datos locales.', false);
      connectionStatus.textContent = 'Modo offline';
      connectionStatus.className = 'connection-status offline';
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
    estado: 'reservado' // Por defecto se reserva
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
