// ======================================================================
// MI PLATA — LÓGICA DE REGISTRO Y LOGIN
// Este archivo conecta los formularios HTML con la clase Cliente que
// está en clases.js. Se usa en registro.html y en login.html.
// ======================================================================

import { Cliente } from "./clases.js";
import { cargarClientes, guardarClientes, cargarAdministradores, asegurarAdminPorDefecto } from "./storage.js";

// Si todavía no existe ningún administrador guardado, creamos uno por
// defecto (usuario: "admin", contraseña: "admin123") para poder entrar
// al panel de administración.
asegurarAdminPorDefecto();

// cargarClientes() y guardarClientes() ya no viven aquí: se movieron a
// storage.js porque el panel de transacciones también las necesita, y
// no queremos dos copias de la misma lógica desincronizadas.

function mostrarMensaje(tipo, texto) {
  const caja = document.getElementById("mensaje");
  caja.textContent = texto;
  caja.className = "form-message show " + tipo; // tipo = "error" o "success"
}

// ======================================================================
// FORMULARIO DE REGISTRO (solo existe en registro.html)
// ======================================================================
const formRegistro = document.getElementById("formRegistro");

if (formRegistro) {
  formRegistro.addEventListener("submit", (evento) => {
    evento.preventDefault(); // evita que la página se recargue

    const identificacion = document.getElementById("identificacion").value.trim();
    const nombreCompleto = document.getElementById("nombreCompleto").value.trim();
    const celular = document.getElementById("celular").value.trim();
    const usuario = document.getElementById("usuario").value.trim();
    const contrasena = document.getElementById("contrasena").value;
    const confirmar = document.getElementById("confirmarContrasena").value;

    // ---- Validaciones (igual de estrictas que en tu index.js original) ----
    if (!identificacion || !nombreCompleto || !celular || !usuario || !contrasena) {
      mostrarMensaje("error", "Todos los campos son obligatorios.");
      return;
    }
    if (contrasena !== confirmar) {
      mostrarMensaje("error", "Las contraseñas no coinciden.");
      return;
    }

    const clientes = cargarClientes();
    const existe = clientes.some((c) => c.usuario === usuario);
    if (existe) {
      mostrarMensaje("error", "Ese nombre de usuario ya está en uso.");
      return;
    }

    // ---- Crear el nuevo cliente usando la clase ----
    const nuevoCliente = new Cliente(identificacion, nombreCompleto, celular, usuario, contrasena);
    clientes.push(nuevoCliente);
    guardarClientes(clientes);

    mostrarMensaje("success", "Cuenta creada con éxito. Redirigiendo al login...");
    setTimeout(() => (window.location.href = "login.html"), 1200);
  });
}

// ======================================================================
// FORMULARIO DE LOGIN (solo existe en login.html)
// ======================================================================
const formLogin = document.getElementById("formLogin");

if (formLogin) {
  formLogin.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const contrasena = document.getElementById("contrasena").value;

    // ---- Primero revisamos si es un administrador ----
    const administradores = cargarAdministradores();
    const admin = administradores.find((a) => a.usuario === usuario);

    if (admin) {
      // Administrador hereda iniciarSesion() de Persona (sin bloqueo por intentos).
      if (admin.iniciarSesion(contrasena)) {
        sessionStorage.setItem("adminActivo", usuario);
        mostrarMensaje("success", "Bienvenido, " + admin.nombreCompleto);
        setTimeout(() => (window.location.href = "admin.html"), 900);
      } else {
        mostrarMensaje("error", "Contraseña incorrecta.");
      }
      return; // no seguimos a buscar entre clientes
    }

    // ---- Si no es administrador, seguimos con la lógica de Cliente ----
    const clientes = cargarClientes();
    const cliente = clientes.find((c) => c.usuario === usuario);

    if (!cliente) {
      mostrarMensaje("error", "Usuario no encontrado. ¿Ya te registraste?");
      return;
    }

    // Este método es EXACTAMENTE la lógica de tu inicioSesion() original,
    // solo que ahora vive dentro de la clase (ver clases.js).
    const exito = cliente.iniciarSesion(contrasena);

    // Como iniciarSesion() puede modificar intentos/bloqueado, guardamos
    // el arreglo actualizado sin importar si el login fue exitoso o no.
    const indice = clientes.findIndex((c) => c.usuario === usuario);
    clientes[indice] = cliente;
    guardarClientes(clientes);

    if (exito) {
      sessionStorage.setItem("usuarioActivo", usuario);
      mostrarMensaje("success", "¡Bienvenido, " + cliente.nombreCompleto + "!");
      setTimeout(() => (window.location.href = "panel.html"), 900);
    } else if (cliente.bloqueado) {
      mostrarMensaje("error", "Cuenta bloqueada por 24 horas. Intenta más tarde.");
    } else {
      mostrarMensaje("error", `Contraseña incorrecta. Intento ${cliente.intentos} de 3.`);
    }
  });
}
