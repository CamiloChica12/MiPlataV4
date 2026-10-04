// ======================================================================
// MI PLATA — PANEL DE ADMINISTRACIÓN (CRUD de clientes)
// ======================================================================

import { Cliente } from "./clases.js";
import { cargarClientes, guardarClientes, cargarAdministradores } from "./storage.js";

// ---------------------------------------------------------------------
// 1. VALIDAR SESIÓN DE ADMINISTRADOR
// ---------------------------------------------------------------------
const usuarioAdmin = sessionStorage.getItem("adminActivo");
if (!usuarioAdmin) {
  window.location.href = "login.html";
}

const administradores = cargarAdministradores();
const adminActual = administradores.find((a) => a.usuario === usuarioAdmin);

if (!adminActual) {
  sessionStorage.removeItem("adminActivo");
  window.location.href = "login.html";
}

let clientes = cargarClientes();

document.getElementById("saludo").textContent = "Gestión de usuarios — " + adminActual.nombreCompleto;

function mostrarMensaje(tipo, texto) {
  const caja = document.getElementById("mensaje");
  caja.textContent = texto;
  caja.className = "form-message show " + tipo;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("btnSalir").addEventListener("click", () => {
  sessionStorage.removeItem("adminActivo");
  window.location.href = "login.html";
});

// ---------------------------------------------------------------------
// 2. RENDERIZAR LA TABLA DE CLIENTES
// ---------------------------------------------------------------------
function renderTabla() {
  const cuerpo = document.getElementById("cuerpoTabla");
  cuerpo.innerHTML = "";

  if (clientes.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="7"><div class="empty-state">Todavía no hay clientes registrados.</div></td></tr>';
    return;
  }

  clientes.forEach((cliente) => {
    const fila = document.createElement("tr");

    const estadoHtml = cliente.bloqueado
      ? '<span class="badge badge-bloqueado">Bloqueado</span>'
      : '<span class="badge badge-ok">Activo</span>';

    const botonDesbloquear = cliente.bloqueado
      ? `<button class="btn btn-outline btn-sm" data-accion="desbloquear" data-usuario="${cliente.usuario}">Desbloquear</button>`
      : "";

    fila.innerHTML = `
      <td>${cliente.identificacion}</td>
      <td>${cliente.nombreCompleto}</td>
      <td>${cliente.usuario}</td>
      <td>${cliente.celular}</td>
      <td>${estadoHtml}</td>
      <td>${cliente.cuentas.length}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" data-accion="editar" data-usuario="${cliente.usuario}">Editar</button>
          <button class="btn btn-danger btn-sm" data-accion="eliminar" data-usuario="${cliente.usuario}">Eliminar</button>
          ${botonDesbloquear}
        </div>
      </td>
    `;
    cuerpo.appendChild(fila);
  });
}

// Un solo listener para toda la tabla: revisamos qué botón se apretó
// mirando su atributo data-accion (evita poner un addEventListener por fila).
document.getElementById("cuerpoTabla").addEventListener("click", (evento) => {
  const boton = evento.target.closest("button");
  if (!boton) return;

  const usuario = boton.dataset.usuario;
  const accion = boton.dataset.accion;

  if (accion === "editar") abrirFormularioEdicion(usuario);
  if (accion === "eliminar") eliminarCliente(usuario);
  if (accion === "desbloquear") desbloquearCliente(usuario);
});

// ---------------------------------------------------------------------
// 3. ELIMINAR
// ---------------------------------------------------------------------
function eliminarCliente(usuario) {
  const confirmado = confirm("¿Seguro que quieres eliminar a este usuario? Esta acción no se puede deshacer.");
  if (!confirmado) return;

  adminActual.eliminarUsuario(clientes, usuario); // método de la clase Administrador
  guardarClientes(clientes);
  renderTabla();
  mostrarMensaje("success", "Usuario eliminado.");
}

// ---------------------------------------------------------------------
// 4. DESBLOQUEAR
// ---------------------------------------------------------------------
function desbloquearCliente(usuario) {
  const cliente = clientes.find((c) => c.usuario === usuario);
  cliente.desbloquear(); // método de la clase Cliente
  guardarClientes(clientes);
  renderTabla();
  mostrarMensaje("success", "Cuenta desbloqueada.");
}

// ---------------------------------------------------------------------
// 5. FORMULARIO (mismo formulario sirve para crear y para editar)
// ---------------------------------------------------------------------
const tarjetaFormulario = document.getElementById("tarjetaFormulario");
const formCliente = document.getElementById("formCliente");
let modoFormulario = "crear"; // o "editar"

document.getElementById("btnNuevo").addEventListener("click", () => {
  modoFormulario = "crear";
  document.getElementById("tituloFormulario").textContent = "Nuevo cliente";
  formCliente.reset();
  document.getElementById("fUsuario").disabled = false;
  document.getElementById("campoContrasena").classList.remove("hidden");
  document.getElementById("fContrasena").required = true;
  tarjetaFormulario.classList.remove("hidden");
});

document.getElementById("btnCancelar").addEventListener("click", () => {
  tarjetaFormulario.classList.add("hidden");
});

function abrirFormularioEdicion(usuario) {
  const cliente = clientes.find((c) => c.usuario === usuario);
  if (!cliente) return;

  modoFormulario = "editar";
  document.getElementById("tituloFormulario").textContent = "Editar cliente";
  document.getElementById("usuarioOriginal").value = cliente.usuario;
  document.getElementById("fIdentificacion").value = cliente.identificacion;
  document.getElementById("fNombre").value = cliente.nombreCompleto;
  document.getElementById("fCelular").value = cliente.celular;
  document.getElementById("fUsuario").value = cliente.usuario;

  // Al editar no tocamos la contraseña desde aquí (eso ya lo hace el
  // cliente desde su propio panel, en "Perfil"). El usuario tampoco se
  // deja cambiar aquí, porque rompería su sesión activa si la tuviera.
  document.getElementById("fUsuario").disabled = true;
  document.getElementById("campoContrasena").classList.add("hidden");
  document.getElementById("fContrasena").required = false;

  tarjetaFormulario.classList.remove("hidden");
  tarjetaFormulario.scrollIntoView({ behavior: "smooth" });
}

formCliente.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const identificacion = document.getElementById("fIdentificacion").value.trim();
  const nombreCompleto = document.getElementById("fNombre").value.trim();
  const celular = document.getElementById("fCelular").value.trim();

  if (modoFormulario === "crear") {
    const usuario = document.getElementById("fUsuario").value.trim();
    const contrasena = document.getElementById("fContrasena").value;

    // Reutilizamos la misma clase Cliente que usa el registro público.
    const nuevoCliente = new Cliente(identificacion, nombreCompleto, celular, usuario, contrasena);
    const creado = adminActual.crearUsuario(clientes, nuevoCliente); // método de Administrador

    if (!creado) {
      mostrarMensaje("error", "Ese nombre de usuario ya existe.");
      return;
    }
    guardarClientes(clientes);
    renderTabla();
    tarjetaFormulario.classList.add("hidden");
    mostrarMensaje("success", "Cliente creado con éxito.");
  } else {
    const usuarioOriginal = document.getElementById("usuarioOriginal").value;
    const cliente = clientes.find((c) => c.usuario === usuarioOriginal);

    adminActual.editarUsuario(cliente, { identificacion, nombreCompleto, celular }); // método de Administrador
    guardarClientes(clientes);
    renderTabla();
    tarjetaFormulario.classList.add("hidden");
    mostrarMensaje("success", "Cliente actualizado.");
  }
});

// ---------------------------------------------------------------------
// 6. PRIMER RENDER
// ---------------------------------------------------------------------
renderTabla();
