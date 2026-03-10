"""
Neo4j Graph Store — manages character relationship triplets.
Provides write, read, and delete operations for the Knowledge Graph feature.
"""
import os
import logging
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
logger = logging.getLogger(__name__)

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

_driver = None


def _get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    return _driver


def write_triplets(document_id: str, triplets: list[dict]):
    """
    Write relationship triplets to Neo4j.
    Each triplet: {"source": "Alice", "relationship": "betrayed", "target": "Bob"}
    Nodes are MERGED (deduplicated per document), edges are created fresh.
    """
    driver = _get_driver()

    def _create_triplets(tx):
        for t in triplets:
            source = t.get("source", "").strip()
            target = t.get("target", "").strip()
            relationship = t.get("relationship", "RELATED_TO").strip()
            if not source or not target:
                continue
            tx.run(
                """
                MERGE (a:Character {name: $source, document_id: $doc_id})
                MERGE (b:Character {name: $target, document_id: $doc_id})
                CREATE (a)-[:RELATES_TO {type: $rel, document_id: $doc_id}]->(b)
                """,
                source=source,
                target=target,
                rel=relationship,
                doc_id=document_id,
            )

    with driver.session() as session:
        session.execute_write(_create_triplets)

    logger.info(f"Wrote {len(triplets)} triplets to Neo4j for document {document_id}")


def get_graph(document_id: str) -> dict:
    """
    Retrieve all character nodes and relationship edges for a given document.
    Returns: {"nodes": [{"id": ..., "label": ...}], "edges": [{"source": ..., "target": ..., "label": ...}]}
    """
    driver = _get_driver()
    nodes = []
    edges = []
    seen_nodes = set()

    with driver.session() as session:
        result = session.run(
            """
            MATCH (a:Character {document_id: $doc_id})-[r:RELATES_TO {document_id: $doc_id}]->(b:Character {document_id: $doc_id})
            RETURN a.name AS source, r.type AS relationship, b.name AS target
            """,
            doc_id=document_id,
        )
        for record in result:
            src = record["source"]
            tgt = record["target"]
            rel = record["relationship"]

            if src not in seen_nodes:
                nodes.append({"id": src, "label": src})
                seen_nodes.add(src)
            if tgt not in seen_nodes:
                nodes.append({"id": tgt, "label": tgt})
                seen_nodes.add(tgt)

            edges.append({"source": src, "target": tgt, "label": rel})

    return {"nodes": nodes, "edges": edges}


def delete_graph(document_id: str):
    """
    Delete all character nodes and relationships for a given document.
    Used for cascading deletes when a document is removed.
    """
    driver = _get_driver()
    with driver.session() as session:
        session.run(
            """
            MATCH (c:Character {document_id: $doc_id})
            DETACH DELETE c
            """,
            doc_id=document_id,
        )
    logger.info(f"Deleted graph data for document {document_id}")

def get_triplets_for_characters(names: list[str]) -> list[str]:
    """
    Given a list of character names, search the Neo4j graph for any relationships
    involving those characters. Returns a list of formatted string triplets.
    """
    if not names:
        return []

    driver = _get_driver()
    triplets = []

    with driver.session() as session:
        # We UNWIND the names and perform case-insensitive substring matching
        # on both the source and target nodes to aggressively find relationships.
        result = session.run(
            """
            UNWIND $names AS name
            MATCH (a:Character)-[r:RELATES_TO]-(b:Character)
            WHERE toLower(a.name) CONTAINS toLower(name) OR toLower(b.name) CONTAINS toLower(name)
            RETURN DISTINCT a.name AS source, r.type AS rel, b.name AS target
            LIMIT 50
            """,
            names=names
        )
        for record in result:
            src = record["source"]
            rel = record["rel"]
            tgt = record["target"]
            # Format nicely for the LLM
            triplets.append(f"{src} -[{rel}]-> {tgt}")

    # Deduplicate in python just to be safe
    unique_triplets = list(set(triplets))
    logger.info(f"Retrieved {len(unique_triplets)} triplets for characters: {names}")
    return unique_triplets
