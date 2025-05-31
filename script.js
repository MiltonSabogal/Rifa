document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();

  const numero = document.getElementById('numero').value;
  const nombre = document.getElementById('nombre').value;
  const telefono = document.getElementById('telefono').value;

  alert(`Gracias, ${nombre}. Has reservado el número ${numero}. Pronto nos pondremos en contacto contigo al ${telefono}.`);

  // Aquí podrías agregar lógica para enviar estos datos a un formulario de Google Sheets o base de datos si lo necesitas.
  
  this.reset(); // Limpia el formulario después de enviarlo
});
