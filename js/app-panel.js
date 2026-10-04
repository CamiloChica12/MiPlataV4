// ======================================================================
// MI PLATA — LÓGICA DEL PANEL DE TRANSACCIONES
// ======================================================================

import { CuentaAhorros, CuentaCorriente, TarjetaCredito, Transferencia } from "./clases.js";
import { cargarClientes, guardarClientes, generarNumeroCuenta } from "./storage.js";

// ---------------------------------------------------------------------
// 1. VALIDAR SESIÓN Y CARGAR DATOS
// ---------------------------------------------------------------------
const usuarioActivo = sessionStorage.getItem("usuarioActivo");
if (!usuarioActivo) {
  window.location.href = "login.html";
}

let clientes = cargarClientes();
let clienteActual = clientes.find((c) => c.usuario === usuarioActivo);

if (!clienteActual) {
  // Por si el usuario en sessionStorage ya no existe (ej: lo borró el admin)
  sessionStorage.removeItem("usuarioActivo");
  window.location.href = "login.html";
}

function guardarTodo() {
  guardarClientes(clientes);
}

function mostrarMensaje(tipo, texto) {
  const caja = document.getElementById("mensaje");
  caja.textContent = texto;
  caja.className = "form-message show " + tipo;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatoPesos(valor) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

document.getElementById("saludo").textContent = "Hola, " + clienteActual.nombreCompleto;

// ---------------------------------------------------------------------
// 2. NAVEGACIÓN ENTRE SECCIONES (mostrar/ocultar, sin recargar la página)
// ---------------------------------------------------------------------
document.querySelectorAll(".nav-item").forEach((boton) => {
  boton.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    boton.classList.add("active");

    document.querySelectorAll(".panel-section").forEach((s) => s.classList.add("hidden"));
    document.getElementById("sec-" + boton.dataset.section).classList.remove("hidden");

    // Cada vez que se entra a una sección, refrescamos sus datos
    if (boton.dataset.section === "cuentas") renderCuentas();
    if (boton.dataset.section === "movimientos") renderMovimientos();
    if (boton.dataset.section === "perfil") cargarFormularioPerfil();
    actualizarSelectsCuentas();
  });
});

document.getElementById("btnSalir").addEventListener("click", () => {
  sessionStorage.removeItem("usuarioActivo");
  window.location.href = "login.html";
});

// ---------------------------------------------------------------------
// 3. SECCIÓN "MIS CUENTAS"
// ---------------------------------------------------------------------
function renderCuentas() {
  const contenedor = document.getElementById("listaCuentas");
  contenedor.innerHTML = "";

  if (clienteActual.cuentas.length === 0) {
    contenedor.innerHTML = '<div class="empty-state">Aún no tienes productos abiertos. Abre uno abajo.</div>';
    return;
  }

  clienteActual.cuentas.forEach((cuenta) => {
    const card = document.createElement("div");
    card.className = "account-card";

    if (cuenta.tipo === "TarjetaCredito") {
      card.innerHTML = `
        <div class="account-type">Tarjeta de crédito</div>
        <div class="account-number">${cuenta.numeroCuenta}</div>
        <div class="account-balance">${formatoPesos(cuenta.deuda)}</div>
        <div class="account-extra">Deuda actual · Cupo: ${formatoPesos(cuenta.cupo)}</div>
      `;
    } else {
      const nombre = cuenta.tipo === "CuentaAhorros" ? "Cuenta de ahorros" : "Cuenta corriente";
      card.innerHTML = `
        <div class="account-type">${nombre}</div>
        <div class="account-number">${cuenta.numeroCuenta}</div>
        <div class="account-balance">${formatoPesos(cuenta.saldo)}</div>
        <div class="account-extra">Saldo disponible</div>
      `;
    }
    contenedor.appendChild(card);
  });
}

document.getElementById("btnAbrirAhorros").addEventListener("click", () => {
  const numero = generarNumeroCuenta("AH", clientes);
  clienteActual.agregarCuenta(new CuentaAhorros(numero, 0));
  guardarTodo();
  renderCuentas();
  actualizarSelectsCuentas();
  mostrarMensaje("success", "Cuenta de ahorros abierta: " + numero);
});

document.getElementById("btnAbrirCorriente").addEventListener("click", () => {
  const numero = generarNumeroCuenta("CC", clientes);
  clienteActual.agregarCuenta(new CuentaCorriente(numero, 0));
  guardarTodo();
  renderCuentas();
  actualizarSelectsCuentas();
  mostrarMensaje("success", "Cuenta corriente abierta: " + numero);
});

document.getElementById("btnAbrirTarjeta").addEventListener("click", () => {
  const numero = generarNumeroCuenta("TC", clientes);
  const cupoAsignado = 1000000; // el banco asigna el cupo, como dice el documento
  clienteActual.agregarCuenta(new TarjetaCredito(numero, cupoAsignado));
  guardarTodo();
  renderCuentas();
  actualizarSelectsCuentas();
  mostrarMensaje("success", "Tarjeta de crédito asignada: " + numero + " (cupo " + formatoPesos(cupoAsignado) + ")");
});

