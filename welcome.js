const config = require("../config.js");

async function welcomeHandler(Jhon, evento) {
    const { id, participants, action } = evento;
    if (action !== "add") return;

    const metadata = await Jhon.groupMetadata(id);

    for (const jid of participants) {
        const texto = `
> ✰ ¡Bienvenido/a @${jid.split("@")[0]} a *_${metadata.subject}_*!

ꕥ Soy *_${config.botName}_*, el bot de este grupo
✐ Escribe *_.menu_* para ver mis comandos

> créditos: *_${config.credits}_*
        `.trim();

        await Jhon.sendMessage(id, {
            text: texto,
            mentions: [jid]
        });
    }
}

module.exports = { welcomeHandler };
