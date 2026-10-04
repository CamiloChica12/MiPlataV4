//======================================================================================
// SISTEMA BANCARIO "MI PLATA" - MODELO POO (Parte 2)
//======================================================================================
// Este archivo traduce a clases lo que ya tenías funcionando en index.js con
// funciones sueltas. La lógica de negocio (bloqueo de 3 intentos, validaciones,
// registro de movimientos) es la MISMA que ya programaste; lo único que cambia
// es que ahora vive organizada dentro de clases, tal como lo pide el documento
// de evaluación M2 y como lo dibujamos en el diagrama UML.
//
// Jerarquía 1: Persona (abstracta) -> Cliente / Administrador
// Jerarquía 2: Cuenta  (abstracta) -> CuentaAhorros / CuentaCorriente / TarjetaCredito
//======================================================================================


//======================================================================================
// 1. PERSONA (clase padre — no se crea directamente, solo se hereda)
//======================================================================================
class Persona {
  constructor(identificacion, nombreCompleto, celular, usuario, contrasena) {
    this.identificacion = identificacion;
    this.nombreCompleto = nombreCompleto;
    this.celular = celular;
    this.usuario = usuario;
    this.contrasena = contrasena;
    this.estado = "activo";
  }

  // Método base: lo hereda Administrador tal cual. Cliente lo SOBREESCRIBE
  // abajo para agregarle el bloqueo por 3 intentos (polimorfismo).
  iniciarSesion(claveIngresada) {
    return String(claveIngresada) === String(this.contrasena);
  }

  // Método compartido por Cliente y Administrador (no hay que repetirlo en cada uno)
  cambiarContrasena(claveActual, claveNueva) {
    if (claveActual !== this.contrasena) {
      console.log("La contraseña actual no coincide.");
      return false;
    }
    this.contrasena = claveNueva;
    console.log("Contraseña actualizada con éxito.");
    return true;
  }

  // datosNuevos es un objeto, ej: { nombreCompleto: "Juan", celular: "300..." }
  actualizarDatos(datosNuevos) {
    Object.assign(this, datosNuevos);
    console.log("Datos actualizados.");
  }
}


//======================================================================================
// 2. CLIENTE (hereda de Persona)
//======================================================================================
class Cliente extends Persona {
  constructor(identificacion, nombreCompleto, celular, usuario, contrasena) {
    // "super" llama al constructor del padre (Persona), así no repetimos ese código.
    super(identificacion, nombreCompleto, celular, usuario, contrasena);
    this.intentos = 0;
    this.bloqueado = false;
    this.fechaBloqueo = null;
    this.cuentas = []; // aquí se guardan sus CuentaAhorros / CuentaCorriente / TarjetaCredito
  }

  // Es la misma lógica de tu inicioSesion() de index.js, ahora como método de la clase.
  iniciarSesion(claveIngresada) {
    if (this.bloqueado) {
      const VEINTICUATRO_HORAS = 24 * 60 * 60 * 1000;
      const tiempoTranscurrido = Date.now() - this.fechaBloqueo;

      if (tiempoTranscurrido >= VEINTICUATRO_HORAS) {
        this.bloqueado = false;
        this.fechaBloqueo = null;
      } else {
        console.log("Cuenta bloqueada. Debes esperar 24 horas.");
        return false;
      }
    }

    if (String(claveIngresada) === String(this.contrasena)) {
      this.intentos = 0;
      console.log("Inicio de sesión exitoso.");
      return true;
    }

    this.intentos++;
    console.log(`Contraseña incorrecta. Intento ${this.intentos} de 3.`);

    if (this.intentos >= 3) {
      this.bloqueado = true;
      this.fechaBloqueo = Date.now();
      console.log("Intentos superados. Cuenta bloqueada por 24 horas.");
    }
    return false;
  }

  agregarCuenta(cuenta) {
    this.cuentas.push(cuenta);
  }

  // Nos sirve en el panel para buscar una cuenta específica del cliente
  obtenerCuentaPorNumero(numero) {
    return this.cuentas.find((c) => c.numeroCuenta === numero);
  }

  // El administrador usa esto para desbloquear una cuenta manualmente,
  // sin tener que esperar las 24 horas.
  desbloquear() {
    this.bloqueado = false;
    this.fechaBloqueo = null;
  }
}


//======================================================================================
// 3. ADMINISTRADOR (hereda de Persona)
//======================================================================================
class Administrador extends Persona {
  constructor(identificacion, nombreCompleto, celular, usuario, contrasena, nivelAcceso = "estandar") {
    super(identificacion, nombreCompleto, celular, usuario, contrasena);
    this.nivelAcceso = nivelAcceso;
  }

