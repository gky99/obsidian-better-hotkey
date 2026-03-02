/**
 * Context Key Expression System (Dev Plan Task 3.1)
 * Responsibility: Parse and evaluate "when" clause expressions for hotkey filtering.
 *
 * Provides:
 * - ContextKeyExpression discriminated union (AST nodes)
 * - deserialize() to parse raw string → expression tree
 * - evaluate() on each node to test against runtime context
 *
 * Grammar (recursive descent with parentheses):
 *   expression := orExpr
 *   orExpr     := andExpr ( '||' andExpr )*
 *   andExpr    := atom ( '&&' atom )*
 *   atom       := '(' expression ')'
 *                | '!' atom
 *                | IDENTIFIER '==' STRING_LITERAL
 *                | IDENTIFIER '!=' STRING_LITERAL
 *                | IDENTIFIER
 *
 * Operator precedence: ! > && > ||
 */

// ---------------------------------------------------------------------------
// Context reader interface
// ---------------------------------------------------------------------------

/**
 * Abstraction for reading context values during expression evaluation.
 * ContextEngine satisfies this naturally via its getContext() method.
 */
export interface ContextReader {
    getContext(key: string): unknown;
}

// ---------------------------------------------------------------------------
// Expression types (discriminated union)
// ---------------------------------------------------------------------------

export const enum ContextKeyExprType {
    True = 0,
    Defined = 1,
    Not = 2,
    Equals = 3,
    NotEquals = 4,
    And = 5,
    Or = 6,
}

interface ContextKeyExprBase {
    readonly type: ContextKeyExprType;
    evaluate(context: ContextReader): boolean;
    serialize(): string;
}

export interface ContextKeyTrueExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.True;
}

export interface ContextKeyDefinedExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.Defined;
    readonly key: string;
}

export interface ContextKeyNotExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.Not;
    readonly key: string;
}

export interface ContextKeyEqualsExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.Equals;
    readonly key: string;
    readonly value: string;
}

export interface ContextKeyNotEqualsExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.NotEquals;
    readonly key: string;
    readonly value: string;
}

export interface ContextKeyAndExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.And;
    readonly operands: readonly ContextKeyExpression[];
}

export interface ContextKeyOrExpr extends ContextKeyExprBase {
    readonly type: ContextKeyExprType.Or;
    readonly operands: readonly ContextKeyExpression[];
}

export type ContextKeyExpression =
    | ContextKeyTrueExpr
    | ContextKeyDefinedExpr
    | ContextKeyNotExpr
    | ContextKeyEqualsExpr
    | ContextKeyNotEqualsExpr
    | ContextKeyAndExpr
    | ContextKeyOrExpr;

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createTrueExpr(): ContextKeyTrueExpr {
    return {
        type: ContextKeyExprType.True as const,
        evaluate(): boolean {
            return true;
        },
        serialize(): string {
            return '';
        },
    };
}

export function createDefinedExpr(key: string): ContextKeyDefinedExpr {
    return {
        type: ContextKeyExprType.Defined as const,
        key,
        evaluate(context: ContextReader): boolean {
            return !!context.getContext(key);
        },
        serialize(): string {
            return key;
        },
    };
}

export function createNotExpr(key: string): ContextKeyNotExpr {
    return {
        type: ContextKeyExprType.Not as const,
        key,
        evaluate(context: ContextReader): boolean {
            return !context.getContext(key);
        },
        serialize(): string {
            return `!${key}`;
        },
    };
}

export function createEqualsExpr(
    key: string,
    value: string,
): ContextKeyEqualsExpr {
    return {
        type: ContextKeyExprType.Equals as const,
        key,
        value,
        evaluate(context: ContextReader): boolean {
            return String(context.getContext(key)) === value;
        },
        serialize(): string {
            return `${key} == '${value}'`;
        },
    };
}

export function createNotEqualsExpr(
    key: string,
    value: string,
): ContextKeyNotEqualsExpr {
    return {
        type: ContextKeyExprType.NotEquals as const,
        key,
        value,
        evaluate(context: ContextReader): boolean {
            return String(context.getContext(key)) !== value;
        },
        serialize(): string {
            return `${key} != '${value}'`;
        },
    };
}

export function createAndExpr(
    operands: ContextKeyExpression[],
): ContextKeyAndExpr {
    return {
        type: ContextKeyExprType.And as const,
        operands,
        evaluate(context: ContextReader): boolean {
            for (const operand of operands) {
                if (!operand.evaluate(context)) return false;
            }
            return true;
        },
        serialize(): string {
            return operands.map((o) => o.serialize()).join(' && ');
        },
    };
}

