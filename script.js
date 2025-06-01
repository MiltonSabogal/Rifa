// script.js

document.addEventListener("DOMContentLoaded", () => {
  const numerosContainer = document.getElementById("numeros-container");
  const form = document.getElementById("form-rifa");
  const numeroInput = document.getElementById("numero");
  const nombreInput = document.getElementById("nombre");
  const telefonoInput = document.getElementById("telefono");
  const totalPago = document.getElementById("total-pago");
  const submitBtn = document.getElementById("submit-btn");
  const notification = document.getElementById("notification");

  const valorPorNumero = 20000;

  let numeroSeleccionado = null;
  const numerosTotales = 100;

  const mostrarNotificacion = (mensaje, tipo = "success") => {
    notification.textContent = mensaje;
    notification.className = `notification show ${tipo}`;
    setTimeout(() => {
      notification.classList.remove("show");
    }, 4000);
  };

  const cargarNumeros = async () => {
    for (let i = 0; i < numerosTotales; i++) {
      const num = i.toString().padStart(2, "0");
      const numeroDiv = document.createElement("div");
      numeroDiv.classList.add("number");
      numeroDiv.textContent = num;
      numeroDiv.dataset.numero = num;

      // Revisar si el número ya fue reservado en Firebase
      try {
        const doc = await db.collection("rifa").doc(num).get();
        if (doc.exists) {
          numeroDiv.classList.add("ocupado");
        } else {
          numeroDiv.addEventListener("click", () => seleccionarNumero(num, numeroDiv));
        }
      } catch (error) {
        console.error("Error al cargar número:", error);
      }

      numerosContainer.appendChild(numeroDiv);
    }
  };

  const seleccionarNumero = (num, div) => {
    if (numeroSeleccionado) {
      document.querySelector(`[data-numero="${numeroSeleccionado}"]`).classList.remove("selected");
    }

    numeroSeleccionado = num;
    numeroInput.value = num;
    div.classList.add("selected");
    totalPago.textContent = `Total a pagar: $${valorPorNumero.toLocaleString()}`;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!numeroSeleccionado) {
      mostrarNotificacion("Por favor selecciona un número.", "error");
      return;
    }

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();

    if (!nombre || !telefono) {
      mostrarNotificacion("Debes completar todos los campos.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Reservando...";

    try {
      const docRef = db.collection("rifa").doc(numeroSeleccionado);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        mostrarNotificacion("Ese número ya fue reservado.", "error");
      } else {
        await docRef.set({
          numero: numeroSeleccionado,
          nombre,
          telefono,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarNotificacion("¡Número reservado con éxito!", "success");
        document.querySelector(`[data-numero="${numeroSeleccionado}"]`).classList.add("ocupado");
        document.querySelector(`[data-numero="${numeroSeleccionado}"]`).classList.remove("selected");

        // Reset form
        form.reset();
        totalPago.textContent = "Total a pagar: $0";
        numeroSeleccionado = null;
      }
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      mostrarNotificacion("Ocurrió un error al reservar el número.", "error");
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Reservar número";
  });

  // Iniciar la carga de números
  cargarNumeros();
});
