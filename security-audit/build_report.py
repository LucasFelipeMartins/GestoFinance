# -*- coding: utf-8 -*-
"""Gera findings.json, findings.sarif, 04-findings.md, 05-positive-controls.md
e security-audit-report.html a partir de findings_data.py e dos Markdown
narrativos. Sem dependências além da biblioteca padrão."""
import json, re, html, os, datetime
from findings_data import FINDINGS, POSITIVE_CONTROLS, META

HERE = os.path.dirname(os.path.abspath(__file__))

def p(name):
    return os.path.join(HERE, name)

# ---------------------------------------------------------------- findings.json
json_findings = []
for f in FINDINGS:
    json_findings.append({
        "id": f["id"], "title": f["title"], "status": f["status"], "confidence": f["confidence"],
        "severity": f["severity"], "cvss_v4": f["cvss"], "cwe": f["cwe"], "owasp_top10_2025": f["owasp"],
        "owasp_api_2023": f["api"], "asvs": f["asvs"], "location": f["location"], "cisa_kev": f["kev"],
        "didactic_explanation": f["what"], "expected_control": f["expected"], "observed_behaviour": f["observed"],
        "why_this_is_a_security_issue": f["why"], "causal_chain": f["causal_chain"], "abuse_scenario": f["abuse"],
        "demonstrated_impact": f["demonstrated"], "potential_impact": f["potential"],
        "severity_rationale": f["severity_rationale"], "conditions_to_raise_or_lower_severity": f["raise_lower"],
        "technical_evidence": f["evidence"], "remediation": f["remediation"], "regression_tests": f["regression"],
        "residual_risk": f["residual"], "owner": f["owner"], "deadline": f["deadline"], "effort": f["effort"],
    })
with open(p("findings.json"), "w", encoding="utf-8") as fh:
    json.dump({"meta": META, "generated": datetime.date.today().isoformat(), "findings": json_findings,
               "positive_controls": [{"id": c[0], "title": c[1], "evidence": c[2], "reach": c[3]} for c in POSITIVE_CONTROLS]},
              fh, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- findings.sarif
SEV_LEVEL = {"ALTA": "error", "MÉDIA": "warning", "BAIXA": "note", "INFORMATIVA": "note"}
def first_location(loc):
    m = re.search(r"([A-Za-z0-9_./-]+\.(?:ts|tsx|json|html))(?::(\d+))?", loc)
    if not m:
        return None
    return m.group(1), int(m.group(2)) if m.group(2) else 1
rules, results = [], []
for f in FINDINGS:
    sev = f["severity"].split(" ")[0]
    rules.append({"id": f["id"], "name": f["id"].replace("-", ""), "shortDescription": {"text": f["title"]},
                  "fullDescription": {"text": f["why"]}, "help": {"text": f["remediation"]},
                  "properties": {"severity": f["severity"], "status": f["status"], "cwe": f["cwe"], "cvss": f["cvss"]}})
    loc = first_location(f["location"])
    res = {"ruleId": f["id"], "level": SEV_LEVEL.get(sev, "note"), "message": {"text": f["what"]}}
    if loc:
        res["locations"] = [{"physicalLocation": {"artifactLocation": {"uri": loc[0]}, "region": {"startLine": loc[1]}}}]
    results.append(res)
sarif = {"version": "2.1.0", "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
         "runs": [{"tool": {"driver": {"name": "Auditoria manual GestorFinance", "version": "1.0", "rules": rules}}, "results": results}]}
with open(p("findings.sarif"), "w", encoding="utf-8") as fh:
    json.dump(sarif, fh, ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- 04-findings.md
def finding_md(f):
    L = []
    L.append(f"## {f['id']} — {f['title']}\n")
    L.append(f"- **Status:** {f['status']} · **Confiança:** {f['confidence']} · **Severidade:** {f['severity']}")
    L.append(f"- **CVSS v4.0:** {f['cvss']['score']} — `{f['cvss']['vector']}`")
    L.append(f"- **CWE:** {'; '.join(f['cwe'])} · **OWASP Top 10:2025:** {f['owasp']} · **API Top 10:2023:** {f['api']} · **ASVS:** {f['asvs']}")
    L.append(f"- **CISA KEV / EPSS:** {f['kev']}")
    L.append(f"- **Onde está:** {f['location']}")
    L.append(f"- **Owner / prazo / esforço:** {f['owner']} · {f['deadline']} · {f['effort']}\n")
    L.append("### Camada 1 — Entenda a brecha\n")
    for k, t in [("what", "O que encontramos"), ("expected", "Como deveria funcionar"), ("observed", "O que está acontecendo"),
                 ("why", "Por que isso é uma brecha"), ("causal_chain", "Sequência causal"), ("abuse", "Como alguém poderia abusar"),
                 ("demonstrated", "O que foi demonstrado"), ("potential", "O que pode acontecer"),
                 ("severity_rationale", "Por que recebeu este nível"), ("raise_lower", "O que faria o nível subir ou descer"),
                 ("remediation", "Como corrigir"), ("regression", "Como confirmar a correção")]:
        L.append(f"**{t}.** {f[k]}\n")
    L.append("### Camada 2 — Detalhes técnicos\n")
    L.append(f"**Evidência (redigida):** {f['evidence']}\n")
    L.append(f"**Risco residual:** {f['residual']}\n")
    return "\n".join(L)

with open(p("04-findings.md"), "w", encoding="utf-8") as fh:
    fh.write("# 04 — Achados\n\nOrdenados por severidade. Cada achado tem duas camadas: explicação didática e detalhes técnicos. Evidências brutas em `audit-evidence.txt` (T01–T15).\n\n")
    fh.write("\n---\n\n".join(finding_md(f) for f in FINDINGS))

# ---------------------------------------------------------------- 05-positive-controls.md
with open(p("05-positive-controls.md"), "w", encoding="utf-8") as fh:
    fh.write("# 05 — Controles positivos comprovados\n\nSomente controles com evidência de teste ou de código. \"Não encontrei\" não foi tratado como aprovação.\n\n| ID | Controle | Evidência | Alcance |\n|---|---|---|---|\n")
    for c in POSITIVE_CONTROLS:
        fh.write(f"| {c[0]} | {c[1]} | {c[2]} | {c[3]} |\n")

# ---------------------------------------------------------------- Markdown → HTML (subconjunto)
def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    s = s.replace("\\*", "*")
    return s

def md_to_html(text):
    out, lines, i = [], text.splitlines(), 0
    para = []
    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            flush(); j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith("```"):
                buf.append(lines[j]); j += 1
            out.append("<pre>" + html.escape("\n".join(buf)) + "</pre>"); i = j + 1; continue
        m = re.match(r"^(#{1,4})\s+(.*)", ln)
        if m:
            flush(); lvl = len(m.group(1)); out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
        if ln.startswith("|"):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i]); i += 1
            cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
            body = [r for r in cells if not all(re.fullmatch(r":?-+:?", c or "-") for c in r)]
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in body[0]) + "</tr></thead><tbody>" +
                       "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body[1:]) + "</tbody></table>")
            continue
        m = re.match(r"^\s*[-*]\s+(.*)", ln)
        if m:
            flush(); items = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append(re.sub(r"^\s*[-*]\s+", "", lines[i])); i += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>"); continue
        m = re.match(r"^\s*\d+\.\s+(.*)", ln)
        if m:
            flush(); items = []
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+\.\s+", "", lines[i])); i += 1
            out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>"); continue
        if ln.strip() == "---":
            flush(); out.append("<hr>"); i += 1; continue
        if not ln.strip():
            flush(); i += 1; continue
        para.append(ln.strip()); i += 1
    flush()
    return "\n".join(out)

