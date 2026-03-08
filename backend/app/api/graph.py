from fastapi import APIRouter, HTTPException
from ..graph_store import get_graph

router = APIRouter()

# Color mapping for common relationship types
EDGE_COLORS = {
    "ally": "#22c55e",
    "friend": "#22c55e",
    "allies": "#22c55e",
    "friends": "#22c55e",
    "protects": "#22c55e",
    "helps": "#22c55e",
    "supports": "#22c55e",
    "trusts": "#22c55e",
    "enemy": "#ef4444",
    "enemies": "#ef4444",
    "rival": "#ef4444",
    "rivals": "#ef4444",
    "betrayed": "#ef4444",
    "betrays": "#ef4444",
    "fights": "#ef4444",
    "opposes": "#ef4444",
    "hates": "#ef4444",
    "family": "#3b82f6",
    "sibling": "#3b82f6",
    "parent": "#3b82f6",
    "child": "#3b82f6",
    "mother": "#3b82f6",
    "father": "#3b82f6",
    "sister": "#3b82f6",
    "brother": "#3b82f6",
    "loves": "#ec4899",
    "lover": "#ec4899",
    "romance": "#ec4899",
    "romantic": "#ec4899",
    "married": "#ec4899",
    "mentor": "#a855f7",
    "mentors": "#a855f7",
    "teaches": "#a855f7",
    "student": "#a855f7",
    "serves": "#f59e0b",
    "servant": "#f59e0b",
    "master": "#f59e0b",
    "employs": "#f59e0b",
    "commands": "#f59e0b",
}

DEFAULT_EDGE_COLOR = "#6b7280"


def _color_for_relationship(rel: str) -> str:
    """Get a color for a relationship type, falling back to gray."""
    return EDGE_COLORS.get(rel.lower().strip(), DEFAULT_EDGE_COLOR)


@router.get("/{document_id}")
def get_document_graph(document_id: str):
    """
    Returns the character relationship graph for a given document.
    Response: {nodes: [{id, label}], edges: [{source, target, label, color}]}
    """
    try:
        graph = get_graph(document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query Neo4j: {str(e)}")

    # Add colors to edges
    for edge in graph["edges"]:
        edge["color"] = _color_for_relationship(edge["label"])

    if not graph["nodes"]:
        return {"nodes": [], "edges": [], "message": "No character relationships found for this document."}

    return graph
