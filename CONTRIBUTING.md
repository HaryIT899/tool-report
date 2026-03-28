# Contributing to Domain Abuse Report Tool

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professional communication
- Respect differing viewpoints

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or inflammatory comments
- Publishing others' private information
- Malicious or destructive contributions
- Violations of ethical use guidelines

## Ways to Contribute

### 1. Report Bugs

Found a bug? Create an issue with:

**Required information:**
- Clear title describing the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, etc.)
- Error messages/logs
- Screenshots (if applicable)

**Example:**
```
Title: "Bulk import fails with CSV format"

Steps to reproduce:
1. Click "Bulk Import"
2. Paste: "domain1.com,domain2.com"
3. Click Import

Expected: Both domains imported
Actual: Error message "Failed to import"

Environment:
- OS: Windows 11
- Node: v18.15.0
- Browser: Chrome 120

Error in console:
"SyntaxError: Unexpected token..."
```

### 2. Suggest Features

Have an idea? Create an issue with:

- Feature description
- Use case and benefits
- Proposed implementation (if you have ideas)
- Example mockups or wireframes
- Why it's valuable

### 3. Improve Documentation

Documentation contributions are always welcome:

- Fix typos
- Clarify confusing sections
- Add examples
- Translate to other languages
- Create tutorials
- Add diagrams

### 4. Submit Code

See "Development Workflow" section below.

### 5. Test & Review

- Test new features
- Review pull requests
- Provide feedback
- Report edge cases
- Verify bug fixes

---

## Development Workflow

### 1. Setup Development Environment

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/domain-abuse-tool.git
cd domain-abuse-tool

# Setup backend
cd backend
npm install
cp .env.example .env
npm run seed:all

# Setup frontend
cd ../frontend
npm install

# Install extension in Chrome
```

### 2. Create Feature Branch

```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bugfix
git checkout -b fix/bug-description
```

### 3. Make Changes

**Code Style:**
- Follow existing patterns
- Use TypeScript in backend
- Use functional components in frontend
- Add JSDoc comments
- Write meaningful commit messages

**Backend (NestJS):**
```typescript
// Use decorators
@Injectable()
export class MyService {}

// Follow module pattern
@Module({
  imports: [...],
  controllers: [...],
  providers: [...],
  exports: [...],
})

// Use DTOs for validation
export class CreateDto {
  @IsNotEmpty()
  field: string;
}
```

**Frontend (React):**
```jsx
// Functional components
const Component = () => {
  const [state, setState] = useState();
  
  useEffect(() => {
    // Side effects
  }, []);
  
  return <div>...</div>;
};

export default Component;
```

### 4. Test Your Changes

**Backend:**
```bash
cd backend
npm run lint
npm run build
# Manual testing via API
```

**Frontend:**
```bash
cd frontend
npm run lint
npm run build
# Manual testing in browser
```

**Extension:**
- Load unpacked extension
- Test on all supported sites
- Check console for errors

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: add CSV export functionality"

# Or
git commit -m "fix: resolve bulk import parsing issue"
```

**Commit Message Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting)
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

**Examples:**
```
feat: add email account management UI
fix: resolve Redis connection timeout
docs: update deployment guide with Docker
refactor: simplify domain service logic
style: format code with Prettier
test: add unit tests for auth service
chore: update dependencies to latest versions
```

### 6. Push & Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name
```

**On GitHub:**
1. Go to your fork
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template
5. Submit

**PR Description Should Include:**
- What changes were made
- Why the changes were needed
- How to test the changes
- Any breaking changes
- Related issues (if any)

**Example PR:**
```markdown
## Description
Adds CSV export functionality for domains and report logs.

## Motivation
Users requested ability to export data for external analysis.

## Changes
- Added export endpoint in domains controller
- Added CSV generation utility
- Added export button in frontend
- Updated documentation

## Testing
1. Login to dashboard
2. Click "Export" button
3. CSV file downloads with all domains
4. Verify data is complete

## Breaking Changes
None

## Related Issues
Closes #123
```

---

## Code Review Process

### What We Look For

**Code Quality:**
- ✅ Follows existing patterns
- ✅ Well-structured and readable
- ✅ Properly typed (TypeScript)
- ✅ Error handling included
- ✅ No unnecessary complexity

**Functionality:**
- ✅ Works as described
- ✅ No regressions
- ✅ Edge cases handled
- ✅ Performance considered

**Documentation:**
- ✅ Code comments where needed
- ✅ README updated if needed
- ✅ API docs updated
- ✅ Examples provided

### Review Timeline

- Initial review: Within 3-7 days
- Follow-up: 1-3 days
- Merge: After approval

---

## Development Guidelines

### Backend Development

**Module Structure:**
```
module-name/
├── schemas/           # Database models
├── dto/              # Data transfer objects
├── guards/           # Auth guards (if needed)
├── module-name.controller.ts
├── module-name.service.ts
└── module-name.module.ts
```

**Service Layer:**
```typescript
@Injectable()
export class MyService {
  constructor(
    @InjectModel(Model.name) private model: Model<Document>,
  ) {}

