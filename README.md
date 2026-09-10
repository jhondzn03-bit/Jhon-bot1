# Jhon Bot

Base simple de bot de WhatsApp usando `github:russellxz/ultra-baileys`.

## Instalación

```
npm install
node index.js
```

Edita `config.js` para poner tu número en `pairingNumber` y tu jid en `owner`.

## Estructura

- `index.js` — conexión con baileys, pairing code y eventos
- `handler.js` — carga y ejecuta los plugins según el prefijo
- `plugins/menu.js` — comando `.menu`
- `plugins/ping.js` — comando `.ping`
- `plugins/welcome.js` — mensaje de bienvenida con mención real por jid

Créditos: **Matthieu-x**
