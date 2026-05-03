# Project Architecture

## Visao geral

Este vault transforma o grafo do Graphify em notas Markdown para o Obsidian.

## Regenerar

- Na raiz do repo: `python3 supabase/migrations/export-obsidian-vault.py`
- Requer `graphify-out/graph.json` (ex.: `graphify update .`).

## O que navegar

- [[Communities Index]]
- [[Critical Nodes]]
- [[Modules Index]]

## Arquivos externos importantes

- graphify-out/GRAPH_REPORT.md
- graphify-out/graph.json
- docs/wiki/index.md
- docs/wiki/arquitetura.md
- docs/wiki/funcoes-criticas.md
- docs/wiki/roles-e-permissoes.md

## Como usar

Abra o Graph View do Obsidian para visualizar as conexoes entre comunidades, modulos e funcoes.