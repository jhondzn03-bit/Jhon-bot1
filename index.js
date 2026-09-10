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

const ask = (texto) => new Promise(resolve => {
    rl.question(texto, resolve);
});

async function obtenerNumero() {
    while (true) {
        let numero = await ask("\n꒐ Ingresa tu número con código de país: ");

        numero = numero.replace(/[^0-9]/g, "");

        if (!numero) {
            console.log("꒐ Debes ingresar un número válido.");
            continue;
        }

        if (numero.length < 10 || numero.length > 15) {
            console.log("꒐ El número debe tener entre 10 y 15 dígitos.");
            continue;
        }

        return numero;
    }
}

async function startJhon() {
    const { state, saveCreds } = await useMultiFileAuthState(
        path.join(__dirname, "sesion")
    );

    const { version } = await fetchLatestBaileysVersion();

    const Jhon = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ["Chrome", "Chrome", "120.0.0.0"],
        logger: pino({ level: "silent" }),
        syncFullHistory: false
    });

    if (config.usePairingCode && !Jhon.authState.creds.registered) {
        const numero = await obtenerNumero();

        console.log("\n꒐ Solicitando código de vinculación...");

        try {
            const codigo = await Jhon.requestPairingCode(numero);

            console.log(`
╭─〔 ${config.botName} 〕
│
│ ✰ Número: +${numero}
│ ✰ Código: ${codigo}
│
╰─ Vincula este código desde WhatsApp
            `.trim());
        } catch (error) {
            console.log("\n꒐ No se pudo generar el código de vinculación.");
            console.log(error);
        }
    }

    Jhon.ev.on("creds.update", saveCreds);

    Jhon.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;

            if (motivo !== DisconnectReason.loggedOut) {
                console.log("꒐ Conexión cerrada. Reconectando...");
                setTimeout(() => startJhon(), 3000);
            } else {
                console.log(
                    `> ✰ ${config.botName} cerró sesión. Elimina la carpeta sesion y vuelve a iniciar.`
                );
            }
        }

        if (connection === "open") {
            console.log(
                `> ✰ ${config.botName} conectado correctamente ࿇ créditos: ${config.credits}`
            );

            if (rl) {
                rl.close();
            }
        }
    });

    Jhon.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];

        if (!msg?.message) return;

        try {
            await handler(Jhon, msg);
        } catch (error) {
            console.log("Error procesando mensaje:", error);
        }
    });

    Jhon.ev.on("group-participants.update", async (evento) => {
        try {
            await welcomeHandler(Jhon, evento);
        } catch (error) {
            console.log("Error en bienvenida:", error);
        }
    });

    return Jhon;
}

startJhon().catch(error => {
    console.error("Error iniciando el bot:", error);
});