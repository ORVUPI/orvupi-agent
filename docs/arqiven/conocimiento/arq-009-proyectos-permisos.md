# Proyectos y permisos

- id: arq-009
- fecha: 2026-11-15
- estado: revisado: pendiente del propietario
- origen: local/arqiven/projects.mjs; docs/arqiven/plan-fases.md; docs/arqiven/registro-cambios.md

## Fragmento: qué es un proyecto

En el modo local, los proyectos viven en el mismo `history.json` que los chats (versión 2). Un archivo de la versión 1 se lee y no pierde mensajes. No hay cuenta de orvupi.com. El usuario es de este equipo: cabecera `x-arqiven-user` o variable `ARQIVEN_USER`; si no viene, `local`.

Origen: `docs/arqiven/plan-fases.md` y `local/arqiven/config.mjs`.

## Fragmento: roles

El código usa `owner`, `editor` y `reader`. La tabla en español del plan habla de dueño, editor y lector.

| Acción | dueño (`owner`) | editor | lector (`reader`) |
| --- | --- | --- | --- |
| Ver chats del proyecto | sí | sí | sí |
| Escribir en un chat del proyecto | sí | sí | no |
| Renombrar y mover | sí | sí | no |
| Borrar el proyecto | sí | no | no |
| Cambiar miembros | sí | no | no |

No puede quedar un proyecto sin ningún dueño: `setMember` lo rechaza.

Origen: `local/arqiven/projects.mjs` y `docs/arqiven/plan-fases.md`.

## Fragmento: un chat sin proyecto

Si el chat no tiene `projectId`, lo ve y lo escribe quien coincida con `ownerId`. Un lector de un proyecto no ve por eso los chats sueltos de otra persona.

Origen: `local/arqiven/projects.mjs`, funciones `canSeeChat` y `canWriteChat`.

## Fragmento: borrar un proyecto

Borrar quita el proyecto y sus miembros, y deja `projectId` vacío en los chats que estaban dentro. No borra los mensajes. Las carpetas anidadas no están hechas. El plan pide no implementar a la vez «devolver los chats» y «pedir confirmación para eliminarlos»; el código ya devuelve los chats al historial general.

Origen: `local/arqiven/projects.mjs` (`removeProject`) y `docs/arqiven/registro-cambios.md`.
