# Modelos 3D — VetCare

Os GLBs otimizados desta pasta são carregados pelo hero da landing page
(`src/components/marketing/hero3d/`). Espécie sem arquivo publicado é
ignorada automaticamente (HEAD check) — basta adicionar o `.glb` e fazer
deploy para ativar.

## Arquivos esperados

| Arquivo | Espécie no hero | Status |
|---|---|---|
| `horse.glb` (2,6 MB) | Grande Porte | ✅ ativo |
| `parrot.glb` (72 KB) | Exótico | ✅ ativo |
| `german-shepherd.glb` (756 KB) | Cão | ✅ ativo |
| `cat.glb` (3,2 MB) | Gato | ✅ ativo |
| `rabbit.glb` (76 KB) | reservado — futura seção CTA | 📦 otimizado, não usado ainda |

> **No Sketchfab, baixe sempre no formato "glTF"** (não "original"/FBX/blend).
> O zip baixado contém `scene.gltf` + texturas + `.bin`.

## Pipeline de otimização

Coloque o download em `src/<nome>/` e rode (da raiz `apps/web`):

```bash
# entrada .glb direto:
npx @gltf-transform/cli optimize public/models/src/<pasta>/model.glb public/models/<nome>.glb --compress draco --texture-compress webp --texture-size 1024

# entrada .gltf (zip do Sketchfab descompactado):
npx @gltf-transform/cli optimize public/models/src/<pasta>/scene.gltf public/models/<nome>.glb --compress draco --texture-compress webp --texture-size 1024
```

Meta: **≤ 2,5 MB por animal**. Se passar disso, acrescente `--simplify-error 0.001`
ou reduza `--texture-size` para `512`.

A pasta `src/` (downloads brutos) está no `.gitignore` — só os `.glb`
otimizados são commitados.

## Licenças

Ver `CREDITS.md` na raiz do repositório — modelos CC BY exigem atribuição,
que é exibida no rodapé da landing page.
