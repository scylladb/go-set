package i64set

import (
	"fmt"
	"math/rand"
	//"strconv"
	"testing"

	"github.com/fatih/set"
)

func TestIntersection(t *testing.T) {
	var e1, e2, e3 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	e = createRandomObject(e2)
	if v, ok := e.(int64); ok {
		e2 = v
	}
	e = createRandomObject(e3)
	if v, ok := e.(int64); ok {
		e3 = v
	}

	s1 := New()
	s1.Add(e1)
	s1.Add(e2)

	s2 := New()
	s2.Add(e2)
	s2.Add(e3)

	s3 := Intersection(s1, s2)

	if s3.Size() != 1 || !s3.Has(e2) {
		t.Errorf("expected the intersection to only contain '%v' but it is %v", e2, s3.List())
	}
}

func TestUnion(t *testing.T) {
	var e1, e2, e3 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	e = createRandomObject(e2)
	if v, ok := e.(int64); ok {
		e2 = v
	}
	e = createRandomObject(e3)
	if v, ok := e.(int64); ok {
		e3 = v
	}

	s1 := New()
	s1.Add(e1)
	s1.Add(e2)

	s2 := New()
	s2.Add(e2)
	s2.Add(e3)

	s3 := Union(s1, s2)

	if s3.Size() != 3 || !(s3.Has(e1) && s3.Has(e2) && s3.Has(e3)) {
		t.Errorf("expected the intersection to only contain %v but it is %v", e2, s3.List())
	}
}

func TestDifference(t *testing.T) {
	var e1, e2, e3 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	e = createRandomObject(e2)
	if v, ok := e.(int64); ok {
		e2 = v
	}
	e = createRandomObject(e3)
	if v, ok := e.(int64); ok {
		e3 = v
	}

	s1 := New()
	s1.Add(e1)
	s1.Add(e2)

	s2 := New()
	s2.Add(e2)
	s2.Add(e3)

	s3 := Difference(s1, s2)

	if s3.Size() != 1 || !s3.Has(e1) {
		t.Errorf("expected the intersection to only contain %v but it is %v", e2, s3.List())
	}
}

func TestSymmetricDifference(t *testing.T) {
	var e1, e2, e3 int64
	e := createRandomObject(e1)
	if v, ok := e.(int64); ok {
		e1 = v
	}
	e = createRandomObject(e2)
	if v, ok := e.(int64); ok {
		e2 = v
	}
	e = createRandomObject(e3)
	if v, ok := e.(int64); ok {
		e3 = v
	}

	s1 := New()
	s1.Add(e1)
	s1.Add(e2)

	s2 := New()
	s2.Add(e2)
	s2.Add(e3)

	s3 := SymmetricDifference(s1, s2)

	if s3.Size() != 2 || !(s3.Has(e1) && s3.Has(e3)) {
		t.Errorf("expected the intersection to only contain %v but it is %v", e2, s3.List())
	}
}

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

func createRandomObject(i interface{}) interface{} {

	if _, ok := i.(int8); ok {
		return int8(rand.Int())
	}
	if _, ok := i.(int16); ok {
		return int16(rand.Int())
	}
	if _, ok := i.(int32); ok {
		return rand.Int31()
	}
	if _, ok := i.(int); ok {
		return int(rand.Int())
	}
	if _, ok := i.(int64); ok {
		return rand.Int63()
	}
	if _, ok := i.(uint8); ok {
		return uint8(rand.Int())
	}
	if _, ok := i.(uint16); ok {
		return uint16(rand.Int())
	}
	if _, ok := i.(uint32); ok {
		return uint32(rand.Int31())
	}
	if _, ok := i.(uint); ok {
		return uint(rand.Int31())
	}
	if _, ok := i.(uint64); ok {
		return uint64(rand.Int63())
	}
	if _, ok := i.(float32); ok {
		return rand.Float32()
	}
	if _, ok := i.(float64); ok {
		return rand.Float64()
	}
	if _, ok := i.(string); ok {
		return fmt.Sprintf("%d", rand.Int63())
	}

	panic(fmt.Sprintf("unsupported type, %v", i))
}