// ---------------------------------------------------------------------
// 4. LLENAR LOS <select> DE CUENTAS EN CADA FORMULARIO
// ---------------------------------------------------------------------
function llenarSelect(select, cuentas, etiqueta) {
  select.innerHTML = "";
  if (cuentas.length === 0) {
    select.innerHTML = '<option value="">No tienes cuentas disponibles</option>';
    return;
  }
  cuentas.forEach((c) => {
    const opcion = document.createElement("option");
    opcion.value = c.numeroCuenta;
    opcion.textContent = `${etiqueta(c)} — ${c.numeroCuenta}`;
    select.appendChild(opcion);
  });
}

function actualizarSelectsCuentas() {
  const todas = clienteActual.cuentas;
  const soloRetirables = todas.filter((c) => c.tipo !== "TarjetaCredito"); // retirar() no aplica a tarjeta
  const soloTarjetas = todas.filter((c) => c.tipo === "TarjetaCredito");

  const etiquetaGeneral = (c) =>
    c.tipo === "CuentaAhorros" ? "Ahorros" : c.tipo === "CuentaCorriente" ? "Corriente" : "Tarjeta";

  llenarSelect(document.getElementById("cuentaConsignar"), todas, etiquetaGeneral);
  llenarSelect(document.getElementById("cuentaRetirar"), soloRetirables, etiquetaGeneral);
  llenarSelect(document.getElementById("tarjetaComprar"), soloTarjetas, etiquetaGeneral);
  llenarSelect(document.getElementById("cuentaOrigen"), soloRetirables, etiquetaGeneral);
  llenarSelect(document.getElementById("cuentaMovimientos"), todas, etiquetaGeneral);
}

function buscarCuentaActualPorNumero(numero) {
  return clienteActual.obtenerCuentaPorNumero(numero);
}

// ---------------------------------------------------------------------
// 5. CONSIGNAR
// ---------------------------------------------------------------------
document.getElementById("formConsignar").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const numero = document.getElementById("cuentaConsignar").value;
  const monto = Number(document.getElementById("montoConsignar").value);
  const cuenta = buscarCuentaActualPorNumero(numero);

  if (!cuenta) {
    mostrarMensaje("error", "Selecciona una cuenta válida.");
    return;
  }

  cuenta.consignar(monto); // polimorfismo: en tarjeta esto "paga" la deuda
  guardarTodo();
  renderCuentas();
  mostrarMensaje("success", "Operación registrada con éxito.");
  document.getElementById("formConsignar").reset();
});

// ---------------------------------------------------------------------
// 6. RETIRAR
// ---------------------------------------------------------------------
document.getElementById("formRetirar").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const numero = document.getElementById("cuentaRetirar").value;
  const monto = Number(document.getElementById("montoRetirar").value);
  const cuenta = buscarCuentaActualPorNumero(numero);

  if (!cuenta) {
    mostrarMensaje("error", "Selecciona una cuenta válida.");
    return;
  }

  const saldoAntes = cuenta.saldo;
  cuenta.retirar(monto); // en CuentaAhorros aplica interés, en CuentaCorriente permite sobregiro

  if (cuenta.saldo === saldoAntes) {
    // retirar() no cambió el saldo: significa que la validación interna lo rechazó
    mostrarMensaje("error", "No se pudo retirar (monto inválido o saldo insuficiente).");
    return;
  }

  guardarTodo();
  renderCuentas();
  mostrarMensaje("success", "Retiro realizado con éxito.");
  document.getElementById("formRetirar").reset();
});

// ---------------------------------------------------------------------
// 7. COMPRAR A CUOTAS (TARJETA)
// ---------------------------------------------------------------------
document.getElementById("formComprar").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const numero = document.getElementById("tarjetaComprar").value;
  const monto = Number(document.getElementById("montoComprar").value);
  const cuotas = Number(document.getElementById("cuotasComprar").value);
  const tarjeta = buscarCuentaActualPorNumero(numero);

  if (!tarjeta) {
    mostrarMensaje("error", "Selecciona una tarjeta válida.");
    return;
  }

  const deudaAntes = tarjeta.deuda;
  const cuotaMensual = tarjeta.comprar(monto, cuotas);

  if (tarjeta.deuda === deudaAntes) {
    mostrarMensaje("error", "No se pudo procesar la compra (revisa el cupo disponible).");
    return;
  }

  guardarTodo();
  renderCuentas();
  mostrarMensaje("success", `Compra registrada. Cuota mensual: ${formatoPesos(cuotaMensual)}`);
  document.getElementById("formComprar").reset();
});

