import os
from arq.connections import RedisSettings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Our Redis container runs on localhost port 6379 natively through docker-compose
# We use 127.0.0.1 explicitly to avoid IPv6 resolution issues on Windows
REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# ARQ expects this specific format to connect
redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
