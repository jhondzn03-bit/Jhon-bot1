const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("baileys");

const { Boom } = require("@hapi/boom");
const pino = require("pino");
const readline = require("readline");
const path = require("path");

const config = require("./config.js");
const { handler } = require("./handler.js");
const { welcomeHandler } = require("./plugins/welcome.js");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (texto) =>
    new Promise(resolve => rl.question(texto, resolve));

let iniciando = false;
let numeroPairing = null;

async function obtenerNumero() {
    if (numeroPairing) return numeroPairing;

    while (true) {
        let numero = await ask(
            "꒐ Ingresa tu número con código de país: "
        );

        numero = numero.replace(/\D/g, "");

        if (!numero) {
            console.log("꒐ Número inválido.");
            continue;
        }

        if (numero.length < 10 || numero.length > 15) {
            console.log("꒐ El número debe tener entre 10 y 15 dígitos.");
            continue;
        }

        numeroPairing = numero;
        return numero;
    }
}

async function startJhon() {
    if (iniciando) return;
    iniciando = true;

    try {
        const { state, saveCreds } =
            await useMultiFileAuthState(
                path.join(__dirname, "sesion")
            );

        const { version } =
            await fetchLatestBaileysVersion();

        const Jhon = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ["Windows", "Chrome", "120.0.0.0"],
            logger: pino({ level: "silent" }),
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        Jhon.ev.on("creds.update", saveCreds);

        let pairingSolicitado = false;
        let conexionAbierta = false;

        const solicitarPairing = async () => {
            if (
                pairingSolicitado ||
                conexionAbierta ||
                state.creds.registered
            ) {
                return;
            }

            pairingSolicitado = true;

            try {
                const numero = await obtenerNumero();

                console.log(
                    "\n꒐ Esperando conexión con WhatsApp..."
                );

                const codigo =
                    await Jhon.requestPairingCode(numero);

                console.log(`
╭─〔 ${config.botName} 〕
│
│ ✰ Número: +${numero}
│ ✰ Código: ${codigo}
│
╰─ Ingresa este código en WhatsApp
                `.trim());

            } catch (error) {
                pairingSolicitado = false;

                console.log(
                    "\n꒐ No se pudo generar el código de vinculación."
                );

                console.log(
                    "꒐ Código:",
                    error?.output?.statusCode || "desconocido"
                );

                console.log(
                    "꒐ Mensaje:",
                    error?.message || error
                );

                try {
                    Jhon.ws?.close();
                } catch {}

                iniciando = false;

                setTimeout(() => {
                    startJhon();
                }, 3000);
            }
        };

        Jhon.ev.on("connection.update", async update => {
            const {
                connection,
                lastDisconnect
            } = update;

            if (connection === "open") {
                conexionAbierta = true;
                iniciando = false;

                console.log(
                    `> ✰ ${config.botName} conectado correctamente ࿇ créditos: ${config.credits}`
                );

                if (rl) {
                    try {
                        rl.close();
                    } catch {}
                }

                return;
            }

            if (connection === "close") {
                conexionAbierta = false;

                const motivo =
                    new Boom(
                        lastDisconnect?.error
                    )?.output?.statusCode;

                if (
                    motivo === DisconnectReason.loggedOut
                ) {
                    iniciando = false;

                    console.log(
                        `> ✰ ${config.botName} cerró sesión. Elimina la carpeta sesion y vuelve a iniciar.`
                    );

                    return;
                }

                iniciando = false;

                console.log(
                    "> ✰ Conexión cerrada. Reconectando..."
                );

                setTimeout(() => {
                    startJhon();
                }, 3000);
            }
        });

        await new Promise(resolve => {
            const verificar = setInterval(() => {
                if (
                    Jhon.ws?.readyState === 1
                ) {
                    clearInterval(verificar);
                    resolve();
                }
            }, 250);

            setTimeout(() => {
                clearInterval(verificar);
                resolve();
            }, 15000);
        });

        if (
            config.usePairingCode &&
            !state.creds.registered
        ) {
            await solicitarPairing();
        }

        Jhon.ev.on(
            "messages.upsert",
            async ({ messages }) => {
                const msg = messages[0];

                if (!msg?.message) return;

                try {
                    await handler(Jhon, msg);
                } catch (error) {
                    console.log(
                        "Error procesando mensaje:",
                        error
                    );
                }
            }
        );

        Jhon.ev.on(
            "group-participants.update",
            async evento => {
                try {
                    await welcomeHandler(
                        Jhon,
                        evento
                    );
                } catch (error) {
                    console.log(
                        "Error en bienvenida:",
                        error
                    );
                }
            }
        );

    } catch (error) {
        iniciando = false;

        console.log(
            "Error iniciando Jhon:",
            error
        );

        setTimeout(() => {
            startJhon();
        }, 3000);
    }
}

startJhon();