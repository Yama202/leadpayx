import json
import hashlib
import sys
from pathlib import Path
from collections import defaultdict

# Raiz do repositório (…/leadpay) — executar: python3 supabase/migrations/export-obsidian-vault.py
REPO_ROOT = Path(__file__).resolve().parents[2]
graph_path = REPO_ROOT / "graphify-out" / "graph.json"
out = REPO_ROOT / "graphify-out" / "obsidian-vault"

if not graph_path.exists():
    print(
        "ERRO: graphify-out/graph.json nao encontrado na raiz do repo.\n"
        "  Gere o grafo (ex.: graphify update .) a partir de: "
        f"{REPO_ROOT}",
        file=sys.stderr,
    )
    raise SystemExit(1)

nodes_dir = out / "nodes"
communities_dir = out / "communities"
modules_dir = out / "modules"

nodes_dir.mkdir(parents=True, exist_ok=True)
communities_dir.mkdir(parents=True, exist_ok=True)
modules_dir.mkdir(parents=True, exist_ok=True)

data = json.loads(graph_path.read_text(encoding="utf-8"))

nodes_raw = data.get("nodes", [])
edges_raw = data.get("edges", data.get("links", []))


def safe_name(value):
    value = str(value or "unknown")
    cleaned = []
    for ch in value:
        if ch.isalnum() or ch in [" ", "-", "_", ".", "(", ")"]:
            cleaned.append(ch)
        else:
            cleaned.append("-")
    text = "".join(cleaned).strip()
    while "  " in text:
        text = text.replace("  ", " ")
    text = text.replace(" ", "-")
    while "--" in text:
        text = text.replace("--", "-")
    return text[:90] or "unknown"


def short_hash(value):
    return hashlib.md5(str(value).encode("utf-8")).hexdigest()[:6]


def node_id(raw, index):
    return str(
        raw.get("id")
        or raw.get("key")
        or raw.get("name")
        or raw.get("label")
        or raw.get("path")
        or f"node-{index}"
    )


def node_label(raw, fallback):
    return str(
        raw.get("label")
        or raw.get("name")
        or raw.get("title")
        or raw.get("path")
        or fallback
    )


nodes = {}

for i, raw in enumerate(nodes_raw):
    if not isinstance(raw, dict):
        continue

    nid = node_id(raw, i)
    label = node_label(raw, nid)

    community = (
        raw.get("community")
        or raw.get("group")
        or raw.get("cluster")
        or raw.get("modularity_class")
        or raw.get("community_id")
        or "unknown"
    )

    file_path = (
        raw.get("file")
        or raw.get("path")
        or raw.get("source_file")
        or raw.get("source")
        or raw.get("filepath")
        or ""
    )

    kind = (
        raw.get("type")
        or raw.get("kind")
        or raw.get("category")
        or raw.get("file_type")
        or ""
    )

    note = f"{safe_name(label)}-{short_hash(nid)}"

    nodes[nid] = {
        "id": nid,
        "label": label,
        "community": str(community),
        "file": str(file_path),
        "kind": str(kind),
        "note": note
    }

links = defaultdict(list)

for edge in edges_raw:
    if not isinstance(edge, dict):
        continue

    source = edge.get("source") or edge.get("from") or edge.get("src")
    target = edge.get("target") or edge.get("to") or edge.get("dst")
    relation = edge.get("relation") or edge.get("label") or edge.get("type") or "relates"

    if source is None or target is None:
        continue

    source = str(source)
    target = str(target)
    relation = str(relation)

    if source in nodes and target in nodes:
        links[source].append((target, relation))
        links[target].append((source, relation))

by_community = defaultdict(list)

for item in nodes.values():
    by_community[item["community"]].append(item)

index_lines = [
    "# LeadPayX - Obsidian Graph",
    "",
    f"Vault gerado a partir de `graphify-out/graph.json` (pasta do repo: `{REPO_ROOT.name}`).",
    "",
    "Regenerar: `python3 supabase/migrations/export-obsidian-vault.py`",
    "",
    "## Comece por aqui",
    "",
    "- [[Project Architecture]]",
    "- [[Communities Index]]",
    "- [[Critical Nodes]]",
    "- [[Modules Index]]",
    "",
    "## Comunidades",
    ""
]

for community in sorted(by_community.keys(), key=lambda x: str(x)):
    index_lines.append(f"- [[Community {community}]] - {len(by_community[community])} nos")

(out / "index.md").write_text("\n".join(index_lines), encoding="utf-8")

comm_lines = ["# Communities Index", ""]
for community in sorted(by_community.keys(), key=lambda x: str(x)):
    comm_lines.append(f"- [[Community {community}]] - {len(by_community[community])} nos")
(out / "Communities Index.md").write_text("\n".join(comm_lines), encoding="utf-8")

critical_names = [
    "requireRole",
    "createClient",
    "createAdminClient",
    "formDataToObject",
    "RoleBasedLayout",
    "operatorCanProgressAccount",
    "isTerminalAccountStatus",
    "Button",
    "buildRegisterHref",
    "validationError",
    "getWhatsappGroupUrl",
    "OperatorWorkPanel",
    "SubmitButton",
    "completeAccountAction",
    "rejectAccount",
    "operator-balance-destinations",
    "registerCaptadorPush",
]

