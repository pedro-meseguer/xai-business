from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "templates"

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(enabled_extensions=()),  # texto plano
)

TEMPLATE_MAP = {
    "generic_v1": "report_generic_v1.jinja2",
}

def render_report_text(template_id: str, report_json: dict) -> str:
    filename = TEMPLATE_MAP.get(template_id)
    if not filename:
        raise ValueError(f"Unknown template_id: {template_id}")
    template = env.get_template(filename)
    return template.render(**report_json)
