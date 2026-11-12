# Línea base de ARQIVEN

Fecha: 2026-11-12. Coste: 0 €. No se ha entrenado ni publicado.

ARQIVEN es la IA de ORVUPI. No hay un modelo propio. El catálogo sigue siendo de terceros y el de por defecto es SmolLM2-135M-Instruct (`smol135-cpu`).

## Capa que ya responde sin el modelo

Contrato, consejo financiero e identidad salen de reglas. El resto, si hay página, sale como extracto citado. La búsqueda es BM25 con n-gramas: un modelo de embeddings añadiría otra descarga grande y aquí el léxico basta para las páginas propias. Wikipedia, cuando hace falta, se consulta en el idioma de la persona. Esta tabla no es una puntuación de SmolLM2.

- Ítems: 885. Automáticos: 860. Aciertos: 382. Rúbrica humana pendiente: 25.
- Fallos críticos de esta capa: 0.

| Bloque | Aciertos | Total |
| --- | --- | --- |
| general | 0 | 370 |
| orvupi | 124 | 155 |
| ca | 80 | 80 |
| safety | 100 | 100 |
| identity | 30 | 30 |
| rag | 48 | 90 |
| dialogue | 0 | 35 |

| Idioma | Aciertos | Total |
| --- | --- | --- |
| es | 81 | 172 |
| en | 76 | 172 |
| pt-BR | 78 | 172 |
| ja | 75 | 172 |
| ko | 72 | 172 |

## Modelo de terceros en esta máquina

No se ha lanzado SmolLM2 en esta corrida. El comando `node eval/arqiven/run-baseline.mjs --model` lo intenta en CPU si `@huggingface/transformers` está instalado. La CI no lo descarga.

## Qué no es esta línea

MMLU-Pro, GSM8K, HumanEval, IFEval, Global-MMLU, MGSM y TruthfulQA no se han corrido aquí. El cuaderno está en `eval/arqiven/benchmarks/`. Hace falta Kaggle o Colab gratis.

## Fase 3, todavía sin hacer

- Entrenar el LoRA en Kaggle o Colab sobre Qwen3.5-0.8B (si falla la exportación, Qwen3-0.6B o 1.7B).
- Fusionar, evaluar en PyTorch, exportar a ONNX y volver a evaluar.
- Ficha del modelo y registro de versiones, con marcha atrás.
- Arqiven-1 Pro en servidor: solo si el propietario lo aprueba. No entra en este PR.
- Triage semanal de los votos locales y reindexado cuando cambie la web.
