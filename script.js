// Configuración de Firebase (misma configuración)
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
let selectedNumbers = [];
let selectedTipoPago = '';
let selectedMetodo = '';
let currentReservationData = null;
let numerosOcupados = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;
const TOTAL_NUMEROS = 50; // AHORA 50 NÚMEROS

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

// Función para generar los números en la interfaz (solo 00 al 49)
function generarNumeros() {
  container.innerHTML = '';

  // Crear un set de números ocupados para búsqueda rápida
  const ocupadosMap = new Map();
  numerosOcupados.forEach(n => {
    ocupadosMap.set(n.numero, n);
  });

  for (let i = 0; i < TOTAL_NUMEROS; i++) {
    const num = i.toString().padStart(2, '0');
    const numeroInfo = ocupadosMap.get(num);
    
    if (numeroInfo) {
      if (numeroInfo.estado === 'pagado') {
        crearElementoNumero(num, 'pagado', 'Pagado');
      } else if (numeroInfo.estado === 'reservado') {
        crearElementoNumero(num, 'reservado', 'Reservado');
      }
    } else {
      crearElementoNumero(num, 'disponible');
    }
  }
  
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
    
    div.addEventListener('click', () => {
      // VERIFICAR EN TIEMPO REAL si el número sigue disponible
      verificarDisponibilidadNumero(num).then(disponible => {
        if (!disponible) {
          showNotification(`El número ${num} ya no está disponible. Actualizando...`, false);
          // Actualizar la interfaz
          div.classList.remove('disponible', 'selected');
          div.classList.add('reservado');
          div.innerHTML = `${num}<br><small>Ocupado</small>`;
          div.style.pointerEvents = 'none';
          
          // Remover de seleccionados si estaba seleccionado
          selectedNumbers = selectedNumbers.filter(n => n !== num);
          inputNumero.value = selectedNumbers.join(', ');
          totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 10000).toLocaleString('es-CO')}`;
          
          return;
        }

        // Si está disponible, proceder con la selección
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
    });
  }

  container.appendChild(div);
}

// Verificar disponibilidad en tiempo real
function verificarDisponibilidadNumero(numero) {
  return db.collection('numeros')
    .where('numero', '==', numero)
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

// Cargar números ocupados desde Firestore (solo dentro del rango 00-49)
function cargarNumerosOcupados() {
  const now = Date.now();

  if (now - cacheTimestamp < CACHE_DURATION && numerosOcupados.length > 0) {
    console.log("Cargando números desde caché local.");
    generarNumeros();
    return;
  }

  spinner.style.display = 'block';

  db.collection('numeros').get().then(snapshot => {
    const ocupados = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        numero: data.numero,
        estado: data.estado || 'reservado',
        metodo_pago: data.metodo_pago || 'efectivo',
        nombre: data.nombre,
        telefono: data.telefono
      };
    });
    // Filtrar solo números dentro del rango 00-49
    numerosOcupados = ocupados.filter(item => {
      const numInt = parseInt(item.numero, 10);
      return numInt >= 0 && numInt < TOTAL_NUMEROS;
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
      numerosOcupados = (data.numerosOcupados || []).filter(item => {
        const numInt = parseInt(item.numero, 10);
        return numInt >= 0 && numInt < TOTAL_NUMEROS;
      });
      cacheTimestamp = data.timestamp || 0;
      showNotification('Error al conectar. Usando datos locales.', false);
    } else {
      numerosOcupados = [];
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
    
    showNotification('Verificando disponibilidad de números...', true);
    
    verificarDisponibilidadNumerosSeleccionados().then(numerosNoDisponibles => {
      if (numerosNoDisponibles.length > 0) {
        showNotification(`Los números ${numerosNoDisponibles.join(', ')} ya no están disponibles. Por favor selecciona otros.`, false);
        
        numerosNoDisponibles.forEach(num => {
          const div = document.querySelector(`.number[data-num="${num}"]`);
          if (div) {
            div.classList.remove('disponible', 'selected');
            div.classList.add('reservado');
            div.innerHTML = `${num}<br><small>Ocupado</small>`;
            div.style.pointerEvents = 'none';
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        
        inputNumero.value = selectedNumbers.join(', ');
        totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 10000).toLocaleString('es-CO')}`;
        return;
      }
      
      currentReservationData = {
        numero: selectedNumbers.join(', '),
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
      guardarReservaEnFirebase();
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
            div.classList.add('reservado');
            div.innerHTML = `${num}<br><small>Ocupado</small>`;
            div.style.pointerEvents = 'none';
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        
        inputNumero.value = selectedNumbers.join(', ');
        totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 10000).toLocaleString('es-CO')}`;
        return;
      }
      
      currentReservationData.estado = 'pagado';
      currentReservationData.metodo_pago = selectedMetodo;
      guardarReservaEnFirebase();
    });
  });

  closeConfirmacion.addEventListener('click', resetModales);
  closePago.addEventListener('click', resetModales);
  window.addEventListener('click', function(event) {
    if (event.target === modalConfirmacionPago) resetModales();
    if (event.target === modalPago) resetModales();
  });
}

// Guardar en Firebase
function guardarReservaEnFirebase() {
  submitBtn.disabled = true;
  submitText.textContent = 'Procesando...';
  submitSpinner.style.display = 'inline-block';

  const verificaciones = selectedNumbers.map(num => 
    db.collection('numeros')
      .where('numero', '==', num)
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
            div.classList.add('ocupado');
            div.classList.remove('selected', 'disponible');
            div.style.pointerEvents = 'none';
            div.innerHTML = `${num}<br><small>Ocupado</small>`;
          }
          selectedNumbers = selectedNumbers.filter(n => n !== num);
        });
        inputNumero.value = selectedNumbers.join(', ');
        totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 10000).toLocaleString('es-CO')}`;
        throw new Error('Números ocupados');
      }

      const batch = db.batch();
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

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
      const mensaje = currentReservationData.estado === 'pagado'
        ? '¡Pago confirmado! Gracias por tu apoyo. 🎉'
        : '¡Reserva exitosa! Recuerda realizar tu pago en efectivo. 💵';
      showNotification(mensaje, true);
      
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
      
      selectedNumbers = [];
      inputNumero.value = '';
      totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
      form.reset();
      resetModales();
    })
    .catch(error => {
      console.error('Error al procesar la reserva:', error);
      if (error.message !== 'Números ocupados') {
        showNotification('Error al procesar la reserva: ' + error.message, false);
      }
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitText.textContent = '🎟️ Reservar números';
      submitSpinner.style.display = 'none';
    });
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventListeners();
  
  const cache = localStorage.getItem('cacheRifa');
  if (cache) {
    const data = JSON.parse(cache);
    numerosOcupados = (data.numerosOcupados || []).filter(item => {
      const numInt = parseInt(item.numero, 10);
      return numInt >= 0 && numInt < TOTAL_NUMEROS;
    });
    cacheTimestamp = data.timestamp || 0;
    generarNumeros();
  }

  cargarNumerosOcupados();
  
  const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (esMovil) document.body.classList.add('es-movil');
});
