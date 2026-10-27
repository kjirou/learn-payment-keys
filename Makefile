.PHONY: build js go all check

build:
	docker compose build

js:
	docker compose run --rm js

go:
	docker compose run --rm go

all: js go

# 両言語の出力が一致することを確認する
check:
	@mkdir -p out
	@docker compose run --rm -T js > out/js.txt
	@docker compose run --rm -T go > out/go.txt
	@diff out/js.txt out/go.txt && echo "OK: js and go outputs are identical"
