import { DocParser } from "../lib/parser";
import * as ts from "typescript";
const p = new DocParser();
const docs = p.parse(ts.createProgram([
    require.resolve("../../test/fixtures/variable.ts")
], {

    }));
console.log(docs[0].members.map(s => (delete s.symbol, delete s.type, s)));
console.log(docs[0].members.map(s => s.parameters));