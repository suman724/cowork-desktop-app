.PHONY: help install lint format format-check typecheck test test-cov test-e2e dev build check clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install

lint: ## Run ESLint
	npx eslint 'src/**/*.{ts,tsx}' 'tests/**/*.{ts,tsx}'

format: ## Auto-format code with Prettier
	npx prettier --write 'src/**/*.{ts,tsx,css,html}' 'tests/**/*.{ts,tsx}'

format-check: ## Check formatting without modifying
	npx prettier --check 'src/**/*.{ts,tsx,css,html}' 'tests/**/*.{ts,tsx}'

typecheck: ## Run TypeScript type checker
	npx tsc --noEmit -p tsconfig.node.json && npx tsc --noEmit -p tsconfig.web.json

test: ## Run unit tests
	npx vitest run

test-cov: ## Run unit tests with V8 coverage (80% threshold)
	npx vitest run --coverage

test-e2e: ## Run Playwright E2E tests
	npx playwright test

dev: ## Start in development mode (hot reload)
	set -a && [ -f .env ] && . .env; set +a && npx electron-vite dev

build: ## Build distributable (electron-builder)
	npx electron-vite build && npx electron-builder --config electron-builder.yml

check: lint format-check typecheck test ## CI gate: lint + format-check + typecheck + test

clean: ## Remove build artifacts and caches
	rm -rf out/ dist/ coverage/ node_modules/.cache
