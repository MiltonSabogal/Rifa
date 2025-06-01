// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCvNhHpsbjinSUFRK3HTDJCCnVFh4DVoXI",
    authDomain: "rifa-misaga.firebaseapp.com",
    databaseURL: "https://rifa-misaga-default-rtdb.firebaseio.com", // Esto es para Realtime Database, pero no lo usaremos activamente.
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
// const connectionStatus = document.getElementById('connection-status'); // Eliminado: No se usa Realtime Database para este propósito
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

// Función para generar los números en la interfaz
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

        // Marcar como ocupado si está en la lista de numerosOcupados
        // Aquí es donde es CRÍTICO que numerosOcupados contenga strings individuales como "00", "01", etc.
        if (numerosOcupados.includes(num)) {
            div.classList.add('ocupado');
            div.style.pointerEvents = 'none'; // Deshabilita el click en números ocupados
        }

        // Evento click para seleccionar/deseleccionar
        div.addEventListener('click', () => {
            if (div.classList.contains('ocupado')) return; // No hacer nada si el número está ocupado

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
    spinner.style.display = 'none'; // Oculta el spinner una vez que los números están generados
}

// Función para cargar números ocupados desde Firestore con caché
function cargarNumerosOcupados() {
    const now = Date.now();

    // Usar caché si está fresco
    if (now - cacheTimestamp < CACHE_DURATION && numerosOcupados.length > 0) {
        console.log("Cargando números desde caché.");
        generarNumeros(); // Asegurarse de llamar a generarNumeros aquí
        return;
    }

    spinner.style.display = 'block'; // Muestra el spinner mientras carga

    db.collection('rifa').get().then(snapshot => {
        // Esto mapea cada documento de la colección 'rifa' para obtener el valor del campo 'numero'
        // Esto asume que cada documento en 'rifa' tiene un campo 'numero' como un string individual (ej. "05")
        numerosOcupados = snapshot.docs.map(doc => doc.data().numero);
        cacheTimestamp = Date.now();
        console.log("Números ocupados cargados de Firestore:", numerosOcupados);
        generarNumeros(); // Llamar a generarNumeros después de obtener datos de Firestore

        // Guardar en localStorage para caché
        localStorage.setItem('cacheRifa', JSON.stringify({
            numerosOcupados,
            timestamp: cacheTimestamp
        }));
    }).catch(error => {
        console.error('Error al cargar números desde Firestore:', error);

        // Intentar cargar desde caché local si hay un error de conexión con Firestore
        const cache = localStorage.getItem('cacheRifa');
        if (cache) {
            const data = JSON.parse(cache);
            numerosOcupados = data.numerosOcupados || [];
            cacheTimestamp = data.timestamp || 0;
            showNotification('Error al conectar con la base de datos. Usando datos locales desactualizados.', false);
            console.log("Números ocupados cargados desde caché local por error de red.");
        } else {
            // Si no hay caché y hay un error, inicializa sin números ocupados
            showNotification('Error grave al cargar números. Intenta recargar la página.', false);
            numerosOcupados = [];
            console.log("No se pudieron cargar números ni desde Firestore ni desde caché local.");
        }

        generarNumeros(); // Asegurarse de llamar a generarNumeros en caso de error
    });
}

// Función para mostrar mensaje de pago después de reserva exitosa
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
    // Reemplaza el contenido del formulario con el mensaje de pago
    formularioContainer.innerHTML = mensajePago;
}

