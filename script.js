// Importar funciones específicas de Firebase (SDK v9)
// Asegúrate de que tu navegador/servidor de GitHub Pages soporte módulos ES si no usas 'compat'
// Para simplificar y compatibilidad en GitHub Pages, seguiremos usando los scripts CDN
// pero con la sintaxis de inicialización de la v9.

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

// Inicializar Firebase App (SDK v9)
// Necesitas la función 'initializeApp' del módulo 'firebase/app'
// Y 'getFirestore' del módulo 'firebase/firestore'
// Dado que estamos usando CDN, estas funciones deberían estar disponibles globalmente
// como firebase.initializeApp y firebase.firestore.getFirestore (con el prefijo 'firebase.')
// Si el error persiste, la forma más robusta es usar importaciones de módulos:
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Para tu caso de uso con CDN, el error indica que 'firebase.initializeApp' no se está reconociendo correctamente.
// La razón más común es que se sigue intentando acceder a 'firebase.firestore()' (versión 8)
// en lugar de 'getFirestore(app)' (versión 9).

// Vamos a usar la inicialización de la v9, asumiendo que los scripts cargan correctamente las funciones globales:
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // ESTA LÍNEA ES EL PROBLEMA. Debe ser getFirestore(app) para v9.

// CÓDIGO CORREGIDO PARA LA INICIALIZACIÓN:
// Necesitas obtener la función getFirestore de la instancia global de firebase
// que se carga con el script `firebase-firestore.js`.
// Si no está globalmente disponible como `firebase.firestore.getFirestore`, entonces
// la única forma segura es usar módulos ES con importaciones (ver comentarios arriba).
// Pero para CDN, a veces se puede hacer así:
// const db = firebase.firestore(); // <<-- Esto es de v8
// O, si está disponible como función, directamente:
// const db = getFirestore(app); // <<-- Esto es de v9 (pero necesita 'getFirestore' importado)

// La forma más robusta para CDN sin usar import statements en el script.js,
// es usar las librerías 'compat' y la sintaxis antigua.
// PERO, si las librerías 'compat' te están dando ese error, significa que Firebase
// está esperando la sintaxis de la v9.

// Entonces, la *mejor* solución es usar los modulos ES6 para cargar los SDKs,
// Y luego usar la sintaxis de la v9 en tu script.js.

// CAMBIO CRÍTICO: Si no usas módulos ES6 con 'import', la versión 'compat'
// DEBERÍA permitir la sintaxis `firebase.firestore()`.
// El error que tienes sugiere que `firebase.firestore()` NO está definido,
// lo que es muy extraño con los scripts `compat`.

// Vamos a reintentar con los scripts compat y la sintaxis de la v8,
// ya que es la que se supone que debes usar con los archivos *-compat.js*

// Borra la anterior inicialización y usa esta:
// Ya que estás usando los CDN "compat", la sintaxis debería ser la de la v8.
// Si el error "No Firebase App '[DEFAULT]' has been created" persiste,
// el problema es con la carga de los scripts o algún bloqueo en el navegador.

// VAMOS A USAR LA VERSIÓN COMPAT QUE TENÍAS, PERO CORRIGIENDO CUALQUIER POSIBLE PROBLEMA DE ORDEN/ÁMBITO
// EN script.js, ASEGURATE QUE ESTO ESTÉ AL PRINCIPIO:
// const app = firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore(); // Con los scripts 'compat', esto DEBERÍA funcionar.

// Si aún no funciona, el problema es que el objeto global `firebase` NO se está cargando.
// Esto podría deberse a un bloqueador de anuncios, CORS en el servidor, o un problema de red.

// PARA ASEGURARNOS DE QUE 'firebase' ESTÉ CARGADO ANTES DE USARLO:
// Puedes envolver tu código en un addEventListener para 'load' en lugar de 'DOMContentLoaded'
// para asegurar que todos los scripts externos (como Firebase) se hayan cargado.
// Aunque DOMContentLoaded suele ser suficiente para <script> tags al final del body,
// para CDN externos a veces `load` es más seguro.

