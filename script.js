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

// Modales
const modalConfirmacionPago = document.getElementById('modalConfirmacionPago');
const modalPago = document.getElementById('modalPago');
const closeConfirmacion = document.getElementById('closeConfirmacion');
const closePago = document.getElementById('closePago');

// Elementos de los modales
const opcionesConfirmacion = document.querySelectorAll('.opcion-confirmacion');
const confirmarTipoPagoBtn = document.getElementById('confirmarTipoPago');
const metodosPago = document.querySelectorAll('.metodo-option');
const infoNequi = document.getElementById('info-nequi');
const btnConfirmar = document.getElementById('confirmarReserva');

// Variables globales
let selectedNumbers = [];        // Almacena exactamente dos números seleccionados
let selectedTipoPago = '';
let selectedMetodo = '';
let currentReservationData = null;
let tickets = [];                // Lista de boletas (tickets) cargadas
let numerosOcupados = new Set(); // Set de números ya tomados
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;
const TOTAL_NUMEROS = 100;       // 00-99
const PRECIO_BOLETA = 10000;

// Función para mostrar notificaciones
function showNotification(message, isSuccess) {
  notification.textContent = message;
  notification.className = isSuccess ? 'notification success show' : 'notification error show';
  setTimeout(() => {
    notification.classList.remove('show');
  }, 4000);
}

// Validaciones
const validatePhone = phone => /^[0-9]{10,15}$/.test(phone);
const validateName = name => name.trim().length >= 5;

// Función para generar los números en la interfaz
function generarNumeros() {
  container.innerHTML = '';

  for (let i = 0; i < TOTAL_NUMEROS; i++) {
    const num = i.toString().padStart(2, '0');
    const ocupado = numerosOcupados.has(num);
    crearElementoNumero(num, ocupado);
  }
  
  spinner.style.display = 'none';
}

// Función auxiliar para crear elementos de número
function crearElementoNumero(num, ocupado) {
  const div = document.createElement('div');
  div.classList.add('number');
  div.dataset.num = num;

  if (ocupado) {
    div.classList.add('ocupado');
    div.innerHTML = `${num}<br><small>Ocupado</small>`;
    div.style.pointerEvents = 'none';
  } else {
    div.classList.add('disponible');
    div.innerText = num;
    
    div.addEventListener('click', () => {
      // Verificar en tiempo real si el número sigue disponible
      verificarDisponibilidadNumero(num).then(disponible => {
        if (!disponible) {
          showNotification(`El número ${num} ya no está disponible. Actualizando...`, false);
          // Actualizar la interfaz
          div.classList.remove('disponible', 'selected');
          div.classList.add('ocupado');
          div.innerHTML = `${num}<br><small>Ocupado</small>`;
          div.style.pointerEvents = 'none';
          
          // Remover de seleccionados si estaba seleccionado
          selectedNumbers = selectedNumbers.filter(n => n !== num);
          actualizarSeleccion();
          return;
        }

        // Manejar selección (máximo 2 números)
        if (selectedNumbers.includes(num)) {
          selectedNumbers = selectedNumbers.filter(n => n !== num);
          div.classList.remove('selected');
        } else {
          if (selectedNumbers.length >= 2) {
            showNotification('Solo puedes seleccionar 2 números por boleta.', false);
            return;
          }
          selectedNumbers.push(num);
          div.classList.add('selected');
        }

        actualizarSeleccion();
      });
    });
  }

  container.appendChild(div);
}

// Actualizar campo de texto y total después de selección
function actualizarSeleccion() {
  inputNumero.value = selectedNumbers.join(', ');
  totalPago.innerHTML = `<strong>Total a pagar:</strong> $${PRECIO_BOLETA.toLocaleString('es-CO')}`;
}

// Verificar disponibilidad en tiempo real
function verificarDisponibilidadNumero(numero) {
  return db.collection('tickets')
    .where('numeros', 'array-contains', numero)
    .limit(1)
    .get()
    .then(snapshot => snapshot.empty)
    .catch(error => {
      console.error('Error verificando disponibilidad:', error);
      return false;
    });
}

// Verificar TODOS los números seleccionados
function verificarDisponibilidadNumerosSeleccionados() {
  const verificaciones = selectedNumbers.map(num => 
    verificarDisponibilidadNumero(num).then(disponible => ({ num, disponible }))
  );
  return Promise.all(verificaciones).then(results => {
    const noDisponibles = results.filter(result => !result.disponible).map(result => result.num);
    return noDisponibles;
  });
}

