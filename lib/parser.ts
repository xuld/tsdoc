import * as ts from "typescript";
import * as fs from "fs";

/**
 * 表示一个文档解析器。
 */
export class DocParser {

    /**
     * 当前解析的程序。
     */
    private program: ts.Program;

    /**
     * 当前使用的语义分析器。
     */
    private checker: ts.TypeChecker;

    /**
     * 所有成员。
     */
    private members: DocMember[];

    /**
     * 解析指定的程序。
     * @param program 要解析的程序。
     * @return 返回已解析的文档。
     */
    parse(program: ts.Program) {
        const result: DocSourceFile[] = [];
        this.program = program;
        this.checker = program.getTypeChecker();
        for (const sourceFile of program.getSourceFiles()) {
            if (!sourceFile.isDeclarationFile) {
                result.push({
                    sourceFile: sourceFile,
                    members: this.members = []
                });
                this.visitSourceFile(sourceFile);
            }
        }
        return result;
    }

    private visitSourceFile(node: ts.SourceFile) {
        for (const statement of node.statements) {
            this.visitStatement(statement);
        }
    }

    private visitStatement(node: ts.Statement) {
        switch (node.kind) {
            case ts.SyntaxKind.VariableStatement:
                this.visitVariableStatement(node as ts.VariableStatement);
                break;
            case ts.SyntaxKind.FunctionDeclaration:
                this.visitFunctionDeclaration(node as ts.FunctionDeclaration);
                break;
        }
    }

    private visitVariableStatement(node: ts.VariableStatement) {
        // ts.getCombinedModifierFlags(node)
        this.visitVariableDeclarationList(node.declarationList);
    }

    private visitVariableDeclarationList(node: ts.VariableDeclarationList) {
        for (const declaration of node.declarations) {
            this.visitVariableDeclaration(declaration as ts.VariableDeclaration);
        }
    }

    private visitVariableDeclaration(node: ts.VariableDeclaration) {
        const member = new DocField();
        const symbol = this.checker.getSymbolAtLocation(node.name)!;
        this.initMember(member, symbol);
        member.type = this.checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
        this.members.push(member);
    }

    private initMember(member: DocMember, symbol: ts.Symbol) {
        member.symbol = symbol;
        member.name = symbol.getName();
        member.summary = ts.displayPartsToString(symbol.getDocumentationComment());
        const tags = symbol.getJsDocTags();
        for (const tag of tags) {
            switch (tag.name) {
                case "desc":
                case "description":
                case "remark":
                    member.description = member.description ? `${member.description}\n${tag.text}` : tag.text!;
                    break;
                case "see":
                case "seeAlso":
                case "seealso":
                    member.see.push(tag.text!);
                    break;
                case "example":
                case "sample":
                case "demo":
                    const wrapCode = tag.text!.indexOf('```') < 0 ? '\n```js\n' + tag.text + '\n```\n' : tag.text!;
                    member.example = member.example ? `${member.example}\n${wrapCode}` : wrapCode;
                    break;
                case "summary":
                    member.summary = member.summary ? `${member.summary}\n${tag.text}` : tag.text!;
                    break;
                default:
                    member.tags[tag.name] = tag.text!;
                    break;
            }
        }
    }

    private visitFunctionDeclaration(node: ts.FunctionDeclaration) {
        const member = new DocMethod();
        const symbol = this.checker.getSymbolAtLocation(node.name!)!;
        this.initMember(member, symbol);
        this.visitSignatureDeclaration(member, node);
        this.members.push(member);
    }

