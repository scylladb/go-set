// Copyright (C) 2017 ScyllaDB
// Use of this source code is governed by a ALv2-style
// license that can be found in the LICENSE file.

package templates

//go:generate go_generics -i set.tpl -t T=complex64 -o set/c64set/set.go -p c64set
//go:generate go_generics -i set.tpl -t T=complex128 -o set/c128set/set.go -p c128set
//go:generate go_generics -i set.tpl -t T=float8 -o set/f8set/set.go -p f8set
//go:generate go_generics -i set.tpl -t T=float16 -o set/f16set/set.go -p f16set
//go:generate go_generics -i set.tpl -t T=float32 -o set/f32set/set.go -p f32set
//go:generate go_generics -i set.tpl -t T=float64 -o set/f64set/set.go -p f64set
//go:generate go_generics -i set.tpl -t T=int -o set/iset/set.go -p iset
//go:generate go_generics -i set.tpl -t T=int8 -o set/i8set/set.go -p int8set
//go:generate go_generics -i set.tpl -t T=int16 -o set/i16set/set.go -p int16set
//go:generate go_generics -i set.tpl -t T=int32 -o set/i32set/set.go -p int32set
//go:generate go_generics -i set.tpl -t T=int64 -o set/i64set/set.go -p i64set
//go:generate go_generics -i set.tpl -t T=uint -o set/uset/set.go -p uset
//go:generate go_generics -i set.tpl -t T=uint8 -o set/u8set/set.go -p u8set
//go:generate go_generics -i set.tpl -t T=uint16 -o set/u16set/set.go -p u16set
//go:generate go_generics -i set.tpl -t T=uint32 -o set/u32set/set.go -p u32set
//go:generate go_generics -i set.tpl -t T=uint64 -o set/u64set/set.go -p u64set
//go:generate go_generics -i set.tpl -t T=string -o set/sset/set.go -p sset