export function createOrExpr(
    operands: ContextKeyExpression[],
): ContextKeyOrExpr {
    return {
        type: ContextKeyExprType.Or as const,
        operands,
        evaluate(context: ContextReader): boolean {
            for (const operand of operands) {
                if (operand.evaluate(context)) return true;
            }
            return false;
        },
        serialize(): string {
            return operands.map((o) => o.serialize()).join(' || ');
        },
    };
}

// ---------------------------------------------------------------------------
// Sentinel instances
// ---------------------------------------------------------------------------

/** Default expression: always evaluates to true. Used when no "when" clause is specified. */
export const CONTEXT_KEY_TRUE: ContextKeyTrueExpr = createTrueExpr();

/**
 * Sentinel expression: always evaluates to false.
 * Used as safe default for malformed/invalid expressions.
 */
const CONTEXT_KEY_FALSE: ContextKeyDefinedExpr =
    createDefinedExpr('__always_false__');

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const enum TokenType {
    Identifier,
    StringLiteral,
    Not,
    And,
    Or,
    Equals,
    NotEquals,
    LParen,
    RParen,
}

interface Token {
    type: TokenType;
    value: string;
    position: number;
}

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
        // Skip whitespace
        if (input[i] === ' ' || input[i] === '\t') {
            i++;
            continue;
        }

        // Two-character operators
        if (i + 1 < input.length) {
            const two = input[i]! + input[i + 1]!;
            if (two === '&&') {
                tokens.push({ type: TokenType.And, value: '&&', position: i });
                i += 2;
                continue;
            }
            if (two === '||') {
                tokens.push({ type: TokenType.Or, value: '||', position: i });
                i += 2;
                continue;
            }
            if (two === '==') {
                tokens.push({
                    type: TokenType.Equals,
                    value: '==',
                    position: i,
                });
                i += 2;
                continue;
            }
            if (two === '!=') {
                tokens.push({
                    type: TokenType.NotEquals,
                    value: '!=',
                    position: i,
                });
                i += 2;
                continue;
            }
        }

        // Single-character operators
        if (input[i] === '!') {
            tokens.push({ type: TokenType.Not, value: '!', position: i });
            i++;
            continue;
        }

        if (input[i] === '(') {
            tokens.push({ type: TokenType.LParen, value: '(', position: i });
            i++;
            continue;
        }

        if (input[i] === ')') {
            tokens.push({ type: TokenType.RParen, value: ')', position: i });
            i++;
            continue;
        }

        // String literals: "..." or '...'
        if (input[i] === '"' || input[i] === "'") {
            const quote = input[i]!;
            const start = i;
            i++; // skip opening quote
            let value = '';
            while (i < input.length && input[i] !== quote) {
                value += input[i];
                i++;
            }
            if (i >= input.length) {
                throw new Error(
                    `Unterminated string literal at position ${start}`,
                );
            }
            i++; // skip closing quote
            tokens.push({
                type: TokenType.StringLiteral,
                value,
                position: start,
            });
            continue;
        }

        // Identifiers: [a-zA-Z_][a-zA-Z0-9_.-]*
        if (/[a-zA-Z_]/.test(input[i]!)) {
            const start = i;
            while (i < input.length && /[a-zA-Z0-9_.-]/.test(input[i]!)) {
                i++;
            }
            tokens.push({
                type: TokenType.Identifier,
                value: input.slice(start, i),
                position: start,
            });
            continue;
        }

        throw new Error(`Unexpected character '${input[i]}' at position ${i}`);
    }

    return tokens;
}

// ---------------------------------------------------------------------------
// Parser (recursive descent)
// ---------------------------------------------------------------------------

class Parser {
    private pos = 0;

    constructor(private tokens: Token[]) {}

    parseExpression(): ContextKeyExpression {
        return this.parseOrExpr();
    }

    expectEnd(): void {
        if (this.pos < this.tokens.length) {
            const token = this.tokens[this.pos]!;
            throw new Error(
                `Unexpected token '${token.value}' at position ${token.position}`,
            );
        }
    }

    private parseOrExpr(): ContextKeyExpression {
        const operands: ContextKeyExpression[] = [this.parseAndExpr()];

        while (this.match(TokenType.Or)) {
            operands.push(this.parseAndExpr());
        }

        return operands.length === 1 ? operands[0]! : createOrExpr(operands);
    }

