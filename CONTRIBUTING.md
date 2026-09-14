# Contributing to PUMP-MCP

Thank you for your interest in contributing to PUMP-MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Celebrate diversity of ideas and approaches

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/PUMP-MCP/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Error messages or logs (remove sensitive data)

### Suggesting Features

1. Check existing issues and discussions
2. Create a feature request issue with:
   - Clear description of the feature
   - Use case and motivation
   - Proposed implementation (if you have ideas)
   - Examples or mockups (if applicable)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation as needed
   - Test your changes thoroughly

4. **Commit your changes:**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   - Use [Conventional Commits](https://www.conventionalcommits.org/) format
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request:**
   - Provide a clear description
   - Reference any related issues
   - Wait for review and address feedback

## Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/yourusername/PUMP-MCP.git
   cd PUMP-MCP
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Test your changes:**
   ```bash
   # Test the MCP server
   node build/index.js
   ```

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Follow existing patterns and conventions
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and single-purpose

### File Organization

- Place new tools in `src/` directory
- Register new tools in `src/index.ts`
- Use descriptive file names (kebab-case)
- Keep files under 300 lines when possible

### Error Handling

- Always handle errors gracefully
- Provide meaningful error messages
- Use try-catch blocks for async operations
- Return structured error responses

### Security

- **Never commit private keys or API keys**
- Use environment variables for all secrets
- Validate all user inputs
- Follow security best practices (see [SECURITY.md](SECURITY.md))

## Testing

- Test your changes with real Solana transactions (use devnet or small amounts)
- Verify error handling works correctly
- Test edge cases and boundary conditions
- Ensure backward compatibility when possible

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for new functions
- Update examples if API changes
- Keep documentation clear and concise

## Areas for Contribution

### High Priority

- [ ] Additional blockchain integrations
- [ ] Enhanced error messages and validation
- [ ] Unit tests and test coverage
- [ ] Performance optimizations
- [ ] Security improvements

### Medium Priority

- [ ] Enhanced image generation features
- [ ] Trading strategy helpers
- [ ] UI/visualization tools
- [ ] Documentation improvements
- [ ] CI/CD pipeline setup

### Low Priority

- [ ] Additional token metadata fields
- [ ] Batch operations
- [ ] Historical data tracking
- [ ] Analytics and reporting

## Questions?

- Open an issue for questions or discussions
- Check existing documentation first
- Be patient with maintainers' response times

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC License).

---

Thank you for contributing to PUMP-MCP! 🚀
