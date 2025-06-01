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
const connectionStatus = document.getElementById('connection-status');
const formularioContainer = document.getElementById('formulario-container');

// Variables globales
let selectedNumbers = [];
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

// Función para generar los números
function generarNumeros() {
  // Limpiar contenedor antes de generar
  container.innerHTML = '';
  
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

    // Evento click para seleccionar/deseleccionar
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
}

// Función para cargar números ocupados con caché
function cargarNumerosOcupados() {
  const now = Date.now();
  
  // Usar caché si está fresco
  if (now - cacheTimestamp < CACHE_DURATION && numerosOcupados.length > 0) {
    generarNumeros(); // Asegurarse de llamar a generarNumeros aquí
    return;
  }
  
  spinner.style.display = 'block';
  
  db.collection('rifa').get().then(snapshot => {
    numerosOcupados = snapshot.docs.map(doc => doc.data().numero);
    cacheTimestamp = Date.now();
    generarNumeros(); // Llamar a generarNumeros después de obtener datos
    
    // Guardar en localStorage
    localStorage.setItem('cacheRifa', JSON.stringify({
      numerosOcupados,
      timestamp: cacheTimestamp
    }));
  }).catch(error => {
    console.error('Error al cargar números:', error);
    
    // Intentar cargar desde caché
    const cache = localStorage.getItem('cacheRifa');
    if (cache) {
      const data = JSON.parse(cache);
      numerosOcupados = data.numerosOcupados || [];
      cacheTimestamp = data.timestamp || 0;
      showNotification('Usando datos locales. Error al conectar con el servidor.', false);
    } else {
      showNotification('Error al cargar números. Generando todos disponibles.', false);
      numerosOcupados = [];
    }
    
    generarNumeros(); // Asegurarse de llamar a generarNumeros en caso de error
  });
}

// Verificar conexión a Firebase
function verificarConexion() {
  firebase.database().ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
      connectionStatus.textContent = 'Conectado';
      connectionStatus.className = 'connection-status online';
    } else {
      connectionStatus.textContent = 'Sin conexión';
      connectionStatus.className = 'connection-status offline';
    }
  });
}

// Mostrar mensaje de pago después de reserva exitosa
function mostrarMensajePago() {
  const total = selectedNumbers.length * 20000;
  const mensajePago = `
    <div class="mensaje-pago">
      <h3>¡Gracias por reservar tu número!</h3>
      <p>Por favor realiza el pago de <strong>$${total.toLocaleString('es-CO')}</strong> a:</p>
      <ul>
        <li>💳 Nequi: 3142802903</li>
        <li>📲 Daviplata: 3142802903</li>
      </ul>
      <p>Después de pagar, envía el comprobante por WhatsApp:</p>
      <a href="https://wa.me/573142802903?text=Hola,%20ya%20realicé%20el%20pago%20de%20mi%20número%20en%20la%20rifa" target="_blank" class="boton-whatsapp">Enviar comprobante</a>
    </div>
  `;
  formularioContainer.innerHTML = mensajePago;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  verificarConexion();
  
  // Cargar desde caché al inicio
  const cache = localStorage.getItem('cacheRifa');
  if (cache) {
    const data = JSON.parse(cache);
    numerosOcupados = data.numerosOcupados || [];
    cacheTimestamp = data.timestamp || 0;
    generarNumeros(); // Generar números con datos de caché
  }
  
  // Cargar datos actualizados de Firestore
  cargarNumerosOcupados();

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
      // Verificar disponibilidad con consultas optimizadas
      const verificaciones = await Promise.all(
        selectedNumbers.map(num => 
          db.collection('rifa')
            .where('numero', '==', num)
            .limit(1)
            .get()
            .then(snap => ({ num, disponible: snap.empty }))
        )
      );

      const ocupados = verificaciones
        .filter(result => !result.disponible)
        .map(result => result.num);

      if (ocupados.length > 0) {
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

      // Actualizar estado local
      numerosOcupados = [...numerosOcupados, ...selectedNumbers];
      
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
      
      // Mostrar mensaje de pago
      mostrarMensajePago();
      
      // Resetear variables
      selectedNumbers = [];
      inputNumero.value = '';
      totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
      
      // Actualizar caché
      localStorage.setItem('cacheRifa', JSON.stringify({
        numerosOcupados,
        timestamp: cacheTimestamp
      }));
      
    } catch (error) {
      console.error('Error al guardar:', error);
      
      // Mostrar mensaje de error más específico
      if (error.code === 'resource-exhausted') {
        showNotification('Límite de operaciones excedido. Intenta con menos números.', false);
      } else if (error.code === 'unavailable') {
        showNotification('Error de conexión con la base de datos. Verifica tu internet.', false);
      } else {
        showNotification('Error al procesar la reserva: ' + error.message, false);
      }
    } finally {
      submitBtn.disabled = false;
      submitSpinner.style.display = 'none';
    }
  });
});
