# Tag `v0.1.0`

Estado: **creado** el 2026-10-10 sobre `392de12adf34c1df890a95c7491fb31c1c8bce45`.

El mensaje anotado está en [tag-message.txt](tag-message.txt). Las notas están en [NOTAS.es.md](NOTAS.es.md) y [NOTAS.en.md](NOTAS.en.md).

## Comprobarlo

En un clon al día:

```bash
git fetch origin tag v0.1.0
git rev-parse 'v0.1.0^{}'
```

El commit pelado es `392de12adf34c1df890a95c7491fb31c1c8bce45`.

## Cómo se creó

Sobre el commit de `main` que ya contenía estas notas. `SHA` es ese commit.

```bash
git fetch origin main
git rev-parse origin/main
git tag -a v0.1.0 SHA -F docs/releases/v0.1.0/tag-message.txt
git show v0.1.0 --no-patch
```

Subirlo fue otro paso, también con autorización:

```bash
git push origin v0.1.0
```

No hay un workflow que cree este tag. El script [scripts/prepare-v0.1.0-tag.mjs](../../../scripts/prepare-v0.1.0-tag.mjs) sigue negándose a crear otro, también si se le pasa `--create`. El tag que ya existe no se vuelve a crear desde el repositorio.

Nota (16-10-2026): este archivo usa ya el nombre ORVUPI. El tag `v0.1.0` publicado en GitHub conserva el mensaje original, con el nombre anterior del proyecto.