// ========================================================================================
// CÓDIGO FINAL DE `script.js` CON LA SOLUCIÓN RECOMENDADA (v8 `compat` SDK)
// ========================================================================================

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

// **IMPORTANTE**: La inicialización de Firebase DEBE hacerse ANTES de intentar usar `firebase.firestore()`.
// La manera más segura es que estas líneas estén al inicio de tu `script.js`
// después de la configuración.
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Esto debería funcionar con los scripts '-compat.js'

// Elementos del DOM
const container = document.getElementById('numeros-container');
const inputNumero = document.getElementById('numero');
const totalPago = document.getElementById('total-pago');
const notification = document.getElementById('notification');
const form = document.getElementById('form-rifa');
const spinner = document.getElementById('spinner');
const submitSpinner = document.getElementById('submit-spinner');
const submitBtn = document.getElementById('submit-btn');
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
    container.innerHTML = ''; // Limpiar contenedor

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
            totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 20000).toLocaleString('es-CO')}`;
        });

        container.appendChild(div);
    }
    spinner.style.display = 'none';
}

// Función para cargar números ocupados desde Firestore con caché
function cargarNumerosOcupados() {
    const now = Date.now();

    if (now - cacheTimestamp < CACHE_DURATION && numerosOcupados.length > 0) {
        console.log("Cargando números desde caché local.");
        generarNumeros();
        return;
    }

    spinner.style.display = 'block';

    db.collection('rifa').get().then(snapshot => {
        numerosOcupados = snapshot.docs.map(doc => doc.data().numero);
        cacheTimestamp = Date.now();
        console.log("Números ocupados cargados de Firestore:", numerosOcupados);
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
            showNotification('Error al conectar con la base de datos. Usando datos locales desactualizados.', false);
            console.log("Números ocupados cargados desde caché local por error de red.");
        } else {
            showNotification('Error grave al cargar números. Intenta recargar la página.', false);
            numerosOcupados = [];
            console.log("No se pudieron cargar números ni desde Firestore ni desde caché local.");
        }

        generarNumeros();
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
    formularioContainer.innerHTML = mensajePago;
}

// Inicializar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Intenta cargar desde el caché de localStorage al inicio
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

        submitBtn.disabled = true;
        submitSpinner.style.display = 'block';

        try {
            const verificaciones = await Promise.all(
                selectedNumbers.map(num =>
                    db.collection('rifa')
                        .where('numero', '==', num)
                        .limit(1)
                        .get()
                        .then(snap => ({ num, disponible: snap.empty }))
                )
            );

            const ocupadosRecien = verificaciones
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
                totalPago.innerHTML = `<strong>Total a pagar:</strong> $${(selectedNumbers.length * 20000).toLocaleString('es-CO')}`;
                return;
            }

            const batch = db.batch();
            const reservaRef = db.collection('compradores').doc();

            batch.set(reservaRef, {
                nombre,
                telefono,
                numeros: selectedNumbers,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            selectedNumbers.forEach(num => {
                const numRef = db.collection('rifa').doc();
                batch.set(numRef, {
                    numero: num,
                    compradorId: reservaRef.id,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();

            numerosOcupados = [...numerosOcupados, ...selectedNumbers];

            selectedNumbers.forEach(num => {
                const div = document.querySelector(`.number[data-num="${num}"]`);
                if (div) {
                    div.classList.add('ocupado');
                    div.classList.remove('selected');
                    div.style.pointerEvents = 'none';
                }
            });

            showNotification('¡Reserva exitosa! Gracias por tu apoyo. 🎉', true);
            mostrarMensajePago();

            selectedNumbers = [];
            inputNumero.value = '';
            totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;

            localStorage.setItem('cacheRifa', JSON.stringify({
                numerosOcupados,
                timestamp: cacheTimestamp
            }));

        } catch (error) {
            console.error('Error al guardar la reserva:', error);
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