def read(name):
    with open(p(name), encoding="utf-8") as fh:
        return fh.read()

sections = [
    ("Sumário executivo", read("00-executive-summary.md")),
    ("Escopo e metodologia", read("01-scope-methodology.md")),
    ("Arquitetura e superfície de ataque", read("02-architecture-attack-surface.md")),
    ("Achados", read("04-findings.md")),
    ("Controles positivos", read("05-positive-controls.md")),
    ("Roteiro de correção", read("06-remediation-roadmap.md")),
    ("Limitações e não testado", read("07-limitations-not-tested.md")),
]

# Matriz de cobertura como tabela
import csv
with open(p("03-coverage-matrix.csv"), encoding="utf-8", newline="") as fh:
    rows = list(csv.reader(fh))
cov_html = "<h1>Apêndice A — Matriz de cobertura</h1><table class='cov'><thead><tr>" + "".join(f"<th>{html.escape(h)}</th>" for h in rows[0][:12]) + "</tr></thead><tbody>"
for r in rows[1:]:
    cov_html += "<tr>" + "".join(f"<td>{html.escape(c)}</td>" for c in r[:12]) + "</tr>"
cov_html += "</tbody></table>"

glossary = """<h1>Apêndice B — Glossário</h1>
<dl>
<dt>BOLA / IDOR</dt><dd>O servidor recebe o identificador de um objeto mas não confirma que ele pertence a quem pediu.</dd>
<dt>CSRF</dt><dd>Um site externo faz o navegador da vítima enviar uma requisição usando a sessão dela.</dd>
<dt>Mass assignment</dt><dd>O cliente consegue gravar campos que só o servidor deveria definir.</dd>
<dt>ReDoS</dt><dd>Expressão regular construída para consumir tempo exponencial e travar o processamento.</dd>
<dt>Rate limiting</dt><dd>Limite de quantas vezes uma ação pode ser repetida em uma janela de tempo.</dd>
<dt>JWT</dt><dd>Token assinado que carrega a identidade do usuário; o servidor confia na assinatura em vez de consultar uma tabela de sessões.</dd>
<dt>Race condition / TOCTOU</dt><dd>Duas execuções simultâneas leem o mesmo estado antes que qualquer uma o altere, produzindo efeito duplicado.</dd>
<dt>CVSS v4.0</dt><dd>Escala técnica de 0 a 10 para gravidade; não substitui o contexto de negócio.</dd>
<dt>CONFIRMADO / PROVÁVEL / HIPÓTESE</dt><dd>Evidência reproduzível / evidência parcial com elo faltante explicado / sem evidência direta.</dd>
</dl>
<h1>Apêndice C — Referências</h1>
<ul>
<li>OWASP ASVS 5.0 — https://owasp.org/www-project-application-security-verification-standard/</li>
<li>OWASP Top 10:2025 — https://owasp.org/Top10/2025/</li>
<li>OWASP API Security Top 10:2023 — https://owasp.org/API-Security/editions/2023/en/0x11-t10/</li>
<li>NIST SP 800-63B-4 — https://csrc.nist.gov/pubs/sp/800/63/b/4/final</li>
<li>RFC 8725 JWT BCP — https://www.rfc-editor.org/info/rfc8725/</li>
<li>FIRST CVSS v4.0 — https://www.first.org/cvss/v4.0/specification-document</li>
<li>Avisos GitHub citados: GHSA-rgj7-g3m4-5g8c (sharp), GHSA-wc9g-mqfw-jrwm / GHSA-qfvm-cv95-jqjf / GHSA-535w-7cp7-47q4 (multer)</li>
</ul>
<h1>Apêndice D — Evidência bruta dos testes locais</h1>
<pre>%s</pre>
""" % html.escape(read("audit-evidence.txt"))

