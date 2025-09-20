# CloudflareAI

A natural language interface for the Cloudflare API.

## Features

- 💬 Use natural language to interact with Cloudflare's API
- 🔒 Support for both Cloudflare API Tokens and Global API Keys
- 🔐 Automatic creation of scoped API tokens with required permissions
- 🧪 API validation and testing before using credentials
- 🌐 Access all Cloudflare API endpoints through conversation
- 📊 View and manage zones, DNS records, workers, and more
- 🧠 Powered by OpenAI's GPT-4 for natural language understanding

## Getting Started

### Prerequisites

- Node.js and npm installed
- Cloudflare account with either:
  - API Token with appropriate permissions, OR
  - Global API Key and email address
- OpenAI API key (ideally with GPT-4 access)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cfai.git
   cd cfai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open the app in your browser at `http://localhost:3000` or `http://localhost:3001`

5. Complete the setup process by entering your API credentials:
   - For Cloudflare, you can use either:
     - API Token (recommended, with specific permissions)
     - Global API Key + Email (will help you create a scoped token)
   - For OpenAI, enter your API key

### Usage

Once set up, you can start asking questions or giving commands about your Cloudflare account.

Example queries:
- "List all my websites"
- "Show DNS records for example.com"
- "Turn on development mode for my-site.com"
- "Create a new DNS record for blog.example.com pointing to 192.168.1.1"
- "Check if firewall is enabled for my domain"
- "Get SSL/TLS encryption mode for example.com"
- "Create a page rule to forward example.com/blog to blog.example.com"
- "Purge cache for my website"

## Security

- Your API tokens are stored securely in your browser's local storage
- Tokens are only sent directly to Cloudflare and OpenAI APIs
- No data is stored on any third-party servers

## License

MIT

## Acknowledgments

- Powered by Cloudflare API
- Natural language processing by OpenAI
- Built with React and Material-UI