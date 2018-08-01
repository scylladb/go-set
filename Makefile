all: help

ifndef GOBIN
export GOBIN := $(GOPATH)/bin
endif

.PHONY: setup
setup: GOPATH := $(shell mktemp -d)
setup: ## Install required tools
	@echo "==> Installing tools at $(GOBIN) ..."
	@mkdir -p $(GOBIN)

# linters
	@go get -u github.com/client9/misspell/cmd/misspell
	@go get -u github.com/golangci/golangci-lint/cmd/golangci-lint

.PHONY: check
check: ## Perform static code analysis
check: .check-misspell .check-lint

.PHONY: .check-misspell
.check-misspell:
	@$(GOBIN)/misspell ./...

.PHONY: .check-lint
.check-lint:
	@$(GOBIN)/golangci-lint run -s --disable-all -E govet -E errcheck -E staticcheck \
	-E gas -E typecheck -E unused -E structcheck -E varcheck -E ineffassign -E deadcode \
	-E gofmt -E golint -E gosimple -E unconvert -E depguard -E gocyclo \
	--tests=false \
	--exclude-use-default=false \
	--exclude='composite literal uses unkeyed fields' \
	--exclude='Error return value of `.+\.Close` is not checked' \
	--exclude='G104' \
	--exclude='G304' \
	./...

test:
	@echo "==> Running tests (race)..."
	@go test -cover -race ./...

bench:
	@echo "==> Running benchmarks..."
	@go test -bench . ./...

generate:
	@echo "==> Running code generation..."
	@go generate