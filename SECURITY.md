# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Private Key Management

- **Never commit private keys to version control**
- Private keys are stored locally in the `.keys/` directory (gitignored)
- Use dedicated wallets for testing with minimal funds
- Never share your `.keys/` directory or private keys

### Environment Variables

- All sensitive configuration should be stored in `.env` file (gitignored)
- Never commit `.env` files to version control
- Use `.env.example` as a template for required variables
- Rotate API keys if they are accidentally exposed

### API Keys

- **Helius RPC URL**: Required for Solana mainnet access
  - Get a free key from https://dev.helius.xyz/
  - Never hardcode API keys in source code
  - Use environment variables for all API keys

- **OpenAI API Key**: Optional, for image generation
  - Get one from https://platform.openai.com/api-keys
  - Store in `.env` file only

### Transaction Security

- Always verify transaction parameters before execution
- Start with small amounts when testing
- Review all transactions on Solana Explorer before confirming
- Use test wallets, not your main wallet

### Network Security

- The MCP server operates via stdio (no network exposure)
- All communication is local between Claude Desktop and the server
- No external network endpoints are exposed by default

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email security details to: [Your security email or GitHub security advisory]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Resolution: Depends on severity

### What to Expect

- We will acknowledge receipt of your report
- We will investigate and verify the vulnerability
- We will work on a fix and coordinate disclosure
- We will credit you in the security advisory (if desired)

## Known Security Considerations

1. **Local Key Storage**: Keys are stored in plain JSON files. Consider using encrypted storage for production use.

2. **No Transaction Confirmation**: The MCP server executes transactions automatically. Always review parameters carefully.

3. **RPC Provider Trust**: You must trust your RPC provider (Helius). Consider using your own RPC node for maximum security.

4. **OpenAI API**: Image generation requires sending prompts to OpenAI. Review their privacy policy.

## Security Checklist for Contributors

- [ ] No hardcoded API keys or secrets
- [ ] All sensitive data in `.env` (gitignored)
- [ ] Private keys never committed
- [ ] Environment variables used for all configuration
- [ ] No credentials in commit history
- [ ] Security-sensitive code is documented
