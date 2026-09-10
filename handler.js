const fs = require("fs");
const path = require("path");
const config = require("./config.js");

const plugins = [];
const carpetaPlugins = path.join(__dirname, "plugins");

for (const archivo of fs.readdirSync(carpetaPlugins)) {
    if (!archivo.endsWith(".js") || archivo === "welcome.js") continue;
    const plugin = require(path.join(carpetaPlugins, archivo));
    if (plugin?.comando) plugins.push(plugin);
}

function obtenerTexto(msg) {
    const tipo = Object.keys(msg.message)[0];
    const m = msg.message;
    return (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        ""
    );
}

async function handler(Jhon, msg) {
    const from = msg.key.remoteJid;
    const sender = msg.key.fromMe ? Jhon.user.id : (msg.key.participant || msg.key.remoteJid);
    const texto = obtenerTexto(msg).trim();

    if (!config.prefix.test(texto)) return;

    const prefijo = texto.match(config.prefix)[0];
    const cuerpo = texto.slice(prefijo.length).trim();
    const comando = cuerpo.split(" ")[0].toLowerCase();
    const args = cuerpo.split(" ").slice(1);

    const ctx = {
        from,
        sender,
        prefijo,
        comando,
        args,
        texto: cuerpo,
        msg,
        config
    };

    const plugin = plugins.find((p) => p.comando.includes(comando));
    if (!plugin) return;

    try {
        await plugin.ejecutar(Jhon, ctx);
    } catch (error) {
        await Jhon.sendMessage(from, {
            text: `> ✰ Ocurrió un error ejecutando ese comando ꕥ créditos: ${config.credits}`
        }, { quoted: msg });
        console.log(error);
    }
}

module.exports = { handler };
