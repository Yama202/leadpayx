# 📚 Wiki LeadPayX

Documentação humana do sistema — fluxos, regras de negócio, funções críticas e features.

> Este espaço não é gerado automaticamente. Pode ser editado livremente.
> Para o grafo de código auto-gerado, volte ao [[index|Início]].

---

## Navegação

| Nota | O que tem |
|------|-----------|
| [[Sistema]] | Visão geral, papéis, ciclo de conta, segurança, rotas |
| [[Fluxos]] | Passo-a-passo de cada fluxo ligado ao grafo de código |
| [[Funcoes Criticas]] | Os hubs do grafo — funções com mais dependências |
| [[Banco de Dados]] | Tabelas, campos importantes, RPCs e audit_logs |
| [[Features Recentes]] | Features novas: timeline, push admin, comissão por oferta, empréstimos |

---

## Atualizar o grafo de código

```bash
# Na raiz do repo:
graphify update .
python3 supabase/migrations/export-obsidian-vault.py
```
