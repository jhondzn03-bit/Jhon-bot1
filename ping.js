module.exports = {
    comando: ["ping"],
    ejecutar: async (Jhon, ctx) => {
        const { from, msg, config } = ctx;
        const inicio = Date.now();
        const enviado = await Jhon.sendMessage(from, { text: "꒐ midiendo..." }, { quoted: msg });
        const velocidad = Date.now() - inicio;
        await Jhon.sendMessage(from, {
            text: `> ✰ *_${config.botName}_* activo\nꕥ velocidad: ${velocidad}ms\n\n> créditos: *_${config.credits}_*`,
            edit: enviado.key
        });
    }
};