  async create(dto: CreateDto): Promise<Document> {
    // Implementation
  }
}
```

**Controller Layer:**
```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard)
export class MyController {
  constructor(private service: MyService) {}

  @Post()
  async create(@Body() dto: CreateDto, @Request() req) {
    return this.service.create(dto, req.user.userId);
  }
}
```

### Frontend Development

**Component Structure:**
```jsx
import { useState, useEffect } from 'react';
import { Component } from 'antd';
import api from '../services/api';

const MyComponent = () => {
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Effects
  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/endpoint');
      setData(response.data);
    } catch (error) {
      message.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default MyComponent;
```

### Extension Development

**Content Script Pattern:**
```javascript
// Detect page
const detectPage = () => {
  const url = window.location.href;
  if (isSupported(url)) {
    showNotification('Page detected!');
  }
};

// Fill form
const fillForm = (data) => {
  const filled = fillInput(selectors, data.value);
  if (filled) {
    showNotification('Form filled!');
  }
};

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    fillForm(request.data);
    sendResponse({ success: true });
  }
});
```

---

## Testing Guidelines

### Manual Testing Checklist

**Backend:**
- [ ] API endpoints work correctly
- [ ] Authentication flow
- [ ] Database operations
- [ ] Queue processing
- [ ] Error handling
- [ ] Edge cases

**Frontend:**
- [ ] All pages load
- [ ] Forms submit correctly
- [ ] Navigation works
- [ ] Responsive design
- [ ] Error messages display
- [ ] Loading states show

**Extension:**
- [ ] Loads without errors
- [ ] Detects pages correctly
- [ ] Auto-fills forms
- [ ] Manual fill works
- [ ] Notifications show

### Testing New Features

When adding a feature:

1. **Unit test** the service/function
2. **Integration test** the API endpoint
3. **Manual test** through UI
4. **Test edge cases** (empty input, invalid data, etc.)
5. **Test error scenarios** (network errors, auth failures, etc.)

---

## Documentation Standards

### Code Comments

**When to comment:**
- Complex algorithms
- Non-obvious logic
- Workarounds
- TODOs
- Important decisions

**When NOT to comment:**
- Obvious code
- Self-explanatory functions
- Redundant descriptions

**Good:**
```typescript
// Email rotation uses least-recently-used algorithm
// to distribute load evenly across accounts
const account = await this.getNextAvailableAccount();
```

**Bad:**
```typescript
// Get account
const account = await this.getNextAvailableAccount();
```

### README Updates

If your change affects:
- Installation process → Update SETUP_GUIDE.md
- API endpoints → Update API_TESTING.md
- Features → Update FEATURES.md
- Architecture → Update ARCHITECTURE.md
- Usage → Update README.md

### JSDoc (Optional but Appreciated)

```typescript
/**
 * Rotates email accounts using least-recently-used algorithm
 * @returns Next available active account or null if none available
 * @throws Error if database query fails
 */
async getNextAvailableAccount(): Promise<AccountDocument | null> {
  // Implementation
}
```

---

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style
- [ ] All tests pass
- [ ] Lint errors fixed
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### PR Template

When creating a PR, include:

```markdown
## What
Brief description of changes

## Why
Reason for changes

## How
Technical approach

## Testing
Steps to test

## Screenshots
(if UI changes)

## Checklist
- [ ] Code tested
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Follows style guide
```

### Review Process

1. **Automated checks** run (linting, build)
2. **Maintainer review** (code quality, functionality)
3. **Feedback** provided if changes needed
4. **Approval** when ready
5. **Merge** into main branch

### After Merge

- Delete your feature branch
- Pull latest main
- Create new branch for next feature

---

## Community

### Communication Channels

- **GitHub Issues** - Bugs and features
- **GitHub Discussions** - General questions
- **Pull Requests** - Code contributions
- **Email** - Private inquiries

### Getting Help

**Before asking:**
1. Read documentation
2. Search existing issues
3. Check FAQ.md
4. Review code comments

**When asking:**
- Be specific
- Provide context
- Include error messages
- Share code snippets
- Be patient and respectful

---

## Recognition

### Contributors

All contributors are recognized:
- GitHub contributors page
- CONTRIBUTORS.md file (if created)
- Release notes
- Commit history

### Hall of Fame

Top contributors may be featured in:
- README.md
- Project website
- Social media

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Release Process

### Version Numbering

Follow Semantic Versioning (SemVer):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

Examples:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.1.0` → `2.0.0` (breaking change)