toc = "".join(f"<li><a href='#s{i}'>{html.escape(t)}</a></li>" for i, (t, _) in enumerate(sections)) + \
      "<li><a href='#apA'>Apêndice A — Matriz de cobertura</a></li><li><a href='#apB'>Apêndices B–D</a></li>"

body = "".join(f"<section id='s{i}'>{md_to_html(m)}</section>" for i, (t, m) in enumerate(sections))

CSS = """
body{font-family:Inter,'Segoe UI',Arial,sans-serif;color:#182014;margin:0;padding:32px;max-width:960px;margin:0 auto;font-size:12.5px;line-height:1.55;background:#fff}
h1{font-size:22px;border-bottom:2px solid #243119;padding-bottom:6px;margin:34px 0 14px;color:#243119;page-break-before:always}
section:first-of-type h1, .cover h1{page-break-before:auto}
h2{font-size:16px;margin:26px 0 8px;color:#243119;page-break-after:avoid}
h3{font-size:13.5px;margin:16px 0 6px;color:#31441F}
p{margin:6px 0}
table{border-collapse:collapse;width:100%;margin:8px 0 14px;font-size:11px;page-break-inside:auto}
th,td{border:1px solid #cfd8cb;padding:5px 6px;vertical-align:top;text-align:left;word-break:break-word}
th{background:#e4f5e2}
tr{page-break-inside:avoid}
code{background:#eef3ec;padding:1px 4px;border-radius:4px;font-size:11px;word-break:break-all}
pre{background:#f3f6f1;border:1px solid #dde7d9;padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:10.5px}
.cover{text-align:center;padding:120px 0 60px}
.cover .badge{display:inline-block;background:#243119;color:#c9f2c7;padding:6px 14px;border-radius:999px;font-weight:600}
.cover h1{border:0;font-size:30px}
.toc ul{columns:2;list-style:none;padding:0}
.toc li{margin:4px 0}
.cov{font-size:9.5px}
dt{font-weight:700;margin-top:8px}
@page{size:A4;margin:18mm 14mm 20mm 14mm}
"""

doc = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Auditoria de segurança — GestorFinance</title><style>{CSS}</style></head>
<body>
<div class="cover"><span class="badge">CONFIDENCIAL</span><h1>Auditoria defensiva de segurança<br>GestorFinance</h1>
<p><strong>Data:</strong> {META['date']} · <strong>Commit:</strong> <code>{META['commit'][:12]}</code> ({META['branch']})<br><strong>Modo:</strong> {html.escape(META['authorization_mode'])}<br><strong>Runtime:</strong> {META['runtime']}</p>
<p>{html.escape(META['worktree'])}</p></div>
<div class="toc"><h1 style="page-break-before:always">Sumário</h1><ul>{toc}</ul></div>
{body}
<section id="apA">{cov_html}</section>
<section id="apB">{glossary}</section>
</body></html>"""
with open(p("security-audit-report.html"), "w", encoding="utf-8") as fh:
    fh.write(doc)
print("ok: findings.json, findings.sarif, 04-findings.md, 05-positive-controls.md, security-audit-report.html")
