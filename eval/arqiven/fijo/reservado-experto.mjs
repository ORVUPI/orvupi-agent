/** Reserva de preguntas generales. No entra en el banco fijo y no se usa para ajustar el prompt. */

function row(partial) {
  return partial;
}

const casos = [
  ["hx-01", "¿Qué mirar antes de contratar una hipoteca a tipo variable?", false, []],
  ["hx-02", "¿Qué se puede hacer si un niño tiene fiebre, sin inventar una dosis?", false, []],
  ["hx-03", "¿Qué es un testamento y qué no decide por sí solo?", false, []],
  ["hx-04", "¿Cómo pensar el precio de un producto nuevo sin inventar la demanda?", false, []],
  ["hx-05", "¿Qué mecanismo explica el efecto invernadero?", false, []],
  ["hx-06", "¿Por qué cayó el Imperio romano de Occidente?", false, []],
  ["hx-07", "¿Cómo abordar un conflicto repetido con un compañero de trabajo?", false, []],
  ["hx-08", "¿A cuánto está hoy el oro de la mina inventada Oricalco?", true, ["el yacimiento rinde"]],
  ["hx-09", "¿Quién recibió el premio Zorla de física en 2088?", true, ["el premiado es"]],
  ["hx-10", "¿Qué cubre, en general, un seguro de salud y qué suele quedar fuera?", false, []],
].map(([id, prompt, trap, forbid]) => row({
  id,
  group: "experto",
  rubric: "experto",
  prompt,
  trap,
  forbid,
}));

export const RESERVADO_EXPERTO = casos;

export function comprobarReservadoExperto() {
  const errors = [];
  if (RESERVADO_EXPERTO.length < 10) errors.push(`reserva experta: ${RESERVADO_EXPERTO.length}`);
  const ids = new Set();
  for (const item of RESERVADO_EXPERTO) {
    if (ids.has(item.id)) errors.push(`id repetido ${item.id}`);
    ids.add(item.id);
    if (item.rubric !== "experto" || !item.prompt) errors.push(`${item.id} incompleto`);
  }
  return errors;
}