### Release Checklist

- [ ] All PRs merged
- [ ] Tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Tag created
- [ ] Release notes written

---

## Areas Needing Contribution

### High Priority

1. **Testing** - Unit and integration tests
2. **Performance** - Optimization and profiling
3. **Security** - Audits and hardening
4. **Documentation** - Examples and tutorials

### Medium Priority

1. **UI/UX** - Design improvements
2. **Features** - CSV export, scheduling, webhooks
3. **Internationalization** - Multi-language support
4. **Mobile** - Responsive design improvements

### Low Priority

1. **Analytics** - Usage statistics
2. **Themes** - Dark mode, custom themes
3. **Plugins** - Extensibility system
4. **Integrations** - Third-party services

---

## Development Environment

### Recommended Tools

**IDE:**
- Visual Studio Code
- WebStorm
- Cursor

**Extensions:**
- ESLint
- Prettier
- MongoDB for VS Code
- Thunder Client (API testing)

**Tools:**
- Postman/Insomnia (API testing)
- MongoDB Compass (database GUI)
- Redis Commander (Redis GUI)
- Chrome DevTools

### Environment Setup

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev

# Keep both terminals running
```

---

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/what-refactored` - Refactoring
- `test/what-tested` - Tests

### Commit Frequency

- Commit often (logical chunks)
- Each commit should be buildable
- Use meaningful messages
- Keep commits focused

### Rebase vs Merge

- Rebase feature branches on main
- Keep history clean
- Squash commits if many small ones

---

## Testing Contributions

### Backend Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('DomainsService', () => {
  let service: DomainsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DomainsService],
    }).compile();

    service = module.get<DomainsService>(DomainsService);
  });

  it('should create domain', async () => {
    const dto = { domain: 'test.com', reason: 'Test' };
    const result = await service.create(dto, 'userId');
    expect(result.domain).toBe('test.com');
  });
});
```

### Frontend Tests

```jsx
import { render, screen } from '@testing-library/react';
import Login from './Login';

describe('Login', () => {
  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });
});
```

---

## Documentation Contributions

### README Files

Each module should have clear documentation:
- Purpose
- Usage examples
- API reference
- Configuration options

### Code Examples

Include working examples:

```typescript
// ✅ Good example with context
// Create a new domain with template
const domain = await domainsService.create({
  domain: 'evil-site.com',
  reason: 'Phishing attack',
  template: 'phishing',
}, userId);

// ❌ Bad example without context
const domain = await service.create(data);
```

### Diagrams

Use ASCII art or markdown tables:

```
┌─────────┐     ┌─────────┐
│ Client  │────▶│  API    │
└─────────┘     └─────────┘
```

---

## Review Checklist

Before requesting review:

### Code
- [ ] Follows style guide
- [ ] No commented-out code
- [ ] No console.log() in production code
- [ ] Error handling included
- [ ] Types are correct
- [ ] No hardcoded values

### Functionality
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] No regressions
- [ ] Performance acceptable

### Documentation
- [ ] Code comments where needed
- [ ] README updated
- [ ] API docs updated
- [ ] Examples provided

### Git
- [ ] Branch is up to date
- [ ] Commits are clean
- [ ] No merge conflicts
- [ ] Meaningful commit messages

---

## Getting Started with First Contribution

### Good First Issues

Look for issues labeled:
- `good-first-issue`
- `help-wanted`
- `documentation`
- `beginner-friendly`

### Suggested First Contributions

1. **Fix typos** in documentation
2. **Add examples** to README files
3. **Improve error messages**
4. **Add input validation**
5. **Create tests** for existing code

### Mentorship

Need help getting started?
- Comment on the issue
- Ask questions in discussion
- Request guidance
- Pair programming welcome

---

## Recognition & Credits

### Contributor Levels

**First-time contributor:**
- First merged PR
- Welcome message
- Added to contributors list

**Regular contributor:**
- 3+ merged PRs
- Trusted with reviews
- Can help others

**Core contributor:**
- 10+ merged PRs
- Architectural input
- Merge permissions

### How to Get Recognized

1. Make meaningful contributions
2. Help review others' PRs
3. Improve documentation
4. Help community members
5. Maintain code quality

---

## Questions?

- Create a Discussion on GitHub
- Comment on relevant issues
- Check FAQ.md
- Review documentation

## Thank You! 🙏

Your contributions make this project better for everyone!
