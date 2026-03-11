import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class AgenticRouter:
    """
    An Agentic LLM router that encapsulates the decision-making and zero-shot
    classification prompts required by the Moodbound platform.
    """
    def __init__(self, llm):
        """
        Initializes the router with a configured LlamaIndex LLM instance.
        """
        self.llm = llm
        logger.info("Initialized AgenticRouter.")

    def _execute_prompt(self, prompt: str, default: str) -> str:
        try:
            response = self.llm.complete(prompt)
            return str(response).strip()
        except Exception as e:
            logger.warning(f"Router LLM execution failed, defaulting to '{default}'. Error: {e}")
            return default

    def custom_classification(self, query: str, categories: list[str], prompt_template: str, default: str) -> str:
        """
        A raw classification pipeline allowing arbitrary project injection.
        `prompt_template` MUST contain formatting placeholders for `{category_list}` and `{query}`.
        """
        if not categories:
            return default

        category_list = ", ".join(categories)
        prompt = prompt_template.format(category_list=category_list, query=query)

        raw = self._execute_prompt(prompt, default)

        # Exact match check
        clean_raw = raw.strip("[]'\".,").lower()
        for cat in categories:
            if clean_raw == cat.lower():
                return cat

        # Substring fallback
        for cat in categories:
            if cat.lower() in clean_raw:
                return cat

        return default

    def route_query(self, query: str, topology: Optional[Dict[str, str]] = None, fallback: str = "Vector") -> str:
        """
        Routes a user query to one of the keys in the topology dictionary.
        `topology` format: {"RouteName": "Rule/Condition for choosing this route."}
        If topology is not provided, defaults to the Moodbound Vector/Graph rules.
        """
        if not topology:
            topology = {
                "Vector": "If the query asks 'Why', or asks for a reason, description, lore explanation, abstract concept, or mood. Example: 'Why was piggy duke fat?'.",
                "Graph": "If the query STRICTLY asks for structural relationships between entities (who is related to who, who betrayed who, family ties). Example: 'Who is related to Ao?'."
            }
            fallback = "Vector"

        route_names = list(topology.keys())
        route_names_str = ", ".join([f"'{name}'" for name in route_names])
        rules_str = "\n".join([f"- {name}: {rule}" for name, rule in topology.items()])

        prompt = (
            f"You are a strict query routing assistant. Categorize the user's query into EXACTLY ONE of these categories: {route_names_str}.\n\n"
            f"RULES:\n{rules_str}\n\n"
            f"Output ONLY the exact category name and absolutely nothing else.\n\n"
            f"Query: '{query}'"
        )

        raw_route = self._execute_prompt(prompt, fallback)
        clean_route = raw_route.strip("[]'\".,").lower()

        for name in route_names:
            if clean_route == name.lower():
                return name

        return fallback

    def classify_vibe(self, query: str, valid_vibes: Optional[list[str]] = None) -> str:
        """
        Classifies the emotional resonance of a query for UI styling.
        If valid_vibes is not provided, defaults to the Moodbound app list.
        """
        if not valid_vibes:
            valid_vibes = ["Melancholic", "Serene", "Dark", "Tense", "Romantic", "Epic", "Mysterious", "Happy", "Neutral"]

        vibe_list_str = "[" + ", ".join(valid_vibes) + "]"
        prompt = (
            f"Classify the emotional tone of the following search query into EXACTLY ONE of these categories: "
            f"{vibe_list_str}. Output ONLY the category name and nothing else.\n\n"
            f"Query: '{query}'"
        )

        raw_vibe = self._execute_prompt(prompt, "Neutral")
        vibe = raw_vibe.strip("[]'\".,").capitalize()

        # Verify the LLM picked a choice
        # Normalize to lowercase for safe checking, but return the capitalized matching label
        clean_vibe = vibe.lower()
        for v in valid_vibes:
            if clean_vibe == v.lower():
                return v

        # Fallback to the last item in the provided list (assumed to be the 'Neutral' or 'Unknown' default)
        return valid_vibes[-1]

    def classify_genre(self, sample_text: str, genre_labels: Optional[list[str]] = None) -> str:
        """
        Zero-shot genre classification for narrative ingestion.
        If genre_labels is not provided, defaults to the Moodbound app list.
        """
        if not genre_labels:
            genre_labels = [
                "Fantasy", "Sci-Fi", "Romance", "Mystery",
                "Thriller", "Horror", "Historical Fiction",
                "Literary Fiction", "Adventure", "Non-Fiction"
            ]

        label_list = ", ".join(genre_labels)
        prompt = (
            f"You are a text classifier. Based on the following excerpt, "
            f"classify it into exactly ONE of these categories: {label_list}.\n\n"
            f"Respond with ONLY the category name and nothing else.\n\n"
            f"EXCERPT:\n{sample_text[:2000]}"
        )

        raw = self._execute_prompt(prompt, "Uncategorized")

        for label in genre_labels:
            if label.lower() in raw.lower():
                return label

        # Fallback to a string indicating it couldn't classify it based on the constrained list.
        return "Uncategorized"