// Inicializar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Al cargar la página, primero intenta cargar desde el caché de localStorage
    const cache = localStorage.getItem('cacheRifa');
    if (cache) {
        const data = JSON.parse(cache);
        numerosOcupados = data.numerosOcupados || [];
        cacheTimestamp = data.timestamp || 0;
        console.log("Inicializando con números desde caché local.");
        generarNumeros(); // Generar números con los datos de caché iniciales
    }

    // Luego, en segundo plano, carga los datos actualizados de Firestore
    cargarNumerosOcupados();

    // Manejar el envío del formulario
    form.addEventListener('submit', async e => {
        e.preventDefault(); // Evita el envío tradicional del formulario

        const nombre = document.getElementById('nombre').value.trim();
        const telefono = document.getElementById('telefono').value.trim();

        // Validaciones del formulario
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

        // Deshabilita el botón y muestra spinner durante el envío
        submitBtn.disabled = true;
        submitSpinner.style.display = 'block';

        try {
            // Verificar disponibilidad de los números seleccionados en tiempo real
            // Esto es crucial para evitar que dos personas reserven el mismo número casi al mismo tiempo.
            const verificaciones = await Promise.all(
                selectedNumbers.map(num =>
                    db.collection('rifa')
                        .where('numero', '==', num)
                        .limit(1) // Solo necesitamos saber si existe un documento con ese número
                        .get()
                        .then(snap => ({ num, disponible: snap.empty })) // snap.empty es true si no hay documentos, es decir, el número está disponible
                )
            );

            const ocupadosRecien = verificaciones
                .filter(result => !result.disponible) // Filtra los que NO están disponibles
                .map(result => result.num);

            if (ocupadosRecien.length > 0) {
                // Si alguno de los números ya está ocupado, notifica al usuario
                showNotification(`Los números ${ocupadosRecien.join(', ')} ya están ocupados. Por favor selecciona otros.`, false);
                // También actualiza la UI para deseleccionar y marcar como ocupados los que se encontraron.
                ocupadosRecien.forEach(num => {
                    const div = document.querySelector(`.number[data-num="${num}"]`);
                    if (div) {
                        div.classList.add('ocupado');
                        div.classList.remove('selected');
                        div.style.pointerEvents = 'none';
                    }
                    // Eliminar de selectedNumbers localmente si ya fue ocupado
                    selectedNumbers = selectedNumbers.filter(n => n !== num);
                });
                // Actualizar input y total después de deseleccionar los ocupados
                inputNumero.value = selectedNumbers.join(', ');
                totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 20000).toLocaleString('es-CO')}`;

                return; // Detiene el proceso de reserva
            }

            // Si todos los números están disponibles, procede a guardarlos
            const batch = db.batch();
            const reservaRef = db.collection('compradores').doc(); // Crea un nuevo documento para el comprador

            // Guardar información del comprador (nombre, teléfono, y los números que seleccionó)
            batch.set(reservaRef, {
                nombre,
                telefono,
                numeros: selectedNumbers, // Guarda el array de números seleccionados por este comprador
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Marca de tiempo del servidor
            });

            // Marcar cada número seleccionado como ocupado en la colección 'rifa'
            selectedNumbers.forEach(num => {
                const numRef = db.collection('rifa').doc(); // Crea un nuevo documento para cada número
                batch.set(numRef, {
                    numero: num, // Guarda el número individual (ej. "05")
                    compradorId: reservaRef.id, // Referencia al comprador que lo reservó
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit(); // Ejecuta todas las operaciones de batch atómicamente

            // Si la reserva fue exitosa:
            // Actualizar el estado local de numerosOcupados para reflejar los nuevos números reservados
            numerosOcupados = [...numerosOcupados, ...selectedNumbers];

            // Actualizar la interfaz: marcar los números recién reservados como ocupados
            selectedNumbers.forEach(num => {
                const div = document.querySelector(`.number[data-num="${num}"]`);
                if (div) {
                    div.classList.add('ocupado');
                    div.classList.remove('selected');
                    div.style.pointerEvents = 'none'; // Deshabilita el clic
                }
            });

            showNotification('¡Reserva exitosa! Gracias por tu apoyo. 🎉', true);

            // Muestra el mensaje de pago y los detalles
            mostrarMensajePago();

            // Resetear las selecciones y el formulario
            selectedNumbers = [];
            inputNumero.value = '';
            totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
            // form.reset(); // No resetear el formulario si vamos a mostrar el mensaje de pago en su lugar.

            // Actualizar el caché local con los nuevos números ocupados
            localStorage.setItem('cacheRifa', JSON.stringify({
                numerosOcupados,
                timestamp: cacheTimestamp
            }));

        } catch (error) {
            console.error('Error al guardar la reserva:', error);

            // Manejo de errores específicos de Firebase o de red
            if (error.code === 'resource-exhausted') {
                showNotification('Límite de operaciones excedido. Intenta con menos números.', false);
            } else if (error.code === 'unavailable') {
                showNotification('Error de conexión con la base de datos. Verifica tu internet.', false);
            } else {
                showNotification('Error al procesar la reserva: ' + error.message, false);
            }
        } finally {
            // Siempre rehabilita el botón y oculta el spinner al finalizar (éxito o error)
            submitBtn.disabled = false;
            submitSpinner.style.display = 'none';
        }
    });
});
