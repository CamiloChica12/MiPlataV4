// ======================================================================
// MI PLATA — PERSISTENCIA (localStorage)
// Módulo compartido: tanto app-auth.js (login/registro) como
// app-panel.js (el panel de transacciones) usan estas mismas funciones,
// para que nunca haya dos formas distintas de guardar/cargar los datos.
// ======================================================================

import { Cliente, Administrador, CuentaAhorros, CuentaCorriente, TarjetaCredito } from "./clases.js";

// ----------------------------------------------------------------------
// PROBLEMA QUE RESOLVEMOS AQUÍ:
// localStorage solo guarda texto (JSON). Cuando lo vuelves a leer con
// JSON.parse(), obtienes objetos "planos": tienen los mismos datos, pero
// NO tienen los métodos de la clase (retirar, consignar, iniciarSesion...).
// Por eso, cada vez que cargamos algo, lo reconstruimos como una
// instancia real de su clase, usando el campo "tipo" que guardamos en
// cada objeto para saber cuál constructor usar.
// ----------------------------------------------------------------------

function reconstruirCuenta(datos) {
  let cuenta;

  switch (datos.tipo) {
    case "CuentaAhorros":
      cuenta = new CuentaAhorros(datos.numeroCuenta, 0);
      break;
    case "CuentaCorriente":
      cuenta = new CuentaCorriente(datos.numeroCuenta, 0);
      break;
    case "TarjetaCredito":
      cuenta = new TarjetaCredito(datos.numeroCuenta, datos.cupo);
      break;
    default:
      console.log("Tipo de cuenta desconocido, se omite:", datos.tipo);
      return null;
  }

  // Object.assign copia todos los datos guardados (saldo, movimientos,
  // deuda, etc.) sobre la instancia recién creada, sin perder los métodos.
  return Object.assign(cuenta, datos);
}

function reconstruirCliente(datos) {
  const cliente = Object.assign(
    new Cliente(datos.identificacion, datos.nombreCompleto, datos.celular, datos.usuario, datos.contrasena),
    datos
  );
  // Las cuentas también hay que reconstruirlas una por una (no basta con
  // el Object.assign de arriba, porque eso solo reconstruye al Cliente).
  cliente.cuentas = (datos.cuentas || []).map(reconstruirCuenta).filter(Boolean);
  return cliente;
}

export function cargarClientes() {
  const data = localStorage.getItem("clientes");
  if (!data) return [];
  return JSON.parse(data).map(reconstruirCliente);
}

export function guardarClientes(clientes) {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

// ----------------------------------------------------------------------
// ADMINISTRADORES: es una lista aparte de "clientes", porque son un tipo
// de Persona distinto (sin cuentas, sin bloqueo de intentos).
// ----------------------------------------------------------------------
function reconstruirAdministrador(datos) {
  return Object.assign(
    new Administrador(datos.identificacion, datos.nombreCompleto, datos.celular, datos.usuario, datos.contrasena, datos.nivelAcceso),
    datos
  );
}

export function cargarAdministradores() {
  const data = localStorage.getItem("administradores");
  if (!data) return [];
  return JSON.parse(data).map(reconstruirAdministrador);
}

export function guardarAdministradores(administradores) {
  localStorage.setItem("administradores", JSON.stringify(administradores));
}

// La primera vez que alguien abre la app no existe ningún administrador
// todavía, así que creamos uno por defecto para poder entrar al panel
// de administración. Esto se llama una sola vez, desde login.html.
export function asegurarAdminPorDefecto() {
  const administradores = cargarAdministradores();
  if (administradores.length === 0) {
    const adminInicial = new Administrador(
      "0000000000",
      "Administrador Mi Plata",
      "3000000000",
      "admin",
      "admin123",
      "total"
    );
    guardarAdministradores([adminInicial]);
    console.log('Administrador creado por defecto -> usuario: "admin", contraseña: "admin123"');
  }
}

// Genera un número de cuenta único (ej: "AH-4821") revisando que no
// exista ya entre todos los clientes guardados.
export function generarNumeroCuenta(prefijo, clientes) {
  let numero;
  let existe;
  do {
    const aleatorio = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
    numero = `${prefijo}-${aleatorio}`;
    existe = clientes.some((cl) => cl.cuentas.some((cu) => cu.numeroCuenta === numero));
  } while (existe);
  return numero;
}
