import * as ts from "typescript";
import * as fs from "fs";

export class DocParser {

    program: ts.Program;

    checker: ts.TypeChecker;

    parse(program: ts.Program) {
        this.program = program;
        this.checker = program.getTypeChecker();
        this.visitProgram(program);
    }

    private visitDeclaration(node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.SyntaxList:
                this.visitChildren(node);
                break;
            case ts.SyntaxKind.VariableStatement:
                this.visitVariableStatement(node as ts.VariableStatement);
                break;
            case ts.SyntaxKind.MethodDeclaration:
                this.visitMethodDeclaration(node as ts.MethodDeclaration);
                break;
            default:
                break;
        }
    }

    private visitChildren(node: ts.Node) {
        for (const child of node.getChildren()) {
            this.visitDeclaration(child);
        }
    }

    private visitProgram(node: ts.Program) {
        for (const sourceFile of node.getSourceFiles()) {
            this.visitSourceFile(sourceFile);
        }
    }

    private visitSourceFile(node: ts.SourceFile) {
        if (!node.isDeclarationFile) {
            this.visitChildren(node);
        }
    }

    private visitVariableStatement(node: ts.VariableStatement) {
        this.visitVariableDeclarationList(node.declarationList);
    }

    private visitVariableDeclarationList(node: ts.VariableDeclarationList) {
        for (const declaration of node.declarations) {
            this.visitVariableDeclaration(declaration as ts.VariableDeclaration);
        }
    }

    private visitVariableDeclaration(node: ts.VariableDeclaration) {
        const symbol = this.checker.getSymbolAtLocation(node.name)!;

        console.log({
            name: symbol.getName(),
            documentation: ts.displayPartsToString(symbol.getDocumentationComment()),
            type: this.checker.typeToString(this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)),
            tags: symbol.getJsDocTags()
        });
    }

    private visitMethodDeclaration(node: ts.MethodDeclaration) {
        console.log(node);
    }

}

interface DocEntry {
    name?: string,
    fileName?: string,
    documentation?: string,
    type?: string,
    constructors?: DocEntry[],
    parameters?: DocEntry[],
    returnType?: string
};

// /** Generate documentation for all classes in a set of .ts files */
// function generateDocumentation(fileNames: string[], options: ts.CompilerOptions): void {

//     let output: DocEntry[] = [];

//     // Visit every sourceFile in the program    
//     for (const sourceFile of program.getSourceFiles()) {
//         // Walk the tree to search for classes
//         ts.forEachChild(sourceFile, visit);
//     }

//     // print out the doc
//     fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));

//     return;

//     /** visit nodes finding exported classes */
//     function visit(node: ts.Node) {
//         // Only consider exported nodes
//         if (!isNodeExported(node)) {
//             return;
//         }

//         if (node.kind === ts.SyntaxKind.ClassDeclaration) {
//             // This is a top level class, get its symbol
//             let symbol = checker.getSymbolAtLocation((<ts.ClassDeclaration>node).name);
//             output.push(serializeClass(symbol));
//             // No need to walk any further, class expressions/inner declarations
//             // cannot be exported
//         }
//         else if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
//             // This is a namespace, visit its children
//             ts.forEachChild(node, visit);
//         }
//     }

//     /** Serialize a symbol into a json object */
//     function serializeSymbol(symbol: ts.Symbol): DocEntry {
//         return {
//             name: symbol.getName(),
//             documentation: ts.displayPartsToString(symbol.getDocumentationComment()),
//             type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
//         };
//     }

//     /** Serialize a class symbol infomration */
//     function serializeClass(symbol: ts.Symbol) {
//         let details = serializeSymbol(symbol);

//         // Get the construct signatures
//         let constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
//         details.constructors = constructorType.getConstructSignatures().map(serializeSignature);
//         return details;
//     }

//     /** Serialize a signature (call or construct) */
//     function serializeSignature(signature: ts.Signature) {
//         return {
//             parameters: signature.parameters.map(serializeSymbol),
//             returnType: checker.typeToString(signature.getReturnType()),
//             documentation: ts.displayPartsToString(signature.getDocumentationComment())
//         };
//     }

//     /** True if this is visible outside this file, false otherwise */
//     function isNodeExported(node: ts.Node): boolean {
//         return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
//     }
// }

// generateDocumentation(process.argv.slice(2), {
//     target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
// });