import os
from arq.connections import RedisSettings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Our Redis container runs on localhost port 6379 natively through docker-compose
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# ARQ expects this specific format to connect
redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