  // CRUD de usuarios que pide el documento M2
  crearUsuario(listaClientes, nuevoCliente) {
    const existe = listaClientes.some((c) => c.usuario === nuevoCliente.usuario);
    if (existe) {
      console.log("Ese nombre de usuario ya existe.");
      return false;
    }
    listaClientes.push(nuevoCliente);
    console.log("Usuario creado por el administrador.");
    return true;
  }

  editarUsuario(cliente, datosNuevos) {
    // Reutiliza el método actualizarDatos() que Cliente heredó de Persona.
    cliente.actualizarDatos(datosNuevos);
  }

  eliminarUsuario(listaClientes, nombreUsuario) {
    const indice = listaClientes.findIndex((c) => c.usuario === nombreUsuario);
    if (indice === -1) {
      console.log("Usuario no encontrado.");
      return false;
    }
    listaClientes.splice(indice, 1);
    console.log("Usuario eliminado.");
    return true;
  }
}


//======================================================================================
// 4. CUENTA (clase padre de los 3 productos bancarios — es "abstracta")
//======================================================================================
// En JavaScript no existe la palabra "abstract" como en Java, así que la
// simulamos: si alguien llama retirar() directo desde Cuenta (sin ser una
// cuenta hija), lanzamos un error. Así nunca se crea una "Cuenta" genérica.
//======================================================================================
class Cuenta {
  constructor(numeroCuenta, saldoInicial = 0) {
    this.numeroCuenta = numeroCuenta;
    this.saldo = saldoInicial;
    this.fechaCreacion = new Date().toLocaleDateString();
    this.movimientos = []; // igual que tu array "movimientos" en index.js
    // "tipo" es clave: cuando guardamos en localStorage y volvemos a cargar,
    // JavaScript pierde la clase original (queda como objeto plano). Este
    // campo es lo que usamos para reconstruir la subclase correcta.
    this.tipo = "Cuenta";
  }

  consultarSaldo() {
    return this.saldo;
  }

  consignar(monto) {
    if (isNaN(monto) || monto <= 0) {
      console.log("Monto inválido. Debe ser mayor a cero.");
      return;
    }
    this.saldo += monto;
    this._registrarMovimiento("Consignación", monto);
    console.log("Consignación exitosa. Nuevo saldo: " + this.saldo);
  }

  // POLIMORFISMO: este método se reescribe distinto en cada clase hija.
  retirar(monto) {
    throw new Error("retirar() debe implementarse en la subclase correspondiente.");
  }

  obtenerMovimientos() {
    return this.movimientos;
  }

  // Método de apoyo interno, compartido por las 3 cuentas hijas (evita repetir código)
  _registrarMovimiento(tipo, valor) {
    this.movimientos.push({
      tipo,
      valor,
      fecha: new Date().toLocaleDateString(),
    });
  }
}


//======================================================================================
// 5. CUENTA AHORROS (hereda de Cuenta)
//======================================================================================
class CuentaAhorros extends Cuenta {
  constructor(numeroCuenta, saldoInicial) {
    super(numeroCuenta, saldoInicial);
    this.tipo = "CuentaAhorros";
    this.tasaInteres = 0.015; // 1.5% mensual, aplicado al momento del retiro
  }

  retirar(monto) {
    if (isNaN(monto) || monto <= 0) {
      console.log("Monto inválido.");
      return;
    }
    if (monto > this.saldo) {
      console.log("Saldo insuficiente para realizar el retiro.");
      return;
    }
    const interes = monto * this.tasaInteres;
    this.saldo -= (monto + interes);
    this._registrarMovimiento("Retiro", monto);
    console.log(`Retiro exitoso. Interés aplicado: $${interes.toFixed(2)}. Nuevo saldo: ${this.saldo.toFixed(2)}`);
  }
}


//======================================================================================
// 6. CUENTA CORRIENTE (hereda de Cuenta)
//======================================================================================
class CuentaCorriente extends Cuenta {
  constructor(numeroCuenta, saldoInicial) {
    super(numeroCuenta, saldoInicial);
    this.tipo = "CuentaCorriente";
    this.sobregiroPermitido = 0.20; // 20% adicional sobre el saldo actual
  }