    private visitSignatureDeclaration(member: DocMethod, node: ts.SignatureDeclaration) {
        const signature = this.checker.getSignatureFromDeclaration(node)!;
        if (signature.typeParameters) {
            for (const typeParameter of signature.typeParameters) {
                const param = new DocTypeParameter();
                const symbol = param.symbol = typeParameter.getSymbol()!;
                param.name = symbol.getName();
                param.summary = ts.displayPartsToString(symbol.getDocumentationComment());
                param.default = typeParameter.default;
                param.extends = typeParameter.constraint;
                member.typeParameters.push(param);
            }
        }
        for (const paramSymbol of signature.getParameters()) {
            const param = new DocParameter();
            param.symbol = paramSymbol;
            param.name = paramSymbol.getName();
            param.summary = ts.displayPartsToString(paramSymbol.getDocumentationComment());
            const paramNode = paramSymbol.valueDeclaration! as ts.ParameterDeclaration;
            param.type = this.checker.getTypeOfSymbolAtLocation(paramSymbol, paramNode);
            param.default = paramNode.initializer;
            param.spread = paramNode.dotDotDotToken != null;
            param.optional = param.spread || param.default != null || paramNode.questionToken != null;
            member.parameters.push(param);
        }
        member.returnType = signature.getReturnType();
        const returnDoc = (ts as any).getJSDocReturnTag(node);
        if (returnDoc) {
            member.returnSummary = returnDoc.comment;
        }
    }

    private visitMethodDeclaration(node: ts.MethodDeclaration) {
        console.log(node);
    }

    private visitChildren(node: ts.Node) {
        for (const child of node.getChildren()) {
            this.visitDeclaration(child);
        }
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

}

/**
 * 表示解析后的一个源文件。
 */
export interface DocSourceFile {

    /**
     * 所属源文件。
     */
    sourceFile: ts.SourceFile;

    /**
     * 所有成员项。
     */
    members: DocMember[];

}

/**
 * 表示一个文档项。
 */
export abstract class DocEntry {

    /**
     * 源符号。
     */
    symbol: ts.Symbol;

    /**
     * 名字。
     */
    name: string;

    /**
     * 概述。
     */
    summary: string;

}

/**
 * 表示文档中定义的成员。
 */
export abstract class DocMember extends DocEntry {

    /**
     * 成员是否被导出。
     */
    get export() { return this.symbol.getFlags() & ts.SymbolFlags.Export; }

    /**
     * 完整描述。
     */
    description: string;

    /**
     * 另参考列表。
     */
    see: string[] = [];

    /**
     * 示例。
     */
    example: string;

    /**
     * 其它自定义标签。
     */
    tags: { [tagName: string]: string } = { __proto__: null! };

}

/**
 * 表示一个字段。
 */
export class DocField extends DocMember {

    /**
     * 字段类型。
     */
    type: ts.Type;

}

/**
 * 表示一个方法。
 */
export class DocMethod extends DocMember {

    /**
     * 所有泛型的形参。
     */
    typeParameters: DocTypeParameter[] = [];

    /**
     * 所有形参。
     */
    parameters: DocParameter[] = [];

    /**
     * 返回值描述。
     */
    returnSummary: string;

    /**
     * 返回值类型。
     */
    returnType: ts.Type;

}

/**
 * 表示一个形参。
 */
export class DocParameter extends DocEntry {

    /**
     * 参数类型。
     */
    type: ts.Type;

    /**
     * 是否是可选参数。
     */
    optional: boolean;

    /**
     * 是否是展开参数。
     */
    spread: boolean;

    /**
     * 默认值。
     */
    default?: ts.Node;

}

/**
 * 表示一个泛型的形参。
 */
export class DocTypeParameter extends DocEntry {

    /**
     * 默认类型。
     */
    default?: ts.Type;

    /**
     * 继承类型。
     */
    extends?: ts.Type;

}

/**
 * 表示一个类型。
 */
export abstract class DocType extends DocMember {

    /**
     * 所有成员。
     */
    members: DocMember[] = [];

}

/**
 * 表示一个类。
 */
export class DocClass extends DocType {

    /**
     * 继承类型。
     */
    extends: DocClass;

    /**
     * 实现类型。
     */
    implements: DocInterface[] = [];

}

/**
 * 表示一个接口。
 */
export class DocInterface extends DocType {

    /**
     * 继承类型。
     */
    extends: DocInterface[] = [];

}

/**
 * 表示一个枚举。
 */
export class DocEnum extends DocType {

}

/**
 * 表示一个类型别名。
 */
export class DocTypeAlias extends DocMember {

    /**
     * 值类型。
     */
    type: ts.Type;

}