// ---------------------------------------------------------------------
// 8. TRANSFERIR
// ---------------------------------------------------------------------
document.getElementById("formTransferir").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const numeroOrigen = document.getElementById("cuentaOrigen").value;
  const numeroDestino = document.getElementById("cuentaDestino").value.trim();
  const monto = Number(document.getElementById("montoTransferir").value);

  const cuentaOrigen = buscarCuentaActualPorNumero(numeroOrigen);
  if (!cuentaOrigen) {
    mostrarMensaje("error", "Selecciona una cuenta de origen válida.");
    return;
  }

  // La cuenta destino puede ser de OTRO cliente, así que buscamos en
  // todos los clientes guardados, no solo en el actual.
  let cuentaDestino = null;
  let clienteDestino = null;
  for (const c of clientes) {
    const encontrada = c.obtenerCuentaPorNumero(numeroDestino);
    if (encontrada) {
      cuentaDestino = encontrada;
      clienteDestino = c;
      break;
    }
  }

  if (!cuentaDestino) {
    mostrarMensaje("error", "No existe ninguna cuenta con ese número.");
    return;
  }

  // Regla del documento: no se permite transferir al mismo producto
  // (mismo tipo Y mismo dueño). A otra persona, aunque sea el mismo
  // tipo de cuenta, sí está permitido.
  const esMismoDueno = clienteDestino.usuario === clienteActual.usuario;
  const esMismoTipo = cuentaDestino.tipo === cuentaOrigen.tipo;
  if (cuentaOrigen.numeroCuenta === cuentaDestino.numeroCuenta || (esMismoDueno && esMismoTipo)) {
    mostrarMensaje("error", "No se permiten transferencias entre dos cuentas del mismo tipo y dueño.");
    return;
  }

  const saldoAntes = cuentaOrigen.saldo;
  const transferencia = new Transferencia(cuentaOrigen, cuentaDestino, monto);
  transferencia.procesar();

  if (cuentaOrigen.saldo === saldoAntes) {
    mostrarMensaje("error", "No se pudo transferir (monto inválido o saldo insuficiente).");
    return;
  }

  guardarTodo(); // guarda TODOS los clientes, porque modificamos una cuenta ajena
  renderCuentas();
  mostrarMensaje("success", "Transferencia realizada con éxito.");
  document.getElementById("formTransferir").reset();
});

// ---------------------------------------------------------------------
// 9. MOVIMIENTOS
// ---------------------------------------------------------------------
function renderMovimientos() {
  const select = document.getElementById("cuentaMovimientos");
  const numero = select.value;
  const wrap = document.getElementById("tablaMovimientosWrap");

  if (!numero) {
    wrap.innerHTML = '<div class="empty-state">Abre una cuenta primero.</div>';
    return;
  }

  const cuenta = buscarCuentaActualPorNumero(numero);
  const movimientos = cuenta.obtenerMovimientos();

  if (movimientos.length === 0) {
    wrap.innerHTML = '<div class="empty-state">Esta cuenta todavía no tiene movimientos.</div>';
    return;
  }

  const filas = [...movimientos]
    .reverse() // más reciente primero
    .map((m) => `<tr><td>${m.tipo}</td><td>${formatoPesos(m.valor)}</td><td>${m.fecha}</td></tr>`)
    .join("");

  wrap.innerHTML = `
    <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>Tipo</th><th>Valor</th><th>Fecha</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    </div>
  `;
}

document.getElementById("cuentaMovimientos").addEventListener("change", renderMovimientos);

// ---------------------------------------------------------------------
// 10. PERFIL
// ---------------------------------------------------------------------
function cargarFormularioPerfil() {
  document.getElementById("perfilNombre").value = clienteActual.nombreCompleto;
  document.getElementById("perfilCelular").value = clienteActual.celular;
}

document.getElementById("formPerfil").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nombreCompleto = document.getElementById("perfilNombre").value.trim();
  const celular = document.getElementById("perfilCelular").value.trim();

  clienteActual.actualizarDatos({ nombreCompleto, celular }); // heredado de Persona
  guardarTodo();
  document.getElementById("saludo").textContent = "Hola, " + clienteActual.nombreCompleto;
  mostrarMensaje("success", "Perfil actualizado.");
});

document.getElementById("formClave").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const actual = document.getElementById("claveActual").value;
  const nueva = document.getElementById("claveNueva").value;
  const confirmar = document.getElementById("claveConfirmar").value;

  if (nueva !== confirmar) {
    mostrarMensaje("error", "La nueva contraseña no coincide con la confirmación.");
    return;
  }

  const exito = clienteActual.cambiarContrasena(actual, nueva); // heredado de Persona
  if (!exito) {
    mostrarMensaje("error", "La contraseña actual no es correcta.");
    return;
  }

  guardarTodo();
  document.getElementById("formClave").reset();
  mostrarMensaje("success", "Contraseña actualizada.");
});

// ---------------------------------------------------------------------
// 11. PRIMER RENDER AL CARGAR LA PÁGINA
// ---------------------------------------------------------------------
renderCuentas();
actualizarSelectsCuentas();