  retirar(monto) {
    if (isNaN(monto) || monto <= 0) {
      console.log("Monto inválido.");
      return;
    }
    const limiteRetiro = this.saldo * (1 + this.sobregiroPermitido);
    if (monto > limiteRetiro) {
      console.log("El retiro supera el saldo más el sobregiro permitido.");
      return;
    }
    this.saldo -= monto;
    this._registrarMovimiento("Retiro", monto);
    console.log("Retiro exitoso. Nuevo saldo: " + this.saldo.toFixed(2));
  }
}


//======================================================================================
// 7. TARJETA DE CRÉDITO (hereda de Cuenta)
//======================================================================================
class TarjetaCredito extends Cuenta {
  constructor(numeroCuenta, cupo) {
    super(numeroCuenta, 0); // aquí "saldo" heredado no se usa como ahorro, sino la deuda
    this.tipo = "TarjetaCredito";
    this.cupo = cupo;
    this.deuda = 0;
  }

  // POLIMORFISMO otra vez: en Cuenta, consignar() suma al saldo. Aquí
  // "consignar" significa "pagar la tarjeta", así que resta la deuda.
  consignar(monto) {
    if (isNaN(monto) || monto <= 0) {
      console.log("Monto inválido.");
      return;
    }
    this.deuda -= monto;
    if (this.deuda < 0) this.deuda = 0; // no queremos deuda negativa
    this.saldo = this.deuda;
    this._registrarMovimiento("Pago tarjeta", monto);
    console.log("Pago registrado. Deuda restante: " + this.deuda.toFixed(2));
  }

  // La tarjeta no "retira" dinero (no sobreescribimos retirar, así que si
  // alguien la llama, sigue lanzando el error de la clase padre Cuenta).
  // Su operación propia es comprar():
  comprar(monto, cuotas) {
    if (monto > (this.cupo - this.deuda)) {
      console.log("Cupo insuficiente para esta compra.");
      return;
    }
    const tasa = this._tasaPorCuotas(cuotas);
    const cuotaMensual = this.calcularCuotaMensual(monto, cuotas, tasa);

    this.deuda += monto;
    this.saldo = this.deuda; // así consultarSaldo() refleja la deuda actual
    this._registrarMovimiento("Compra a " + cuotas + " cuotas", monto);

    console.log(`Compra registrada. Cuota mensual: $${cuotaMensual.toFixed(2)}`);
    return cuotaMensual;
  }

  // Tabla de tasas que dio el profesor
  _tasaPorCuotas(cuotas) {
    if (cuotas <= 2) return 0;      // sin interés
    if (cuotas <= 6) return 0.019;  // interés moderado
    return 0.023;                   // interés alto (7+ cuotas)
  }

  // Fórmula de amortización del documento:
  // Cuota mensual = (Capital x tasa) / (1 - (1 + tasa) ^ (-n))
  calcularCuotaMensual(monto, cuotas, tasa) {
    if (tasa === 0) return monto / cuotas;
    return (monto * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
  }
}


//======================================================================================
// 8. TRANSFERENCIA (conecta dos cuentas)
//======================================================================================
class Transferencia {
  constructor(cuentaOrigen, cuentaDestino, monto) {
    this.cuentaOrigen = cuentaOrigen;
    this.cuentaDestino = cuentaDestino;
    this.monto = monto;
    this.fecha = new Date().toLocaleDateString();
  }

  procesar() {
    if (this.cuentaOrigen === this.cuentaDestino) {
      console.log("No se permite transferir al mismo producto.");
      return false;
    }
    this.cuentaOrigen.retirar(this.monto);
    this.cuentaDestino.consignar(this.monto);
    console.log("Transferencia realizada con éxito.");
    return true;
  }
}


//======================================================================================
// EJEMPLO DE USO (borra este bloque cuando conectes las clases con el HTML)
//======================================================================================
// const cliente1 = new Cliente("123", "Juan Camilo", "3001234567", "jcamilo", "clave123");
// const ahorros = new CuentaAhorros("AH-001", 100000);
// cliente1.agregarCuenta(ahorros);
//
// cliente1.iniciarSesion("clave123");   // true
// ahorros.consignar(50000);             // saldo: 150000
// ahorros.retirar(20000);               // aplica el 1.5% de interés
// console.log(ahorros.obtenerMovimientos());


//======================================================================================
// EXPORTAR (solo si vas a usar Node/módulos; si es directo en el navegador, borra esto)
//======================================================================================
export { Persona, Cliente, Administrador, Cuenta, CuentaAhorros, CuentaCorriente, TarjetaCredito, Transferencia };
