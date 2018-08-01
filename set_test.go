package goset

import (
	"strconv"
	"testing"

	"github.com/fatih/set"
	"github.com/scylladb/go-set/set/sset"
)

func TestIntersection(t *testing.T) {
	s1 := sset.New()
	s1.Add("entry 1")
	s1.Add("entry 2")

	s2 := sset.New()
	s2.Add("entry 2")
	s2.Add("entry 3")

	s3 := sset.Intersection(s1, s2)

	if s3.Size() != 1 || !s3.Has("entry 2") {
		t.Errorf("expected the intersection to only contain 'entry 2' but it is %s", s3.List())
	}
}

func BenchmarkTypeSafeSetHasNonExisting(b *testing.B) {
	s := sset.New()
	for i := 0; i < b.N; i++ {
		s.Has("kalle")
	}
}

func BenchmarkInterfaceSetHasNonExisting(b *testing.B) {
	s := set.New(set.NonThreadSafe)
	for i := 0; i < b.N; i++ {
		s.Has("kalle")
	}
}

func BenchmarkTypeSafeSetHasExisting(b *testing.B) {
	s := sset.New()
	s.Add("kalle")
	for i := 0; i < b.N; i++ {
		s.Has("kalle")
	}
}

func BenchmarkInterfaceSetHasExisting(b *testing.B) {
	s := set.New(set.NonThreadSafe)
	s.Add("kalle")
	for i := 0; i < b.N; i++ {
		s.Has("kalle")
	}
}

func BenchmarkTypeSafeSetHasExistingMany(b *testing.B) {
	b.StopTimer()
	s := sset.New()
	for i := 0; i < 10000; i++ {
		s.Add(strconv.FormatInt(int64(i), 10))
	}
	b.StartTimer()
	s.Add("kalle")
	for i := 0; i < b.N; i++ {
		s.Has("5000")
	}
}

func BenchmarkInterfaceSetHasExistingMany(b *testing.B) {
	b.StopTimer()
	s := set.New(set.NonThreadSafe)
	for i := 0; i < 10000; i++ {
		s.Add(strconv.FormatInt(int64(i), 10))
	}
	b.StartTimer()
	for i := 0; i < b.N; i++ {
		s.Has("5000")
	}
}
func BenchmarkTypeSafeSetAdd(b *testing.B) {
	s := sset.New()
	for i := 0; i < b.N; i++ {
		v := strconv.FormatInt(int64(i), 10)
		s.Add(v)
	}
}

func BenchmarkInterfaceSetAdd(b *testing.B) {
	s := set.New(set.NonThreadSafe)
	for i := 0; i < b.N; i++ {
		v := strconv.FormatInt(int64(i), 10)
		s.Add(v)
	}
}

var sinkVal string

func BenchmarkBaselineAdd(b *testing.B) {
	var v string
	for i := 0; i < b.N; i++ {
		v = strconv.FormatInt(int64(i), 10)
	}
	sinkVal = v
}
