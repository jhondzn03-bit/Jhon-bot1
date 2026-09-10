module.exports = {
    comando: ["menu", "help", "ayuda"],
    ejecutar: async (Jhon, ctx) => {
        const { from, sender, prefijo, msg, config } = ctx;

        const texto = `
> ✰ Hola @${sender.split("@")[0]}, soy *_${config.botName}_*

ꕥ *MENÚ PRINCIPAL* ꕥ

✐ ${prefijo}menu — muestra este menú
✐ ${prefijo}ping — verifica si estoy activo

> créditos: *_${config.credits}_*
        `.trim();

        await Jhon.sendMessage(from, {
            text: texto,
            mentions: [sender]
        }, { quoted: msg });
    }
};
