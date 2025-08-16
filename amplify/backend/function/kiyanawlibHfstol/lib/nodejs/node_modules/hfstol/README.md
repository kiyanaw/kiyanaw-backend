# hfst-optimized-lookup

An npm-installable library version of [hfst-optimized-lookup][], originally
built for [itwêwina][].

[hfst-optimized-lookup]: https://github.com/hfst/hfst/blob/master/tools/src/hfst-optimized-lookup.cc
[itwêwina]: https://itwewina.altlab.app

## Installation

    yarn add hfstol

## Usage

    const { Transducer } = require('hfstol');
    const fst = new Transducer('crk-analyzer.hfstol');
    fst.lookup('atim')
    // ⇒ ["atim+N+A+Sg", "atimêw+V+TA+Imp+Imm+2Sg+3SgO"]
    fst.lookup_symbols('atim')
    // ⇒ [["a", "t", "i", "m", "+N", "+A", "+Sg"],
    //    ["a", "t", "i", "m", "ê", "w", "+V", "+TA", "+Imp", "+Imm", "+2Sg", "+3SgO"]]
    fst.lookup_lemma_with_affixes('atim')
    // ⇒ [
    //     [[], "atim", ["+N", "+A", "+Sg"]],
    //     [[], "atimêw", ["+V", "+TA", "+Imp", "+Imm", "+2Sg", "+3SgO"]],
    //   ];

## Windows support

This package has been successfully run on Windows, but we do not currently
include pre-built binaries in the npm package or test it in CI.

You will need to follow the [NodeJS windows instructions] to install Python
and C++ build tools for the package installation to succeed.

[NodeJS windows instructions] https://github.com/nodejs/node-gyp#on-windows

## Development notes

Largely based on the python version, the
[node-addon-api](https://github.com/nodejs/node-addon-api) docs,
and [node-addon-examples](https://github.com/nodejs/node-addon-examples).
