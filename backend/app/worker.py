from arq import Worker
from app.redis_config import redis_settings
from app.tasks.ingestion import process_document
import logging

# Configure basic logging for our worker process
logging.basicConfig(level=logging.INFO)

# ARQ requires a class named WorkerSettings to configure the worker
class WorkerSettings:
    functions = [process_document] # Register the functions we want to be able to execute asynchronously
    redis_settings = redis_settings # Tell the worker how to connect to Redis
    job_timeout = 900  # Increase to 15 minutes to allow for batched LLM extraction

    # Optional lifecycle hooks
    async def on_startup(ctx):
        logging.info("Moodbound Background Worker is starting up...")

    async def on_shutdown(ctx):
        logging.info("Moodbound Background Worker is shutting down...")
