document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('numeros-container');
  const inputNumero = document.getElementById('numero');
  const totalPago = document.getElementById('total-pago');
  const notification = document.getElementById('notification');
  const form = document.getElementById('form-rifa');
  
  let selectedNumbers = [];
  
  // URL de tu Google Apps Script (REEMPLAZAR CON TU URL)
  const scriptURL = 'https://script.google.com/macros/s/AKfycbz-045QvsDb_20GL4JCArMwLT168xZn2d7JvCY_pRUClkbu23K7-7dDBAqWrnFlIHiT/exec';
  
  // Función para mostrar notificaciones
  function showNotification(message, isSuccess) {
    notification.textContent = message;
    notification.className = isSuccess ? 'notification success show' : 'notification error show';
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 4000);
  }
  
  // Función para validar teléfono
  function validatePhone(phone) {
    const regex = /^[0-9]{10,15}$/;
    return regex.test(phone);
  }
  
  // Función para validar nombre
  function validateName(name) {
    return name.trim().length >= 5;
  }
  
  // Cargar números ocupados
  fetch(scriptURL + '?action=getNumbers')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error en la red');
      }
      return response.json();
    })
    .then(data => {
      const numerosOcupados = data;
      
      // Generar los números del 00 al 99
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
    })
    .catch(error => {
      console.error('Error al obtener números ocupados:', error);
      showNotification('Error al cargar números. Por favor, recarga la página.', false);
    });
  
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
    
    // Preparar datos para enviar
    const formData = {
      numero: selectedNumbers.join(', '),
      nombre: nombre,
      telefono: telefono
    };
    
    // Enviar datos a Google Apps Script
    fetch(scriptURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error en la red');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showNotification('¡Reserva exitosa! Gracias por tu apoyo. 🎉', true);
        
        // Actualizar UI: marcar números como ocupados
        selectedNumbers.forEach(num => {
          const div = document.querySelector(`.number[data-num="${num}"]`);
          if (div) {
            div.classList.add('ocupado');
            div.classList.remove('selected');
            div.style.pointerEvents = 'none';
          }
        });
        
        // Resetear formulario
        selectedNumbers = [];
        inputNumero.value = '';
        totalPago.innerHTML = `<strong>Total a pagar:</strong> $0`;
        form.reset();
      } else {
        showNotification('Error: ' + (data.error || 'No se pudo completar la reserva'), false);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('Error al enviar el formulario. Por favor, inténtalo de nuevo.', false);
    });
  });
});
