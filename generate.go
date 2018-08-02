// Copyright (C) 2017 ScyllaDB
// Use of this source code is governed by a ALv2-style
// license that can be found in the LICENSE file.

package set

//go:generate go_generics -i set.tpl -t T=float32 -o f32set/set.go -p f32set
//go:generate go_generics -i set_test.tpl -t T=float32 -o f32set/set_test.go -p f32set

//go:generate go_generics -i set.tpl -t T=float64 -o f64set/set.go -p f64set
//go:generate go_generics -i set_test.tpl -t T=float64 -o f64set/set_test.go -p f64set

//go:generate go_generics -i set.tpl -t T=int -o iset/set.go -p iset
//go:generate go_generics -i set_test.tpl -t T=int -o iset/set_test.go -p iset

//go:generate go_generics -i set.tpl -t T=int8 -o i8set/set.go -p i8set
//go:generate go_generics -i set_test.tpl -t T=int8 -o i8set/set_test.go -p i8set

//go:generate go_generics -i set.tpl -t T=int16 -o i16set/set.go -p i16set
//go:generate go_generics -i set_test.tpl -t T=int16 -o i16set/set_test.go -p i16set

//go:generate go_generics -i set.tpl -t T=int32 -o i32set/set.go -p i32set
//go:generate go_generics -i set_test.tpl -t T=int32 -o i32set/set_test.go -p i32set

//go:generate go_generics -i set.tpl -t T=int64 -o i64set/set.go -p i64set
//go:generate go_generics -i set_test.tpl -t T=int64 -o i64set/set_test.go -p i64set

//go:generate go_generics -i set.tpl -t T=uint -o uset/set.go -p uset
//go:generate go_generics -i set_test.tpl -t T=uint -o uset/set_test.go -p uset

//go:generate go_generics -i set.tpl -t T=uint8 -o u8set/set.go -p u8set
//go:generate go_generics -i set_test.tpl -t T=uint8 -o u8set/set_test.go -p u8set

//go:generate go_generics -i set.tpl -t T=uint16 -o u16set/set.go -p u16set
//go:generate go_generics -i set_test.tpl -t T=uint16 -o u16set/set_test.go -p u16set

//go:generate go_generics -i set.tpl -t T=uint32 -o u32set/set.go -p u32set
//go:generate go_generics -i set_test.tpl -t T=uint32 -o u32set/set_test.go -p u32set

//go:generate go_generics -i set.tpl -t T=uint64 -o u64set/set.go -p u64set
//go:generate go_generics -i set_test.tpl -t T=uint64 -o u64set/set_test.go -p u64set

//go:generate go_generics -i set.tpl -t T=string -o sset/set.go -p sset
//go:generate go_generics -i set_test.tpl -t T=string -o sset/set_test.go -p sset