    private parseAndExpr(): ContextKeyExpression {
        const operands: ContextKeyExpression[] = [this.parseAtom()];

        while (this.match(TokenType.And)) {
            operands.push(this.parseAtom());
        }

        return operands.length === 1 ? operands[0]! : createAndExpr(operands);
    }

    private parseAtom(): ContextKeyExpression {
        // Parenthesized expression
        if (this.match(TokenType.LParen)) {
            const expr = this.parseExpression();
            this.expect(TokenType.RParen, ')');
            return expr;
        }

        // Negation: ! atom
        if (this.match(TokenType.Not)) {
            const atom = this.parseAtom();
            // Negation of a simple key produces ContextKeyNotExpr
            if (atom.type === ContextKeyExprType.Defined) {
                return createNotExpr(atom.key);
            }
            // For compound negation like !(a && b), wrap in a NOT-like construct
            // We create a synthetic expression that negates the inner expression
            return createNegatedExpr(atom);
        }

        // Must be an identifier
        const identToken = this.expectToken(TokenType.Identifier, 'identifier');
        const key = identToken.value;

        // Check for == or !=
        if (this.match(TokenType.Equals)) {
            const valueToken = this.expectToken(
                TokenType.StringLiteral,
                'string literal',
            );
            return createEqualsExpr(key, valueToken.value);
        }
        if (this.match(TokenType.NotEquals)) {
            const valueToken = this.expectToken(
                TokenType.StringLiteral,
                'string literal',
            );
            return createNotEqualsExpr(key, valueToken.value);
        }

        return createDefinedExpr(key);
    }

    private match(type: TokenType): boolean {
        if (
            this.pos < this.tokens.length &&
            this.tokens[this.pos]!.type === type
        ) {
            this.pos++;
            return true;
        }
        return false;
    }

    private expect(type: TokenType, expected: string): void {
        if (!this.match(type)) {
            if (this.pos < this.tokens.length) {
                const token = this.tokens[this.pos]!;
                throw new Error(
                    `Expected '${expected}' but found '${token.value}' at position ${token.position}`,
                );
            }
            throw new Error(`Expected '${expected}' but reached end of input`);
        }
    }

    private expectToken(type: TokenType, expected: string): Token {
        if (
            this.pos < this.tokens.length &&
            this.tokens[this.pos]!.type === type
        ) {
            return this.tokens[this.pos++]!;
        }
        if (this.pos < this.tokens.length) {
            const token = this.tokens[this.pos]!;
            throw new Error(
                `Expected ${expected} but found '${token.value}' at position ${token.position}`,
            );
        }
        throw new Error(`Expected ${expected} but reached end of input`);
    }
}

// ---------------------------------------------------------------------------
// Compound negation helper
// ---------------------------------------------------------------------------

/**
 * Creates an expression that negates an arbitrary sub-expression.
 * Used for parenthesized negation like !(a && b).
 * Implemented as an And with a single operand that inverts evaluate().
 */
function createNegatedExpr(inner: ContextKeyExpression): ContextKeyAndExpr {
    return {
        type: ContextKeyExprType.And as const,
        operands: [inner],
        evaluate(context: ContextReader): boolean {
            return !inner.evaluate(context);
        },
        serialize(): string {
            return `!(${inner.serialize()})`;
        },
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a "when" clause string into a ContextKeyExpression AST.
 *
 * - Empty/whitespace-only input → ContextKeyTrueExpr (always true)
 * - Invalid input → false-evaluating sentinel + console.warn
 *
 * @param serialization - Raw "when" clause string (e.g., "editorFocused && !modalOpen")
 * @returns Parsed expression tree, never null
 */
export function deserialize(serialization: string): ContextKeyExpression {
    const trimmed = serialization.trim();
    if (trimmed === '') {
        return CONTEXT_KEY_TRUE;
    }

    try {
        const tokens = tokenize(trimmed);
        if (tokens.length === 0) {
            return CONTEXT_KEY_TRUE;
        }

        const parser = new Parser(tokens);
        const expr = parser.parseExpression();
        parser.expectEnd();
        return expr;
    } catch (e) {
        console.warn(
            `Invalid when clause "${serialization}": ${e instanceof Error ? e.message : String(e)}`,
        );
        return CONTEXT_KEY_FALSE;
    }
}