// Cargar tickets desde Firestore y actualizar numerosOcupados
function cargarTickets() {
  const now = Date.now();

  if (now - cacheTimestamp < CACHE_DURATION && tickets.length > 0) {
    console.log("Cargando tickets desde caché local.");
    generarNumeros();
    return;
  }

  spinner.style.display = 'block';

  db.collection('tickets').get().then(snapshot => {
    tickets = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'Sin fecha'
      };
    });
    
    // Construir conjunto de números ocupados
    numerosOcupados.clear();
    tickets.forEach(ticket => {
      ticket.numeros.forEach(num => numerosOcupados.add(num));
    });
    
    cacheTimestamp = Date.now();
    console.log(`Tickets cargados: ${tickets.length}, números ocupados: ${numerosOcupados.size}`);
    generarNumeros();

    localStorage.setItem('cacheRifa', JSON.stringify({
      tickets,
      numerosOcupados: Array.from(numerosOcupados),
      timestamp: cacheTimestamp
    }));
  }).catch(error => {
    console.error('Error al cargar tickets:', error);

    const cache = localStorage.getItem('cacheRifa');
    if (cache) {
      const data = JSON.parse(cache);
      tickets = data.tickets || [];
      numerosOcupados.clear();
      (data.numerosOcupados || []).forEach(num => numerosOcupados.add(num));
      cacheTimestamp = data.timestamp || 0;
      showNotification('Error al conectar. Usando datos locales.', false);
    } else {
      tickets = [];
      numerosOcupados.clear();
    }

    generarNumeros();
  });
}

// Mostrar modal de confirmación de pago
function mostrarModalConfirmacionPago() {
  resetModales();
  modalConfirmacionPago.style.display = 'block';
}

// Resetear modales
function resetModales() {
  modalConfirmacionPago.style.display = 'none';
  modalPago.style.display = 'none';
  
  opcionesConfirmacion.forEach(o => o.classList.remove('selected'));
  metodosPago.forEach(m => m.classList.remove('selected'));
  
  selectedTipoPago = '';
  selectedMetodo = '';
  infoNequi.style.display = 'none';
}

