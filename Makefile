# Golfe de Saint-Tropez : commandes du projet. `make help` les liste.
# Les tâches des apps passent par Turborepo (turbo.json) ; ce Makefile ajoute
# les bases Docker de développement et le déploiement.
.DEFAULT_GOAL := help
SHELL := /bin/bash
DEV := docker compose -f compose.yml -f compose.dev.yml
BASE_TEST := postgres://test:test@127.0.0.1:$${PORT_BASE_TEST:-5441}/test

help: ## Liste des commandes
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

install: ## Installe les dépendances (pnpm)
	pnpm install --frozen-lockfile

dev: install ## Base de développement, puis les apps avec rechargement à chaud
	$(DEV) up -d --wait db
	pnpm --filter @projet/db db:migrer
	pnpm dev

test: install ## Tests de toutes les apps (base de test jetable)
	$(DEV) up -d --wait db-test
	TEST_DATABASE_URL=$(BASE_TEST) pnpm test

lint: install ## Lint, format et types (Biome, tsc)
	pnpm lint
	pnpm typecheck

format: install ## Formate le code
	pnpm format

migration: install ## Écrit la migration du schéma modifié : make migration NOM=<nom> (packages/db/src/schema.ts)
	@test -n "$(NOM)" || (echo "NOM=<nom de la migration> requis" && exit 1)
	pnpm --filter @projet/db db:generer --name $(NOM)

contrats: install ## Tests de contrat des API tierces (appels réels, lecture seule)
	pnpm turbo run contrats

images: ## Construit les images comme la CI (linux/amd64)
	docker build --platform linux/amd64 -f apps/web/Dockerfile --build-arg GIT_SHA=$$(git rev-parse --short HEAD) -t gds-web .
	docker build --platform linux/amd64 -f apps/worker/Dockerfile --build-arg GIT_SHA=$$(git rev-parse --short HEAD) -t gds-worker .

deploy: ## Déploie en production : make deploy [TAG=sha-xxxxxxx]
	./scripts/deploy.sh $(TAG)

.PHONY: help install dev test lint format contrats images deploy migration
