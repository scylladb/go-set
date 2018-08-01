# go-set - type safe sets for Go

This package is a type safe continuation of the package excellent [fatih/set](https://github.com/fatih/set).

## Motivation

We found ourselves using the [fatih/set](https://github.com/fatih/set) package a lot in our code and we like
it's simplicity and easy of use a lot. We did notice however that it is no longer maintained so we decided
to adopt it. We are however fans of type safe code so in the process we decided to make it generic and simply
generate code for the types we needed. This repository contains most of the simple types and is considered a
ready to use as is set of packages for when you need sets.

## Code generation

For code generation we use the [gVisor](https://github.com/google/gvisor) tool [go_generate](https://github.com/google/gvisor/tree/master/tools/go_generics). To install this tool you need to follow gVisor
instructions for building gVisor and use the resulting go_generate binary. There is unfortunately no way to `go get`
the tool at the time of this writing.

Once you have `go_generate` installed properly you can regenerate the code using `go generate` in the top level
directory.

## Using the library

To use any of the pregenerated sets just import them in your code as per the usual Go manner. All packages have a
factory function `New` that should be used to create sets.

Example code using the generated string set:

```go
s := sset.New()
s.Add("entry 1")
s.Add("entry 2")

if s.Has("entry 2") {
    // do something
} else {
    // do something else
}
```

The library has several of the more convenient set operations for `unions` and `disjunctions` etc as well.

To calculate the intersection of two sets do this:

```go
s1 := sset.New()
s1.Add("entry 1")
s1.Add("entry 2")

s2 := sset.New()
s2.Add("entry 2")
s2.Add("entry 3")

s3 := sset.Intersection(s1, s2)

// s3 no contains only "entry 2"
```