// INICIALIZAR EVENT LISTENERS
function inicializarEventListeners() {
  console.log("Inicializando event listeners...");
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    
    if (selectedNumbers.length !== 2) {
      showNotification('Debes seleccionar exactamente 2 números para comprar una boleta.', false);
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
    
    showNotification('Verificando disponibilidad de números...', true);
    
    verificarDisponibilidadNumerosSeleccionados().then(numerosNoDisponibles => {
      if (numerosNoDisponibles.length > 0) {
        showNotification(`Los números ${numerosNoDisponibles.join(', ')} ya no están disponibles. Por favor selecciona otros.`, false);
        
        numerosNoDisponibles.forEach(num => {
          const div = document.querySelector(`.number[data-num="${num}"]`);
          if (div) {
            div.classList.remove('disponible', 'selected');
            div.classList.add('ocupado');
            div.innerHTML = `${num}<br><small>Ocupado</small>`;
            div.style.pointerEvents = 'none';
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        
        actualizarSeleccion();
        return;
      }
      
      currentReservationData = {
        numeros: [...selectedNumbers],
        nombre: nombre,
        telefono: telefono
      };
      
      mostrarModalConfirmacionPago();
    });
  });

  opcionesConfirmacion.forEach(opcion => {
    opcion.addEventListener('click', function() {
      opcionesConfirmacion.forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      selectedTipoPago = this.dataset.tipo;
    });
  });

  confirmarTipoPagoBtn.addEventListener('click', function() {
    if (!selectedTipoPago) {
      showNotification('Por favor, selecciona una opción de pago.', false);
      return;
    }
    
    if (selectedTipoPago === 'pago-inmediato') {
      modalConfirmacionPago.style.display = 'none';
      modalPago.style.display = 'block';
    } else {
      currentReservationData.estado = 'reservado';
      currentReservationData.metodo_pago = 'efectivo';
      guardarTicketEnFirebase();
    }
  });

  metodosPago.forEach(metodo => {
    metodo.addEventListener('click', function() {
      metodosPago.forEach(m => m.classList.remove('selected'));
      this.classList.add('selected');
      selectedMetodo = this.dataset.metodo;
      
      if (selectedMetodo === 'nequi' || selectedMetodo === 'daviplata') {
        infoNequi.style.display = 'block';
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
    
    showNotification('Verificando última disponibilidad...', true);
    
    verificarDisponibilidadNumerosSeleccionados().then(numerosNoDisponibles => {
      if (numerosNoDisponibles.length > 0) {
        showNotification(`Los números ${numerosNoDisponibles.join(', ')} ya no están disponibles. Por favor selecciona otros.`, false);
        
        numerosNoDisponibles.forEach(num => {
          const div = document.querySelector(`.number[data-num="${num}"]`);
          if (div) {
            div.classList.remove('disponible', 'selected');
            div.classList.add('ocupado');
            div.innerHTML = `${num}<br><small>Ocupado</small>`;
            div.style.pointerEvents = 'none';
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        
        actualizarSeleccion();
        return;
      }
      
      currentReservationData.estado = 'pagado';
      currentReservationData.metodo_pago = selectedMetodo;
      guardarTicketEnFirebase();
    });
  });

  closeConfirmacion.addEventListener('click', resetModales);
  closePago.addEventListener('click', resetModales);
  window.addEventListener('click', function(event) {
    if (event.target === modalConfirmacionPago) resetModales();
    if (event.target === modalPago) resetModales();
  });
}

// Guardar ticket en Firebase
function guardarTicketEnFirebase() {
  submitBtn.disabled = true;
  submitText.textContent = 'Procesando...';
  submitSpinner.style.display = 'inline-block';

  // Verificación final de disponibilidad de cada número
  const verificaciones = currentReservationData.numeros.map(num => 
    db.collection('tickets')
      .where('numeros', 'array-contains', num)
      .limit(1)
      .get()
      .then(snap => ({ num, disponible: snap.empty }))
  );

  Promise.all(verificaciones)
    .then(results => {
      const ocupadosRecien = results.filter(result => !result.disponible).map(result => result.num);

      if (ocupadosRecien.length > 0) {
        showNotification(`Los números ${ocupadosRecien.join(', ')} ya están ocupados. Por favor selecciona otros.`, false);
        ocupadosRecien.forEach(num => {
          const div = document.querySelector(`.number[data-num="${num}"]`);
          if (div) {
            div.classList.remove('disponible', 'selected');
            div.classList.add('ocupado');
            div.innerHTML = `${num}<br><small>Ocupado</small>`;
            div.style.pointerEvents = 'none';
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        actualizarSeleccion();
        throw new Error('Números ocupados');
      }

      // Crear documento en tickets
      const ticketRef = db.collection('tickets').doc();
      const ticketData = {
        numeros: currentReservationData.numeros,
        nombre: currentReservationData.nombre,
        telefono: currentReservationData.telefono,
        estado: currentReservationData.estado,
        metodo_pago: currentReservationData.metodo_pago,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      return ticketRef.set(ticketData);
    })
    .then(() => {
      const mensaje = currentReservationData.estado === 'pagado'
        ? '¡Pago confirmado! Gracias por tu apoyo. 🎉'
        : '¡Boleta reservada! Recuerda realizar tu pago en efectivo. 💵';
      showNotification(mensaje, true);
      
      // Actualizar UI localmente
      currentReservationData.numeros.forEach(num => {
        const div = document.querySelector(`.number[data-num="${num}"]`);
        if (div) {
          div.classList.remove('disponible', 'selected');
          div.classList.add('ocupado');
          div.innerHTML = `${num}<br><small>Ocupado</small>`;
          div.style.pointerEvents = 'none';
        }
        numerosOcupados.add(num);
      });
      
      // Actualizar caché local
      tickets.push({
        numeros: currentReservationData.numeros,
        nombre: currentReservationData.nombre,
        telefono: currentReservationData.telefono,
        estado: currentReservationData.estado,
        metodo_pago: currentReservationData.metodo_pago,
        fecha: new Date().toLocaleString()
      });
      localStorage.setItem('cacheRifa', JSON.stringify({
        tickets,
        numerosOcupados: Array.from(numerosOcupados),
        timestamp: Date.now()
      }));
      
      // Resetear selección
      selectedNumbers = [];
      actualizarSeleccion();
      form.reset();
      resetModales();
    })
    .catch(error => {
      console.error('Error al procesar la boleta:', error);
      if (error.message !== 'Números ocupados') {
        showNotification('Error al procesar la boleta: ' + error.message, false);
      }
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitText.textContent = '🎟️ Comprar boleta (2 números)';
      submitSpinner.style.display = 'none';
    });
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventListeners();
  
  const cache = localStorage.getItem('cacheRifa');
  if (cache) {
    const data = JSON.parse(cache);
    tickets = data.tickets || [];
    numerosOcupados.clear();
    (data.numerosOcupados || []).forEach(num => numerosOcupados.add(num));
    cacheTimestamp = data.timestamp || 0;
    generarNumeros();
  }

  cargarTickets();
  
  const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (esMovil) document.body.classList.add('es-movil');
});
