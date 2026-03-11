import asyncio
from llama_index.llms.openai import OpenAI
from backend.app.ai_config import configure_ai_settings
from llama_index.core.settings import Settings
from vibe_router import AgenticRouter

def test_modular_router():
    configure_ai_settings()
    llm = Settings.llm

    # Instantiate the decoupled modular pip package
    router = AgenticRouter(llm=llm)

    # 1. Test Custom Classification Rule Injection
    # E.g A Tabletop RPG might pass these
    rpg_vibes = ["Ominous", "Peaceful", "Combat", "Tavern"]
    query = "The wooden floorboards creak as three figures step out of the shadows with drawn daggers."
    vibe = router.classify_vibe(query, valid_vibes=rpg_vibes)
    print(f"[TEST 1] Injected RPG Vibe: {vibe}")

    # 2. Test Dynamic Routing Topology
    # E.g A generic support desk
    topology = {
        "Tech_Support": "If the user is asking about a bug, error, or software failure.",
        "Billing": "If the user is asking about refunds, pricing, or credit cards.",
        "Sales": "If the user is asking to talk to a rep or pricing for enterprise."
    }
    route = router.route_query("I was charged twice on my visa card.", topology=topology, fallback="Tech_Support")
    print(f"[TEST 2] Injected Custom Routing Topology: {route}")

    # 3. Test Native Moodbound configuration
    # Validates that it still defaults gracefully
    genre = router.classify_genre("A knight rides a dragon into the sun.")
    print(f"[TEST 3] Native Genre Classification: {genre}")

if __name__ == "__main__":
    test_modular_router()
