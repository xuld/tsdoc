import { DocParser } from "../lib/parser";
import * as ts from "typescript";
const p = new DocParser();
const docs = p.parse(ts.createProgram([
    require.resolve("../../test/fixtures/variable.ts")
], {

    }));
// console.log(docs);