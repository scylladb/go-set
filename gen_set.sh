#!/usr/bin/env bash

set -eu -o pipefail

if [ $# -ne 2 ]; then
    echo "Usage: $0 <type> <package>"
    exit 1
fi

which go_generics > /dev/null || (echo "Could not find go_generics, to install run: \"go get -u github.com/mmatczuk/go_generics/cmd/go_generics\""; exit 1)

TYPE=$1
PKG=$2

mkdir -p ${PKG}
echo "type T = int" | cat internal/set/set.go -            | go_generics -i /dev/stdin -t T=${TYPE} -o ${PKG}/${PKG}.go -p ${PKG}
echo "type T = int" | cat internal/set/set_test.go -       | go_generics -i /dev/stdin -t T=${TYPE} -o ${PKG}/${PKG}_test.go -p ${PKG}
echo "type T = int" | cat internal/set/set_bench_test.go - | go_generics -i /dev/stdin -t T=${TYPE} -o ${PKG}/${PKG}_bench_test.go -p ${PKG}