critical_lines = ["# Critical Nodes", ""]
for item in sorted(nodes.values(), key=lambda x: x["label"].lower()):
    if any(name in item["label"] for name in critical_names):
        critical_lines.append(f"- [[{item['note']}|{item['label']}]]")
(out / "Critical Nodes.md").write_text("\n".join(critical_lines), encoding="utf-8")

modules = {
    "auth": ["requireRole", "login", "register", "logout", "auth", "profile"],
    "supabase": ["createClient", "createAdminClient", "supabase"],
    "captador": ["captador", "push", "ReferralBox", "notif"],
    "operador": [
        "operador",
        "operator",
        "OperatorWorkPanel",
        "OperatorPick",
        "pickNextBatch",
        "startAccount",
        "completeAccount",
        "rejectAccount",
        "balance",
        "operator-balance",
    ],
    "admin": ["admin"],
    "payouts": ["payout", "commission", "comissao", "comissão"],
    "ofertas": ["offer", "oferta", "promotion"],
    "ui-layout": [
        "RoleBasedLayout",
        "Button",
        "SubmitButton",
        "Spinner",
        "Sidebar",
        "Theme",
        "Layout",
        "loading",
    ],
}

modules_index = ["# Modules Index", ""]
for module in modules:
    modules_index.append(f"- [[Module {module}]]")
(out / "Modules Index.md").write_text("\n".join(modules_index), encoding="utf-8")

for module, keywords in modules.items():
    lines = [f"# Module {module}", "", "## Nos relacionados", ""]
    found = []

    for item in nodes.values():
        search_text = f"{item['label']} {item['file']} {item['kind']}".lower()
        if any(keyword.lower() in search_text for keyword in keywords):
            found.append(item)

    for item in sorted(found, key=lambda x: x["label"].lower()):
        lines.append(f"- [[{item['note']}|{item['label']}]]")

    if not found:
        lines.append("- Nenhum no encontrado automaticamente.")

    (modules_dir / f"Module {module}.md").write_text("\n".join(lines), encoding="utf-8")

architecture_lines = [
    "# Project Architecture",
    "",
    "## Visao geral",
    "",
    "Este vault transforma o grafo do Graphify em notas Markdown para o Obsidian.",
    "",
    "## Regenerar",
    "",
    "- Na raiz do repo: `python3 supabase/migrations/export-obsidian-vault.py`",
    "- Requer `graphify-out/graph.json` (ex.: `graphify update .`).",
    "",
    "## O que navegar",
    "",
    "- [[Communities Index]]",
    "- [[Critical Nodes]]",
    "- [[Modules Index]]",
    "",
    "## Arquivos externos importantes",
    "",
    "- graphify-out/GRAPH_REPORT.md",
    "- graphify-out/graph.json",
    "- docs/wiki/index.md",
    "- docs/wiki/arquitetura.md",
    "- docs/wiki/funcoes-criticas.md",
    "- docs/wiki/roles-e-permissoes.md",
    "",
    "## Como usar",
    "",
    "Abra o Graph View do Obsidian para visualizar as conexoes entre comunidades, modulos e funcoes."
]
(out / "Project Architecture.md").write_text("\n".join(architecture_lines), encoding="utf-8")

for community, items in by_community.items():
    lines = [
        f"# Community {community}",
        "",
        f"Total de nos: {len(items)}",
        "",
        "## Nos",
        ""
    ]

    for item in sorted(items, key=lambda x: x["label"].lower()):
        lines.append(f"- [[{item['note']}|{item['label']}]]")

    (communities_dir / f"Community {safe_name(community)}.md").write_text("\n".join(lines), encoding="utf-8")

for nid, item in nodes.items():
    lines = [
        f"# {item['label']}",
        "",
        f"**Community:** [[Community {item['community']}]]",
        ""
    ]

    if item["kind"]:
        lines.append(f"**Tipo:** `{item['kind']}`")
        lines.append("")

    if item["file"]:
        lines.append(f"**Arquivo:** `{item['file']}`")
        lines.append("")

    related = links.get(nid, [])

    if related:
        lines.append("## Relacoes")
        lines.append("")

        for target, relation in related[:120]:
            target_item = nodes.get(str(target))
            if target_item:
                lines.append(f"- `{relation}` -> [[{target_item['note']}|{target_item['label']}]]")
            else:
                lines.append(f"- `{relation}` -> `{target}`")

        lines.append("")

    lines.append("## Uso")
    lines.append("")
    lines.append("Use esta nota para navegar visualmente pelo grafo do projeto no Obsidian.")
    lines.append("")

    (nodes_dir / f"{item['note']}.md").write_text("\n".join(lines), encoding="utf-8")

print(f"Vault Obsidian criado em: {out.resolve()}")
print(f"Nos criados: {len(nodes)}")
print(f"Comunidades criadas: {len(by_community)}")