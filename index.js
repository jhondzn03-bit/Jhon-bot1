// Créditos: Matthieu-x
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
const fs = require("fs");
const config = require("./config.js");
const { handler } = require("./handler.js");
const { welcomeHandler } = require("./plugins/welcome.js");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (texto) => new Promise((resolve) => rl.question(texto, resolve));

async function startJhon() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "sesion"));
    const { version } = await fetchLatestBaileysVersion();

    const Jhon = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: !config.usePairingCode,
        browser: ["Chrome (Linux)", "Chrome", "120.0.0.0"],
        logger: pino({ level: "silent" }),
        syncFullHistory: false
    });

    if (config.usePairingCode && !Jhon.authState.creds.registered) {
        let numero = config.pairingNumber || await ask("꒐ Ingresa tu número con código de país: ");
        numero = numero.replace(/[^0-9]/g, "");
        setTimeout(async () => {
            const codigo = await Jhon.requestPairingCode(numero);
            console.log(`\n> ✰ Código de vinculación de ${config.botName}: ${codigo}\n`);
        }, 3000);
    }

    Jhon.ev.on("creds.update", saveCreds);

    Jhon.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (motivo !== DisconnectReason.loggedOut) {
                startJhon();
            } else {
                console.log(`> ✰ ${config.botName} cerró sesión. Elimina la carpeta sesion y vuelve a iniciar.`);
            }
        } else if (connection === "open") {
            console.log(`> ✰ ${config.botName} conectado correctamente ࿇ créditos: ${config.credits}`);
        }
    });

    Jhon.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.message) return;
        await handler(Jhon, msg);
    });

    Jhon.ev.on("group-participants.update", async (evento) => {
        await welcomeHandler(Jhon, evento);
    });

    return Jhon;
}

startJhon();
