// Copyright (C) 2017 ScyllaDB
// Use of this source code is governed by a ALv2-style
// license that can be found at https://github.com/scylladb/go-set/LICENSE.

package i64set

import (
	"github.com/fatih/set"
	"testing"
)

func BenchmarkTypeSafeSetHasNonExisting(b *testing.B) {
	b.StopTimer()
	var e1 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	b.StartTimer()
	s := New()
	for i := 0; i < b.N; i++ {
		s.Has(e1)
	}
}

func BenchmarkInterfaceSetHasNonExisting(b *testing.B) {
	b.StopTimer()
	var e1 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	b.StartTimer()
	s := set.New(set.NonThreadSafe)
	for i := 0; i < b.N; i++ {
		s.Has(e1)
	}
}

func BenchmarkTypeSafeSetHasExisting(b *testing.B) {
	b.StopTimer()
	var e1 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	b.StartTimer()
	s := New()
	s.Add(e1)
	for i := 0; i < b.N; i++ {
		s.Has(e1)
	}
}

func BenchmarkInterfaceSetHasExisting(b *testing.B) {
	b.StopTimer()
	var e1 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	b.StartTimer()
	s := set.New(set.NonThreadSafe)
	s.Add(e1)
	for i := 0; i < b.N; i++ {
		s.Has(e1)
	}
}

func BenchmarkTypeSafeSetHasExistingMany(b *testing.B) {
	s := New()
	b.StopTimer()
	var e1 int64
	for i := 0; i < 10000; i++ {
		e := createRandomObject(e1)
		if v, ok := e.(int64); ok {
			s.Add(v)
			if i == 5000 {
				e1 = v
			}
		}
	}
	b.StartTimer()
	for i := 0; i < b.N; i++ {
		s.Has(e1)
	}
}

func BenchmarkInterfaceSetHasExistingMany(b *testing.B) {
	s := set.New(set.NonThreadSafe)
	b.StopTimer()
	var e1 int64
	for i := 0; i < 10000; i++ {
		e := createRandomObject(e1)
		if v, ok := e.(int64); ok {
			s.Add(v)
			if i == 5000 {
				e1 = v
			}
		}
	}
	b.StartTimer()
	for i := 0; i < b.N; i++ {
		s.Has(e1)
	}
}

func BenchmarkTypeSafeSetAdd(b *testing.B) {
	b.StopTimer()
	var e int64
	s := New()
	objs := make([]int64, 0, b.N)
	for i := 0; i < b.N; i++ {
		e := createRandomObject(e)
		if v, ok := e.(int64); ok {
			objs = append(objs, v)
		}
	}
	b.StartTimer()
	for i := 0; i < b.N; i++ {
		s.Add(objs[i])
	}
}

func BenchmarkInterfaceSetAdd(b *testing.B) {
	b.StopTimer()
	var e int64
	s := set.New(set.NonThreadSafe)
	objs := make([]int64, 0, b.N)
	for i := 0; i < b.N; i++ {
		e := createRandomObject(e)
		if v, ok := e.(int64); ok {
			objs = append(objs, v)
		}
	}
	b.StartTimer()
	for i := 0; i < b.N; i++ {
		s.Add(objs[i])
	}
}
