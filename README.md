# CRM Odontológico

Aplicación Angular para registrar consultas y actualizar el odontograma.

## Dictado de voz con Groq Cloud

El navegador graba el audio completo y lo envía al servidor SSR, que lo transcribe en español con
`whisper-large-v3` y contexto odontológico para favorecer la precisión. La clave de Groq solo se
configura en el servidor; nunca la incluyas en Angular, en el repositorio ni en variables
`NG_APP_*`. El uso gratuito depende de los límites y cuotas vigentes de la cuenta de Groq.

Para desarrollo local, configura `GROQ_API_KEY` en el entorno del servidor. Inicia primero el
servidor SSR, que también proporciona el proxy seguro para Groq:

```bash
npm run build
GROQ_API_KEY=tu_clave npm run serve:ssr:crm-odontologico
```

En otra terminal, inicia el backend Java en el puerto `8080` y luego Angular:

```bash
npm start
```

El proxy de desarrollo reenvía `/api/speech-to-text` al servidor SSR en `localhost:4000` y
`/api/v1` al backend Java en `localhost:8080`; reinicia `npm start` después de cambiar su
configuración. El servidor SSR también reenvía `/api/v1` al backend Java. En despliegues, configura
`JAVA_API_BASE_URL` con la URL base accesible desde el proceso SSR (por defecto
`http://localhost:8080`). El proxy espera hasta 5 minutos por respuesta; puedes cambiarlo con
`JAVA_API_TIMEOUT_MS` (milisegundos, por defecto `300000`). Configura también el proxy del hosting
para enrutar `/api/v1` al backend Java si el navegador accede al frontend por otro servidor. Los
túneles y gateways, como el de Codespaces, pueden imponer un límite menor y devolver `504` antes
de que venza este timeout; en ese caso, aumentarlo no bastará y habrá que reducir el tiempo de
respuesta del backend o acceder mediante un gateway que permita solicitudes más largas.
Configura `GROQ_API_KEY` como variable de
entorno secreta del proceso SSR. Protege `/api/speech-to-text` con
autenticación y límites de uso adecuados para tu despliegue. El audio se envía a Groq Cloud para
su transcripción; confirma que este tratamiento cumple las políticas de privacidad aplicables a
los datos clínicos de tus pacientes.

## Datos del paciente

La vista inicial continúa siendo el odontograma. La opción **Paciente** de la navegación abre una
vista separada con una ficha de nombres, apellidos, identificación, edad, género, contacto,
dirección, aseguradora, alergias, medicamentos y antecedentes médicos y odontológicos.

En esa vista, inicia una grabación, dicta todos los datos que conozcas y detenla. El servidor SSR
transcribe el audio con Groq; luego el frontend envía la transcripción a
`POST /api/v1/pacientes/voice-capture` en el backend Java, que estructura los datos usando el mismo
proveedor de IA configurado para el odontograma. Los campos que no fueron mencionados se devuelven
vacíos y permanecen sin cambios en el formulario. Revisa y corrige siempre los resultados.

El endpoint recibe `{"textoCapturado":"..."}` y devuelve un objeto con los campos
`nombres`, `apellidos`, `identificacion`, `edad`, `genero`, `telefono`, `correo`, `direccion`,
`ocupacion`, `aseguradora`, `contactoEmergencia`, `alergias`, `medicamentos`,
`antecedentesMedicos` y `antecedentesOdontologicos`. La extracción usa `ODONTOGRAMA_AI_PROVIDER`
(Google AI por defecto u Ollama), no la clave de Groq; Groq se usa para la transcripción de audio.

La ficha solo se mantiene en memoria mientras la aplicación está abierta. No se guarda ni se envía
a la base de datos clínica; recargar la página la borra. El audio se envía a Groq Cloud para
transcribirlo y la transcripción al proveedor de IA configurado en el backend para estructurarla.

## Compilar y probar

```bash
npm run build
npm test -- --watch=false
```
