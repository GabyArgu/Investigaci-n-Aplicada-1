import React, { useState, useRef, useEffect } from "react";
import respuestasData from "../data/respuestas.json";
import "./Chatbot.css";
import ReactMarkdown from 'react-markdown';

const Chatbot = () => {
    const [historial, setHistorial] = useState([
        { emisor: "bot", mensaje: "¡Hola! Soy Medibot 🤖, tu asistente de salud en línea. ¿En qué puedo ayudarte hoy? Puedes escribir 'menú' para ver mis opciones." }
    ]);
    const [entrada, setEntrada] = useState("");
    const [contextoConversacion, setContextoConversacion] = useState(null);
    const [lastBotQuestion, setLastBotQuestion] = useState(null);
    const [lastSpecialtyMentioned, setLastSpecialtyMentioned] = useState(null);
    const [sintomasAcumulados, setSintomasAcumulados] = useState([]);
    const chatBoxRef = useRef(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [historial]);

    const normalizarTexto = (texto) => {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    };

    const agregarMensaje = (emisor, mensaje) => {
        setHistorial((prev) => [...prev, { emisor, mensaje }]);
    };

    const manejarEnvio = () => {
        if (!entrada.trim()) return;

        const mensajeUsuarioOriginal = entrada;
        const mensajeUsuarioNormalizado = normalizarTexto(entrada);

        agregarMensaje("usuario", mensajeUsuarioOriginal);
        procesarMensaje(mensajeUsuarioNormalizado);
        setEntrada("");
    };

    const getMatchingIntents = (textoUsuario, sectionData) => {
        const matches = [];
        for (const sectionKey in sectionData) {
            const section = sectionData[sectionKey];
            if (section && section.preguntas && Array.isArray(section.preguntas)) {
                for (const phrase of section.preguntas) {
                    const normalizedPhrase = normalizarTexto(phrase);
                    if (textoUsuario.includes(normalizedPhrase) && normalizedPhrase.length >= 2) {
                        matches.push({
                            key: sectionKey,
                            entry: section,
                            score: normalizedPhrase.length
                        });
                    }
                }
            } else {
                for (const itemKey in section) {
                    const item = section[itemKey];
                    if (item && item.preguntas && Array.isArray(item.preguntas)) {
                        for (const phrase of item.preguntas) {
                            const normalizedPhrase = normalizarTexto(phrase);
                            if (textoUsuario.includes(normalizedPhrase) && normalizedPhrase.length >= 2) {
                                matches.push({
                                    key: itemKey,
                                    entry: item,
                                    score: normalizedPhrase.length
                                });
                            }
                        }
                    }
                }
            }
        }
        return matches.sort((a, b) => b.score - a.score);
    };

    const recomendarEspecialista = (sintomas) => {
        if (sintomas.length === 0) {
            return {
                especialista: "médico general",
                razon: "para una evaluación inicial.",
                recomendacion_detallada: "Dado que no has especificado síntomas, un **médico general** es siempre el punto de partida ideal para una evaluación inicial y para determinar cualquier paso adicional."
            };
        }

        const especialistaScores = {
            "médico general": 0,
            "internista": 0,
            "neumólogo": 0,
            "otorrinolaringólogo": 0,
            "gastroenterólogo": 0,
            "neurólogo": 0,
            "ortopeda": 0,
            "alergólogo": 0,
            "cardiólogo": 0,
            "reumatólogo": 0,
            "dermatólogo": 0,
            "pediatra": 0,
            "ginecólogo": 0,
            "nutricionista": 0,
            "psicólogo": 0,
            "psiquiatra": 0
        };

        const sintomaEspecialistaMap = {
            "fiebre_alta": [{esp: "médico general", weight: 1}, {esp: "internista", weight: 0.8}],
            "dolor_garganta": [{esp: "médico general", weight: 1}, {esp: "otorrinolaringólogo", weight: 1.5}],
            "tos_persistente": [{esp: "médico general", weight: 1}, {esp: "neumólogo", weight: 1.8}, {esp: "alergólogo", weight: 1.2}],
            "molestias_respirar": [{esp: "médico general", weight: 1}, {esp: "neumólogo", weight: 2}, {esp: "cardiólogo", weight: 1.5}],
            "dolor_cabeza": [{esp: "médico general", weight: 1}, {esp: "neurólogo", weight: 1.5}],
            "dolor_cuerpo": [{esp: "médico general", weight: 1}, {esp: "reumatólogo", weight: 0.8}, {esp: "ortopeda", weight: 0.8}],
            "dolor_abdominal": [{esp: "médico general", weight: 1}, {esp: "gastroenterólogo", weight: 1.5}],
            "dolor_espalda": [{esp: "médico general", weight: 1}, {esp: "ortopeda", weight: 1.5}],
            "nauseas_vomitos": [{esp: "médico general", weight: 1}, {esp: "gastroenterólogo", weight: 1.2}],
            "erupciones_piel": [{esp: "médico general", weight: 1}, {esp: "dermatólogo", weight: 1.8}, {esp: "alergólogo", weight: 1.2}],
            "mareos": [{esp: "médico general", weight: 1}, {esp: "neurólogo", weight: 1.2}, {esp: "otorrinolaringólogo", weight: 1}],
            "palpitaciones": [{esp: "médico general", weight: 1}, {esp: "cardiólogo", weight: 2}]
        };

        sintomas.forEach(sintomaKey => {
            if (sintomaEspecialistaMap[sintomaKey]) {
                sintomaEspecialistaMap[sintomaKey].forEach(item => {
                    especialistaScores[item.esp] = (especialistaScores[item.esp] || 0) + item.weight;
                });
            } else {
                especialistaScores["médico general"] = (especialistaScores["médico general"] || 0) + 0.5;
            }
        });

        let mejorEspecialista = "médico general";
        let maxScore = -1;

        for (const esp in especialistaScores) {
            if (especialistaScores[esp] > maxScore) {
                maxScore = especialistaScores[esp];
                mejorEspecialista = esp;
            } else if (especialistaScores[esp] === maxScore) {
                if (esp !== "médico general" && maxScore > 0) {
                     mejorEspecialista = esp;
                }
            }
        }

        const sintomasLegibles = sintomas.map(s => {
            const sintomaEntry = respuestasData.sintomas_orientacion[s];
            return sintomaEntry && sintomaEntry.preguntas && sintomaEntry.preguntas.length > 0
                ? sintomaEntry.preguntas[0]
                : s.replace(/_/g, ' ');
        }).join(", ");

        let razon = `para evaluar tus síntomas de ${sintomasLegibles}.`;
        let recomendacion_detallada = `Con base en tus síntomas (${sintomasLegibles}), te recomiendo visitar a un **${mejorEspecialista}**. `;

        if (mejorEspecialista === "médico general" || mejorEspecialista === "internista") {
            recomendacion_detallada += "Él o ella podrá darte una evaluación inicial completa y, si es necesario, referirte a un especialista más específico.";
        } else {
            recomendacion_detallada += "Este especialista es el más adecuado para abordar ese tipo de problemas. Si la situación es muy compleja o hay varios síntomas, siempre puedes empezar con un **médico general** para una primera evaluación.";
        }

        return {
            especialista: mejorEspecialista,
            razon: razon,
            recomendacion_detallada: recomendacion_detallada
        };
    };

    const procesarMensaje = (textoNormalizado) => {
        let respuestaBot = "Lo siento, no encontré información específica sobre eso. ¿Podrías intentar con otra pregunta o escribir 'menú' para ver mis opciones? Si es una emergencia vital, por favor llama al 911.";
        let nuevoContexto = null;
        let handled = false;

        const yesKeywords = ["si", "sí", "por favor", "me gustaria", "claro", "afirmativo", "definitivamente", "hazlo", "quiero", "ok", "adelante", "dame uno", "recomiendame uno", "agendala", "si agendala", "si porfavor"];
        const noKeywords = ["no", "no gracias", "no quiero", "negativo", "omitir", "ahora no", "aun no", "nada mas"];
        const acknowledgeKeywords = ["ok", "oki", "entendido", "vale", "listo", "perfecto", "de acuerdo"];
        const masDetallesKeywords = ["mas detalles", "dime mas", "explicame mas", "informacion adicional", "dame mas informacion", "mas info"];


        // --- Prioridad 0: Despedidas ---
        const despedidaMatches = getMatchingIntents(textoNormalizado, {
            "despedida": respuestasData.general.despedida
        });
        if (despedidaMatches.length > 0 && !handled) {
            respuestaBot = despedidaMatches[0].entry.respuestas[Math.floor(Math.random() * despedidaMatches[0].entry.respuestas.length)];
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(null);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            setSintomasAcumulados([]);
            handled = true;
            return;
        }

        // --- Prioridad 1: Preguntas directas sobre el bot (nombre, edad) ---
        const botInfoMatches = getMatchingIntents(textoNormalizado, {
            "nombre_bot": respuestasData.general.nombre_bot,
            "edad_bot": respuestasData.general.edad_bot
        });
        if (botInfoMatches.length > 0 && !handled) {
            const bestMatch = botInfoMatches[0];
            respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(null);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            handled = true;
            return;
        }

        // --- Prioridad 2: Manejo de "más detalles" cuando hay una especialidad mencionada ---
        if (masDetallesKeywords.some(keyword => textoNormalizado.includes(keyword)) && lastSpecialtyMentioned && contextoConversacion === "especialidades" && !handled) {
            const specialtyData = respuestasData.especialidades_medicas[lastSpecialtyMentioned];
            if (specialtyData && specialtyData.detalles_adicionales) {
                respuestaBot = specialtyData.detalles_adicionales;
                respuestaBot += " " + (specialtyData.specific_prompt || `¿Hay algo más que quieras saber sobre ${specialtyData.preguntas[0]} o quieres agendar una cita?`);
                setLastBotQuestion("agendar_cita_especialidad"); // Pregunta si quiere agendar para la especialidad
                setContextoConversacion("especialidades"); // Mantener en el contexto de especialidades
            } else {
                respuestaBot = `No tengo más detalles específicos en este momento sobre ${lastSpecialtyMentioned.replace(/_/g, ' ')}. ¿Te gustaría saber sobre **agendar una cita** con esta especialidad o ver el **menú**?`;
                setLastBotQuestion("agendar_cita_especialidad");
                setContextoConversacion("especialidades");
            }
            agregarMensaje("bot", respuestaBot);
            handled = true;
            return;
        }

        // --- Prioridad 3: Lógica para manejar "Sí", "No" en función de la última pregunta del bot ---
        if (lastBotQuestion) {
            // Manejar confirmación de agendar cita con especialista (ya sea por recomendación o especialidad directa)
            if (lastBotQuestion.startsWith("agendar_cita_")) {
                const especialistaRecomendado = lastBotQuestion.replace("agendar_cita_recomendacion_", ""); // Extrae el nombre si viene de recomendación
                if (yesKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    const esp = (especialistaRecomendado === "agendar_cita_especialidad" || especialistaRecomendado === "") ? "un especialista" : `un ${especialistaRecomendado.replace(/_/g, ' ')}`;
                    respuestaBot = `¡Excelente! Para agendar tu cita con ${esp}, puedes hacerlo de estas tres maneras: 1) Llamando al **2234-5678**, 2) En nuestra web **www.clinicaprueba.com**, o 3) Presencialmente. ¿Cuál de estas opciones prefieres?`;
                    setContextoConversacion("agendar_cita_opciones");
                    setLastBotQuestion("agendar_cita_opciones_pref");
                    agregarMensaje("bot", respuestaBot);
                    setSintomasAcumulados([]);
                    // Mantener lastSpecialtyMentioned si viene de una especialidad para el agendamiento
                    // Si viene de recomendación de síntomas, lastSpecialtyMentioned puede ser null o el especialista recomendado
                    handled = true;
                    return;
                } else if (noKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    respuestaBot = "De acuerdo, no agendaremos una cita en este momento. ¿Hay algo más en lo que pueda ayudarte, o prefieres volver al 'menú' principal?";
                    setContextoConversacion(null);
                    setLastBotQuestion(null);
                    setSintomasAcumulados([]);
                    setLastSpecialtyMentioned(null);
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                }
            }
            // Manejar confirmación para recomendar especialista final (después de síntomas)
            else if (lastBotQuestion === "recomendar_especialista_final") {
                if (yesKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    const recomendacion = recomendarEspecialista(sintomasAcumulados);
                    respuestaBot = `${recomendacion.recomendacion_detallada} ¿Te gustaría que te ayude a **agendar una cita** con un **${recomendacion.especialista}**?`;
                    setLastBotQuestion(`agendar_cita_recomendacion_${recomendacion.especialista}`);
                    setContextoConversacion(null);
                    setLastSpecialtyMentioned(recomendacion.especialista.replace(/ /g, '_')); // Guardar el especialista recomendado
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                } else if (noKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    respuestaBot = "De acuerdo, no te haré una recomendación en este momento. ¿Hay algo más sobre tus síntomas o especialidades que quieras saber, o prefieres volver al 'menú' principal?";
                    setContextoConversacion(null);
                    setLastBotQuestion(null);
                    setLastSpecialtyMentioned(null);
                    setSintomasAcumulados([]);
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                }
            }
            // Manejar respuesta a preguntas generales de confirmación (ej. "¿Hay algo más en lo que pueda ayudarte?")
            else if (lastBotQuestion === "pregunta_general_ayuda") {
                if (yesKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    respuestaBot = "¡Claro! Dime, ¿qué necesitas saber?";
                    setContextoConversacion(null);
                    setLastBotQuestion(null);
                    setLastSpecialtyMentioned(null);
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                } else if (noKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    respuestaBot = respuestasData.general.despedida.respuestas[Math.floor(Math.random() * respuestasData.general.despedida.respuestas.length)];
                    setContextoConversacion(null);
                    setLastBotQuestion(null);
                    setLastSpecialtyMentioned(null);
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                }
            }
            // Manejar confirmación para agendar desde Prevención/Bienestar (ej. Nutricionista)
            else if (lastBotQuestion.startsWith("agendar_desde_pb_")) {
                const especialistaPB = lastBotQuestion.replace("agendar_desde_pb_", "");
                if (yesKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    respuestaBot = `¡Excelente! Para agendar tu cita con un **${especialistaPB.replace(/_/g, ' ')}**, puedes hacerlo de estas tres maneras: 1) Llamando al **2234-5678**, 2) En nuestra web **www.clinicaprueba.com**, o 3) Presencialmente. ¿Cuál de estas opciones prefieres?`;
                    setContextoConversacion("agendar_cita_opciones");
                    setLastBotQuestion("agendar_cita_opciones_pref");
                    setLastSpecialtyMentioned(especialistaPB); // Asegura que sepa qué especialidad agendar
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                } else if (noKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                    respuestaBot = "De acuerdo, no agendaremos una cita en este momento. ¿Hay algo más sobre prevención y bienestar que quieras saber, o prefieres volver al 'menú' principal?";
                    setContextoConversacion("prevencion_bienestar"); // Vuelve al contexto de prevención
                    setLastBotQuestion(null);
                    setLastSpecialtyMentioned(null);
                    agregarMensaje("bot", respuestaBot);
                    handled = true;
                    return;
                }
            }
        }


        // --- Prioridad 4: Manejo de la preferencia de agendar cita (web, telefono, presencial) ---
        if (contextoConversacion === "agendar_cita_opciones" && lastBotQuestion === "agendar_cita_opciones_pref") {
            if (textoNormalizado.includes("web") || textoNormalizado.includes("en linea") || textoNormalizado.includes("internet") || textoNormalizado.includes("pagina")) {
                respuestaBot = "¡Entendido! Para agendar tu cita en línea, por favor visita nuestra página web: **www.clinicaprueba.com/citas**. Es un proceso rápido y fácil.";
                nuevoContexto = null;
                setSintomasAcumulados([]);
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            } else if (textoNormalizado.includes("telefono") || textoNormalizado.includes("llamada") || textoNormalizado.includes("llamar") || textoNormalizado.includes("numero")) {
                respuestaBot = "Claro, para agendar tu cita por teléfono, puedes llamarnos al **2234-5678** en nuestros horarios de atención (L-V, 8 AM - 5 PM).";
                nuevoContexto = null;
                setSintomasAcumulados([]);
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            } else if (textoNormalizado.includes("presencial") || textoNormalizado.includes("clinica") || textoNormalizado.includes("ir") || textoNormalizado.includes("fisico") || textoNormalizado.includes("recepcion")) {
                respuestaBot = "De acuerdo, puedes acercarte directamente a nuestra clínica en **Calle Principal #123, Colonia San Benito, San Salvador** y agendar tu cita en recepción.";
                nuevoContexto = null;
                setSintomasAcumulados([]);
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            } else {
                respuestaBot = "Disculpa, no entendí tu preferencia. ¿Prefieres agendar por **'web'**, por **'teléfono'** o **'presencialmente'** en la clínica? Si ya no deseas agendar, puedes escribir 'menú'.";
                nuevoContexto = "agendar_cita_opciones";
                // No reseteamos lastBotQuestion aquí, lo mantenemos para reintentar la elección.
                // setLastSpecialtyMentioned(null); // No resetear aquí para mantener el contexto si intenta de nuevo
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }

        // --- Prioridad 5: Manejo de palabras de reconocimiento (oki, entendido, etc.) ---
        if (acknowledgeKeywords.some(keyword => textoNormalizado.includes(keyword)) && !handled) {
            respuestaBot = "De nada. ¿Hay algo más en lo que pueda ayudarte o quieres volver al menú?";
            setContextoConversacion(null);
            setLastBotQuestion("pregunta_general_ayuda");
            setLastSpecialtyMentioned(null);
            agregarMensaje("bot", respuestaBot);
            handled = true;
            return;
        }

        // --- Prioridad 6: Lógica de Saludos (prioridad alta y sin contexto) ---
        const saludosKeywords = ["hola", "buenas", "buenos dias", "buen dia", "hey", "saludos", "que tal", "hola bot", "hola medico", "hola asistente", "holi"];
        if (saludosKeywords.some(keyword => textoNormalizado.includes(keyword))) {
            respuestaBot = respuestasData.bienvenida.respuestas[Math.floor(Math.random() * respuestasData.bienvenida.respuestas.length)];
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(null);
            setSintomasAcumulados([]);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            handled = true;
            return;
        }

        // --- Prioridad 7: Lógica del Menú Principal (prioridad alta y setea contexto) ---
        const menuKeywords = ["menu", "opciones", "ayuda", "que puedes hacer", "que haces", "ayudame", "lista de opciones", "volver al menu", "categorias", "temas"];
        if (menuKeywords.some(keyword => textoNormalizado.includes(keyword))) {
            respuestaBot = respuestasData.menu.respuestas[Math.floor(Math.random() * respuestasData.menu.respuestas.length)];
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion("menu_principal_esperando_opcion");
            setSintomasAcumulados([]);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            handled = true;
            return;
        }

        // --- Prioridad 8: Manejo de "bromas" o "quién eres" antes de otros contextos ---
        const bromaMatches = getMatchingIntents(textoNormalizado, respuestasData.bromas);
        if (bromaMatches.length > 0 && !handled) {
            const bestMatch = bromaMatches[0];
            respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(null);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            handled = true;
            return;
        }

        // --- Prioridad 9: Manejo de la frase "me siento mal" o síntomas generales (prioridad alta) ---
        const meSientoMalMatches = getMatchingIntents(textoNormalizado, {
            "me_siento_mal": respuestasData.sintomas_orientacion.me_siento_mal
        });
        const sintomaMatchesDirect = getMatchingIntents(textoNormalizado, respuestasData.sintomas_orientacion);

        if (meSientoMalMatches.length > 0 && !handled) {
            respuestaBot = meSientoMalMatches[0].entry.respuestas[0];
            setContextoConversacion("sintomas");
            setSintomasAcumulados([]);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            agregarMensaje("bot", respuestaBot);
            handled = true;
            return;
        } else if (sintomaMatchesDirect.length > 0 && contextoConversacion !== "sintomas" && !handled) {
            const nuevosSintomas = sintomaMatchesDirect.map(match => match.key);
            setSintomasAcumulados(prev => {
                const uniqueSymptoms = new Set([...prev, ...nuevosSintomas]);
                return Array.from(uniqueSymptoms);
            });
            const bestMatch = sintomaMatchesDirect[0];
            respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
            respuestaBot += " " + (bestMatch.entry.specific_prompt || "¿Tienes algún **otro síntoma** que te preocupe, o quieres que te **recomiende un especialista** con lo que ya me has dicho?");
            setLastBotQuestion("recomendar_especialista_final");
            setContextoConversacion("sintomas");
            setLastSpecialtyMentioned(null);
            agregarMensaje("bot", respuestaBot);
            handled = true;
            return;
        }

        // --- Prioridad 10: Activación robusta de la recomendación de especialista (después de síntomas) ---
        const activarRecomendacionKeywords = ["ya te dije todo", "ya te conte todo", "que hago", "que me recomiendas", "y ahora que", "dime que tengo", "cual es mi diagnostico", "recomiendame uno", "hazlo", "recomienda un especialista", "dame una recomendacion", "dime el especialista", "solo eso", "es todo", "siguiente"];
        if (activarRecomendacionKeywords.some(keyword => textoNormalizado.includes(keyword)) && contextoConversacion === "sintomas" && !handled) {
             if (sintomasAcumulados.length > 0) {
                const recomendacion = recomendarEspecialista(sintomasAcumulados);
                respuestaBot = `${recomendacion.recomendacion_detallada} ¿Te gustaría que te ayude a **agendar una cita** con un **${recomendacion.especialista}**?`;
                setLastBotQuestion(`agendar_cita_recomendacion_${recomendacion.especialista}`);
                setContextoConversacion(null);
                setLastSpecialtyMentioned(recomendacion.especialista.replace(/ /g, '_')); // Guardar el especialista recomendado para agendamiento posterior
                agregarMensaje("bot", respuestaBot);
                handled = true;
                return;
            } else {
                respuestaBot = "Para poder recomendarte un especialista, primero necesito que me digas qué síntomas tienes. ¿Puedes ser más específico? Por ejemplo: 'dolor de cabeza', 'fiebre'.";
                setContextoConversacion("sintomas");
                setLastSpecialtyMentioned(null);
                agregarMensaje("bot", respuestaBot);
                handled = true;
                return;
            }
        }


        // --- Prioridad 11: Manejo de Preguntas Generales (Horarios, Contacto, etc.) ---
        if (!handled) {
            const generalMatches = getMatchingIntents(textoNormalizado, {
                "horarios": respuestasData.preguntas_generales.horarios,
                "contacto": respuestasData.preguntas_generales.contacto,
                "urgencias": respuestasData.preguntas_generales.urgencias,
                "seguros_medicos": respuestasData.preguntas_generales.seguros_medicos,
                "documentos_nuevos_pacientes": respuestasData.preguntas_generales.documentos_nuevos_pacientes,
                "historial_medico": respuestasData.preguntas_generales.historial_medico,
                "formas_pago": respuestasData.preguntas_generales.formas_pago,
                "agendar_cita": respuestasData.preguntas_generales.agendar_cita,
                "gracias": respuestasData.general.gracias,
                "como_estas": respuestasData.general.como_estas
            });

            if (generalMatches.length > 0) {
                const bestMatch = generalMatches[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];

                if (bestMatch.entry.specific_prompt) {
                    respuestaBot += " " + bestMatch.entry.specific_prompt;
                    if (bestMatch.key !== "agendar_cita") {
                        setLastBotQuestion("pregunta_general_ayuda");
                    }
                } else if (bestMatch.key === "gracias") {
                     setLastBotQuestion("pregunta_general_ayuda");
                } else {
                    setLastBotQuestion(null);
                }

                if (bestMatch.key === "agendar_cita") {
                    setContextoConversacion("agendar_cita_opciones"); // Fuerza el contexto de agendamiento
                    setLastBotQuestion("agendar_cita_opciones_pref"); // Prepara para la pregunta de preferencia
                    setSintomasAcumulados([]);
                    setLastSpecialtyMentioned(null); // No hay una especialidad específica de la que agendar en este punto general
                } else {
                    setContextoConversacion(bestMatch.entry.next_context);
                    setLastSpecialtyMentioned(null);
                }
                agregarMensaje("bot", respuestaBot);
                handled = true;
                return;
            }
        }


        // --- Prioridad 12: Procesamiento basado en el Contexto de la Conversación (si no se ha manejado ya) ---
        if (!handled && contextoConversacion === "menu_principal_esperando_opcion") {
            if (textoNormalizado.includes("1") || textoNormalizado.includes("sintomas") || textoNormalizado.includes("problemas de salud")) {
                respuestaBot = "Has elegido **Síntomas generales y orientación médica**. Dime, ¿qué síntoma te preocupa? Por ejemplo: 'me duele la cabeza', 'tengo fiebre' o 'problemas para respirar'. Si quieres ver las opciones de nuevo, escribe 'menú'.";
                nuevoContexto = "sintomas";
            } else if (textoNormalizado.includes("2") || textoNormalizado.includes("especialidades") || textoNormalizado.includes("doctores") || textoNormalizado.includes("medicos")) {
                respuestaBot = "Has elegido **Especialidades médicas**. ¿Qué especialidad te interesa o qué tipo de doctor buscas? Por ejemplo: 'dermatólogo', 'cardiólogo' o 'diferencia entre internista y general'. Si quieres ver las opciones de nuevo, escribe 'menú'.";
                nuevoContexto = "especialidades";
            } else if (textoNormalizado.includes("3") || textoNormalizado.includes("servicios") || textoNormalizado.includes("atencion clinica") || textoNormalizado.includes("que ofrece la clinica") || textoNormalizado.includes("agendar cita")) {
                respuestaBot = "Has elegido **Servicios y atención en la clínica**. ¿Qué te gustaría saber? Por ejemplo: 'horarios', 'cómo agendar una cita' o 'si atienden urgencias'. Si quieres ver las opciones de nuevo, escribe 'menú'.";
                nuevoContexto = "servicios_clinica";
            } else if (textoNormalizado.includes("4") || textoNormalizado.includes("prevencion") || textoNormalizado.includes("bienestar") || textoNormalizado.includes("salud mental") || textoNormalizado.includes("cuidado personal")) {
                respuestaBot = "Has elegido **Prevención, bienestar y salud mental**. ¿Necesitas ayuda con el estrés, nutrición, o quieres saber sobre chequeos preventivos? Si quieres ver las opciones de nuevo, escribe 'menú'.";
                nuevoContexto = "prevencion_bienestar";
            } else if (textoNormalizado.includes("5") || textoNormalizado.includes("informacion administrativa") || textoNormalizado.includes("papeles") || textoNormalizado.includes("pagos") || textoNormalizado.includes("administracion")) {
                respuestaBot = "Has elegido **Información administrativa**. ¿Qué necesitas saber? Por ejemplo: 'documentos para registrarme', 'si aceptan seguros' o 'cómo solicitar mi historial médico'. Si quieres ver las opciones de nuevo, escribe 'menú'.";
                nuevoContexto = "informacion_administrativa";
            } else {
                respuestaBot = "Hmm, parece que no elegiste una opción válida del 1 al 5. Por favor, intenta de nuevo o escribe la categoría (ej. 'síntomas', 'especialidades').";
                nuevoContexto = "menu_principal_esperando_opcion";
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            setSintomasAcumulados([]);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
            handled = true;
            return;
        }


        // --- Otros contextos (especialidades, servicios, etc.) ---
        if (!handled && contextoConversacion === "especialidades") {
            const medicoGeneralMatch = getMatchingIntents(textoNormalizado, {
                "medico_general": respuestasData.especialidades_medicas.medico_general,
                "medico_general_internista_diferencia": respuestasData.especialidades_medicas.medico_general_internista_diferencia
            });

            if (medicoGeneralMatch.length > 0) {
                const bestMatch = medicoGeneralMatch[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
                nuevoContexto = bestMatch.entry.next_context;
                setLastSpecialtyMentioned(bestMatch.key);

                if (!nuevoContexto) {
                    respuestaBot += " " + (bestMatch.entry.specific_prompt || `¿Necesitas más detalles sobre ${bestMatch.key.replace(/_/g, ' ')}, o quieres saber sobre **agendar una cita** con ella?`);
                    setLastBotQuestion("agendar_cita_especialidad");
                    nuevoContexto = "especialidades";
                }
                agregarMensaje("bot", respuestaBot);
                setContextoConversacion(nuevoContexto);
                handled = true;
                return;
            }

            const matches = getMatchingIntents(textoNormalizado, respuestasData.especialidades_medicas);
            if (matches.length > 0) {
                const bestMatch = matches[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
                nuevoContexto = bestMatch.entry.next_context;
                setLastSpecialtyMentioned(bestMatch.key);

                if (!nuevoContexto) {
                    respuestaBot += " " + (bestMatch.entry.specific_prompt || `¿Necesitas más detalles sobre ${bestMatch.key.replace(/_/g, ' ')}, o quieres saber sobre **agendar una cita** con ella?`);
                    setLastBotQuestion("agendar_cita_especialidad");
                    nuevoContexto = "especialidades";
                }
            } else {
                respuestaBot = "No encontré esa especialidad. Sigo en el tema de **Especialidades médicas**. ¿Buscas un 'dermatólogo', 'cardiólogo', 'pediatra', o te interesa saber la 'diferencia entre médico general e internista'? Si quieres volver al menú, escribe 'menú'.";
                nuevoContexto = "especialidades";
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }

        if (!handled && contextoConversacion === "sintomas") {
            const sintomaMatches = getMatchingIntents(textoNormalizado, respuestasData.sintomas_orientacion);
            if (sintomaMatches.length > 0) {
                const nuevosSintomas = sintomaMatches.map(match => match.key);
                setSintomasAcumulados(prev => {
                    const uniqueSymptoms = new Set([...prev, ...nuevosSintomas]);
                    return Array.from(uniqueSymptoms);
                });
                const bestMatch = sintomaMatches[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
                respuestaBot += " " + (bestMatch.entry.specific_prompt || "¿Tienes algún **otro síntoma** que te preocupe, o quieres que te **recomiende un especialista** con lo que ya me has dicho?");
                setLastBotQuestion("recomendar_especialista_final");
                nuevoContexto = "sintomas";
                setLastSpecialtyMentioned(null);
            } else {
                respuestaBot = "No entendí ese síntoma. Por favor, describe tu síntoma con palabras más comunes, como 'dolor de cabeza', 'fiebre', o 'tos'. Si ya quieres una recomendación, escribe 'recomiéndame un especialista'.";
                nuevoContexto = "sintomas";
                setLastSpecialtyMentioned(null);
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }


        if (!handled && contextoConversacion === "servicios_clinica") {
            const matches = getMatchingIntents(textoNormalizado, respuestasData.preguntas_generales);
            if (matches.length > 0) {
                const bestMatch = matches[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];

                if (bestMatch.key === "agendar_cita") {
                    respuestaBot += " " + (bestMatch.entry.specific_prompt || "¿Cuál de estas opciones prefieres?");
                    setContextoConversacion("agendar_cita_opciones");
                    setLastBotQuestion("agendar_cita_opciones_pref");
                    setSintomasAcumulados([]);
                    setLastSpecialtyMentioned(null);
                } else {
                    if (bestMatch.entry.specific_prompt) {
                        respuestaBot += " " + bestMatch.entry.specific_prompt;
                    }
                    setContextoConversacion(bestMatch.entry.next_context);
                    setLastBotQuestion("pregunta_general_ayuda");
                    setLastSpecialtyMentioned(null);
                }
            } else {
                respuestaBot = "Sigo en el tema de **Servicios y atención en la clínica**. ¿Qué te gustaría saber? ¿Nuestros 'horarios', 'cómo agendar una cita', o si 'atienden urgencias'? Para volver al menú principal, escribe 'menú'.";
                nuevoContexto = "servicios_clinica";
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }

        if (!handled && contextoConversacion === "prevencion_bienestar") {
            // Buscamos intents específicos dentro de prevención_bienestar
            const matches = getMatchingIntents(textoNormalizado, respuestasData.prevencion_bienestar);
            if (matches.length > 0) {
                const bestMatch = matches[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
                nuevoContexto = bestMatch.entry.next_context;

                if (bestMatch.key === "nutricionista") { // Si la match es el nutricionista
                    respuestaBot += " " + (bestMatch.entry.specific_prompt || "¿Te gustaría agendar una consulta con un nutricionista para un plan personalizado?");
                    setLastBotQuestion(`agendar_desde_pb_${bestMatch.key}`); // Pregunta de agendamiento para nutricionista
                    setLastSpecialtyMentioned(bestMatch.key); // Guarda "nutricionista" como la especialidad relevante
                } else if (!nuevoContexto) {
                    respuestaBot += " " + (bestMatch.entry.specific_prompt || "¿Necesitas más información sobre bienestar o quieres **agendar una consulta** con un especialista?");
                    setLastBotQuestion("pregunta_general_ayuda");
                    nuevoContexto = "prevencion_bienestar";
                    setLastSpecialtyMentioned(null);
                }
            } else {
                respuestaBot = "Ok, sobre **Prevención, bienestar y salud mental**. ¿Te interesa 'nutrición', 'salud mental', 'chequeos preventivos' o 'vacunas'? O puedes escribir 'menú'.";
                nuevoContexto = "prevencion_bienestar";
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }

        if (!handled && contextoConversacion === "informacion_administrativa") {
            const matches = getMatchingIntents(textoNormalizado, respuestasData.informacion_administrativa);
            if (matches.length > 0) {
                const bestMatch = matches[0];
                respuestaBot = bestMatch.entry.respuestas[Math.floor(Math.random() * bestMatch.entry.respuestas.length)];
                nuevoContexto = bestMatch.entry.next_context;

                if (!nuevoContexto) {
                    respuestaBot += " " + (bestMatch.entry.specific_prompt || "¿Hay algo más administrativo que quieras saber, o te gustaría volver al menú principal?");
                    setLastBotQuestion("pregunta_general_ayuda");
                    nuevoContexto = "informacion_administrativa";
                    setLastSpecialtyMentioned(null);
                }
            } else {
                respuestaBot = "Sigo en **Información administrativa**. ¿Qué trámite o documento necesitas? ¿'Documentos para ser paciente nuevo', 'seguros médicos', 'historial médico' o 'formas de pago'? O escribe 'menú'.";
                nuevoContexto = "informacion_administrativa";
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }

        if (!handled && contextoConversacion === "seguro_especifico") {
            if (textoNormalizado.length > 3 && !noKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                respuestaBot = `Entendido, con tu aseguradora de ${textoNormalizado}. Por favor, te sugerimos que para confirmar la cobertura exacta, contactes directamente a tu aseguradora o nos llames al **2234-5678** para que uno de nuestros agentes te asista.`;
                respuestaBot += "¿Hay algo más sobre seguros o volvemos al menú?";
                nuevoContexto = null;
                setLastBotQuestion("pregunta_general_ayuda");
                setLastSpecialtyMentioned(null);
            } else if (noKeywords.some(keyword => textoNormalizado.includes(keyword))) {
                respuestaBot = "De acuerdo, no hay problema. ¿Hay algo más en lo que pueda ayudarte o quieres volver al menú?";
                nuevoContexto = null;
                setLastBotQuestion("pregunta_general_ayuda");
                setLastSpecialtyMentioned(null);
            }
            else {
                respuestaBot = "Por favor, dime el nombre de tu aseguradora para intentar ayudarte. Si ya no quieres saber sobre seguros, puedes escribir 'menú'.";
                nuevoContexto = "seguro_especifico";
                setLastBotQuestion(null);
                setLastSpecialtyMentioned(null);
            }
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(nuevoContexto);
            handled = true;
            return;
        }

        // --- Si no se manejó por ningún caso específico, usar la respuesta por defecto ---
        if (!handled) {
            agregarMensaje("bot", respuestaBot);
            setContextoConversacion(null);
            setLastBotQuestion(null);
            setLastSpecialtyMentioned(null);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-box" ref={chatBoxRef}>
                {historial.map((msg, idx) => (
                    <div key={idx} className={`mensaje ${msg.emisor}`}>
                        <ReactMarkdown>{msg.mensaje}</ReactMarkdown>
                    </div>
                ))}
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && manejarEnvio()}
                />
                <button onClick={manejarEnvio}>Enviar</button>
            </div>
        </div>
    );
};

export default Chatbot;