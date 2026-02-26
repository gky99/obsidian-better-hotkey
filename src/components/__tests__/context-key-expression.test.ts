import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    type ContextReader,
    type ContextKeyExpression,
    ContextKeyExprType,
    createTrueExpr,
    createDefinedExpr,
    createNotExpr,
    createEqualsExpr,
    createNotEqualsExpr,
    createAndExpr,
    createOrExpr,
    deserialize,
    CONTEXT_KEY_TRUE,
} from '../context-key-expression';

// ---------------------------------------------------------------------------
// Test helper: mock ContextReader
// ---------------------------------------------------------------------------

function mockContext(values: Record<string, unknown> = {}): ContextReader {
    const map = new Map(Object.entries(values));
    return {
        getContext(key: string): unknown {
            return map.get(key);
        },
    };
}

// ---------------------------------------------------------------------------
// Expression node evaluation tests
// ---------------------------------------------------------------------------

describe('ContextKeyTrueExpr', () => {
    it('always evaluates to true', () => {
        const expr = createTrueExpr();
        expect(expr.evaluate(mockContext())).toBe(true);
        expect(expr.evaluate(mockContext({ anything: false }))).toBe(true);
    });

    it('has type True', () => {
        expect(createTrueExpr().type).toBe(ContextKeyExprType.True);
    });

    it('serializes to empty string', () => {
        expect(createTrueExpr().serialize()).toBe('');
    });
});

describe('ContextKeyDefinedExpr', () => {
    it('returns true when key is truthy boolean', () => {
        const expr = createDefinedExpr('editorFocused');
        expect(expr.evaluate(mockContext({ editorFocused: true }))).toBe(true);
    });

    it('returns true when key is non-empty string', () => {
        const expr = createDefinedExpr('viewType');
        expect(expr.evaluate(mockContext({ viewType: 'editor' }))).toBe(true);
    });

    it('returns true when key is non-zero number', () => {
        const expr = createDefinedExpr('count');
        expect(expr.evaluate(mockContext({ count: 42 }))).toBe(true);
    });

    it('returns false when key is undefined', () => {
        const expr = createDefinedExpr('missing');
        expect(expr.evaluate(mockContext())).toBe(false);
    });

    it('returns false when key is false', () => {
        const expr = createDefinedExpr('active');
        expect(expr.evaluate(mockContext({ active: false }))).toBe(false);
    });

    it('returns false when key is empty string', () => {
        const expr = createDefinedExpr('name');
        expect(expr.evaluate(mockContext({ name: '' }))).toBe(false);
    });

    it('returns false when key is 0', () => {
        const expr = createDefinedExpr('count');
        expect(expr.evaluate(mockContext({ count: 0 }))).toBe(false);
    });

    it('returns false when key is null', () => {
        const expr = createDefinedExpr('data');
        expect(expr.evaluate(mockContext({ data: null }))).toBe(false);
    });

    it('serializes to key name', () => {
        expect(createDefinedExpr('editorFocused').serialize()).toBe(
            'editorFocused',
        );
    });
});

describe('ContextKeyNotExpr', () => {
    it('returns true when key is undefined', () => {
        const expr = createNotExpr('missing');
        expect(expr.evaluate(mockContext())).toBe(true);
    });

    it('returns true when key is false', () => {
        const expr = createNotExpr('active');
        expect(expr.evaluate(mockContext({ active: false }))).toBe(true);
    });

    it('returns false when key is truthy', () => {
        const expr = createNotExpr('active');
        expect(expr.evaluate(mockContext({ active: true }))).toBe(false);
    });

    it('serializes to !key', () => {
        expect(createNotExpr('modalOpen').serialize()).toBe('!modalOpen');
    });
});

describe('ContextKeyEqualsExpr', () => {
    it('returns true when string value matches', () => {
        const expr = createEqualsExpr('viewType', 'editor');
        expect(expr.evaluate(mockContext({ viewType: 'editor' }))).toBe(true);
    });

    it('returns false when string value differs', () => {
        const expr = createEqualsExpr('viewType', 'editor');
        expect(expr.evaluate(mockContext({ viewType: 'graph' }))).toBe(false);
    });

    it('coerces non-string value to string for comparison', () => {
        const expr = createEqualsExpr('count', '42');
        expect(expr.evaluate(mockContext({ count: 42 }))).toBe(true);
    });

    it('coerces boolean to string for comparison', () => {
        const expr = createEqualsExpr('active', 'true');
        expect(expr.evaluate(mockContext({ active: true }))).toBe(true);
    });

    it('returns false when key is undefined (String(undefined) !== value)', () => {
        const expr = createEqualsExpr('missing', 'value');
        expect(expr.evaluate(mockContext())).toBe(false);
    });

    it('serializes to key == value', () => {
        expect(createEqualsExpr('viewType', 'editor').serialize()).toBe(
            "viewType == 'editor'",
        );
    });
});

describe('ContextKeyNotEqualsExpr', () => {
    it('returns true when value differs', () => {
        const expr = createNotEqualsExpr('viewType', 'graph');
        expect(expr.evaluate(mockContext({ viewType: 'editor' }))).toBe(true);
    });

    it('returns false when value matches', () => {
        const expr = createNotEqualsExpr('viewType', 'editor');
        expect(expr.evaluate(mockContext({ viewType: 'editor' }))).toBe(false);
    });

    it('serializes to key != value', () => {
        expect(createNotEqualsExpr('viewType', 'graph').serialize()).toBe(
            "viewType != 'graph'",
        );
    });
});

describe('ContextKeyAndExpr', () => {
    it('returns true when all operands are true', () => {
        const expr = createAndExpr([
            createDefinedExpr('a'),
            createDefinedExpr('b'),
        ]);
        expect(expr.evaluate(mockContext({ a: true, b: true }))).toBe(true);
    });

    it('returns false when any operand is false', () => {
        const expr = createAndExpr([
            createDefinedExpr('a'),
            createDefinedExpr('b'),
        ]);
        expect(expr.evaluate(mockContext({ a: true, b: false }))).toBe(false);
    });

    it('short-circuits on first false', () => {
        const spy = vi.fn(() => true);
        const spyExpr: ContextKeyExpression = {
            type: ContextKeyExprType.Defined,
            key: 'spy',
            evaluate: spy,
            serialize: () => 'spy',
        };
        const expr = createAndExpr([
            createDefinedExpr('missing'), // evaluates false
            spyExpr,
        ]);
        expr.evaluate(mockContext());
        expect(spy).not.toHaveBeenCalled();
    });

    it('serializes with && separator', () => {
        const expr = createAndExpr([
            createDefinedExpr('a'),
            createNotExpr('b'),
        ]);
        expect(expr.serialize()).toBe('a && !b');
    });
});

describe('ContextKeyOrExpr', () => {
    it('returns true when any operand is true', () => {
        const expr = createOrExpr([
            createDefinedExpr('a'),
            createDefinedExpr('b'),
        ]);
        expect(expr.evaluate(mockContext({ a: false, b: true }))).toBe(true);
    });

    it('returns false when all operands are false', () => {
        const expr = createOrExpr([
            createDefinedExpr('a'),
            createDefinedExpr('b'),
        ]);
        expect(expr.evaluate(mockContext({ a: false, b: false }))).toBe(false);
    });

    it('short-circuits on first true', () => {
        const spy = vi.fn(() => false);
        const spyExpr: ContextKeyExpression = {
            type: ContextKeyExprType.Defined,
            key: 'spy',
            evaluate: spy,
            serialize: () => 'spy',
        };
        const expr = createOrExpr([
            createDefinedExpr('present'), // evaluates true
            spyExpr,
        ]);
        expr.evaluate(mockContext({ present: true }));
        expect(spy).not.toHaveBeenCalled();
    });

    it('serializes with || separator', () => {
        const expr = createOrExpr([
            createDefinedExpr('a'),
            createDefinedExpr('b'),
        ]);
        expect(expr.serialize()).toBe('a || b');
    });
});

// ---------------------------------------------------------------------------
// deserialize() tests
// ---------------------------------------------------------------------------

describe('deserialize', () => {
    describe('simple expressions', () => {
        it('parses bare key as DefinedExpr', () => {
            const expr = deserialize('editorFocused');
            expect(expr.type).toBe(ContextKeyExprType.Defined);
            expect((expr as { key: string }).key).toBe('editorFocused');
        });

        it('parses negated key as NotExpr', () => {
            const expr = deserialize('!editorFocused');
            expect(expr.type).toBe(ContextKeyExprType.Not);
            expect((expr as { key: string }).key).toBe('editorFocused');
        });

        it('parses equality with double-quoted string', () => {
            const expr = deserialize('viewType == "editor"');
            expect(expr.type).toBe(ContextKeyExprType.Equals);
            expect((expr as { key: string; value: string }).key).toBe(
                'viewType',
            );
            expect((expr as { key: string; value: string }).value).toBe(
                'editor',
            );
        });

        it('parses equality with single-quoted string', () => {
            const expr = deserialize("viewType == 'editor'");
            expect(expr.type).toBe(ContextKeyExprType.Equals);
            expect((expr as { value: string }).value).toBe('editor');
        });

        it('parses inequality', () => {
            const expr = deserialize('viewType != "graph"');
            expect(expr.type).toBe(ContextKeyExprType.NotEquals);
            expect((expr as { key: string; value: string }).key).toBe(
                'viewType',
            );
            expect((expr as { key: string; value: string }).value).toBe(
                'graph',
            );
        });
    });

    describe('compound expressions', () => {
        it('parses AND expression', () => {
            const expr = deserialize('a && b');
            expect(expr.type).toBe(ContextKeyExprType.And);
            const and = expr as { operands: readonly ContextKeyExpression[] };
            expect(and.operands).toHaveLength(2);
        });

        it('parses OR expression', () => {
            const expr = deserialize('a || b');
            expect(expr.type).toBe(ContextKeyExprType.Or);
            const or = expr as { operands: readonly ContextKeyExpression[] };
            expect(or.operands).toHaveLength(2);
        });

        it('parses AND with negation', () => {
            const expr = deserialize('a && !b');
            expect(expr.type).toBe(ContextKeyExprType.And);
            const and = expr as { operands: readonly ContextKeyExpression[] };
            expect(and.operands[0]!.type).toBe(ContextKeyExprType.Defined);
            expect(and.operands[1]!.type).toBe(ContextKeyExprType.Not);
        });

        it('respects precedence: AND binds tighter than OR', () => {
            // a || b && c → Or(Defined(a), And(Defined(b), Defined(c)))
            const expr = deserialize('a || b && c');
            expect(expr.type).toBe(ContextKeyExprType.Or);
            const or = expr as { operands: readonly ContextKeyExpression[] };
            expect(or.operands[0]!.type).toBe(ContextKeyExprType.Defined);
            expect(or.operands[1]!.type).toBe(ContextKeyExprType.And);
        });

        it('parses mixed operators with correct precedence', () => {
            // a && b || c && d → Or(And(a,b), And(c,d))
            const expr = deserialize('a && b || c && d');
            expect(expr.type).toBe(ContextKeyExprType.Or);
            const or = expr as { operands: readonly ContextKeyExpression[] };
            expect(or.operands[0]!.type).toBe(ContextKeyExprType.And);
            expect(or.operands[1]!.type).toBe(ContextKeyExprType.And);
        });

        it('handles multiple AND operands', () => {
            const expr = deserialize('a && b && c');
            expect(expr.type).toBe(ContextKeyExprType.And);
            const and = expr as { operands: readonly ContextKeyExpression[] };
            expect(and.operands).toHaveLength(3);
        });

        it('handles multiple OR operands', () => {
            const expr = deserialize('a || b || c');
            expect(expr.type).toBe(ContextKeyExprType.Or);
            const or = expr as { operands: readonly ContextKeyExpression[] };
            expect(or.operands).toHaveLength(3);
        });
    });

    describe('parenthesized expressions', () => {
        it('parses (a || b) && c — parens override precedence', () => {
            const expr = deserialize('(a || b) && c');
            expect(expr.type).toBe(ContextKeyExprType.And);
            const and = expr as { operands: readonly ContextKeyExpression[] };
            expect(and.operands[0]!.type).toBe(ContextKeyExprType.Or);
            expect(and.operands[1]!.type).toBe(ContextKeyExprType.Defined);
        });

        it('parses nested parentheses ((a))', () => {
            const expr = deserialize('((a))');
            expect(expr.type).toBe(ContextKeyExprType.Defined);
            expect((expr as { key: string }).key).toBe('a');
        });

        it('parses !(a && b) — negation of parenthesized expression', () => {
            const expr = deserialize('!(a && b)');
            // Should negate the whole (a && b) compound
            const ctx = mockContext({ a: true, b: true });
            expect(expr.evaluate(ctx)).toBe(false);
            const ctx2 = mockContext({ a: true, b: false });
            expect(expr.evaluate(ctx2)).toBe(true);
        });

        it('parses a && (b || c) && d', () => {
            const expr = deserialize('a && (b || c) && d');
            expect(expr.type).toBe(ContextKeyExprType.And);
            const and = expr as { operands: readonly ContextKeyExpression[] };
            expect(and.operands).toHaveLength(3);
            expect(and.operands[1]!.type).toBe(ContextKeyExprType.Or);
        });
    });

    describe('realistic when clauses', () => {
        it('editorFocused && !suggestionModalRendered', () => {
            const expr = deserialize(
                'editorFocused && !suggestionModalRendered',
            );
            const ctx = mockContext({
                editorFocused: true,
                suggestionModalRendered: false,
            });
            expect(expr.evaluate(ctx)).toBe(true);
        });

        it('modalOpen || popoverOpen', () => {
            const expr = deserialize('modalOpen || popoverOpen');
            expect(
                expr.evaluate(
                    mockContext({ modalOpen: false, popoverOpen: true }),
                ),
            ).toBe(true);
            expect(
                expr.evaluate(
                    mockContext({ modalOpen: false, popoverOpen: false }),
                ),
            ).toBe(false);
        });

        it('activeViewType == "editor"', () => {
            const expr = deserialize('activeViewType == "editor"');
            expect(
                expr.evaluate(mockContext({ activeViewType: 'editor' })),
            ).toBe(true);
            expect(
                expr.evaluate(mockContext({ activeViewType: 'graph' })),
            ).toBe(false);
        });

        it('editorFocused && activeViewType != "graph"', () => {
            const expr = deserialize(
                'editorFocused && activeViewType != "graph"',
            );
            expect(
                expr.evaluate(
                    mockContext({
                        editorFocused: true,
                        activeViewType: 'editor',
                    }),
                ),
            ).toBe(true);
            expect(
                expr.evaluate(
                    mockContext({
                        editorFocused: true,
                        activeViewType: 'graph',
                    }),
                ),
            ).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('returns TrueExpr for empty string', () => {
            const expr = deserialize('');
            expect(expr.type).toBe(ContextKeyExprType.True);
            expect(expr.evaluate(mockContext())).toBe(true);
        });

        it('returns TrueExpr for whitespace-only string', () => {
            const expr = deserialize('   ');
            expect(expr.type).toBe(ContextKeyExprType.True);
        });

        it('returns false-evaluating expr for invalid input', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const expr = deserialize('@invalid');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
            warn.mockRestore();
        });

        it('handles extra whitespace between tokens', () => {
            const expr = deserialize('a  &&  b');
            expect(expr.type).toBe(ContextKeyExprType.And);
            expect(expr.evaluate(mockContext({ a: true, b: true }))).toBe(true);
        });

        it('handles string literal with spaces', () => {
            const expr = deserialize('key == "hello world"');
            expect(expr.evaluate(mockContext({ key: 'hello world' }))).toBe(
                true,
            );
        });

        it('handles keys with dots', () => {
            const expr = deserialize('view.type');
            expect(expr.type).toBe(ContextKeyExprType.Defined);
            expect((expr as { key: string }).key).toBe('view.type');
        });

        it('handles keys with hyphens', () => {
            const expr = deserialize('my-key');
            expect(expr.type).toBe(ContextKeyExprType.Defined);
            expect((expr as { key: string }).key).toBe('my-key');
        });
    });

    describe('error cases', () => {
        let warn: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        it('handles dangling && operator', () => {
            const expr = deserialize('a &&');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles dangling || operator', () => {
            const expr = deserialize('a ||');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles missing identifier after !', () => {
            const expr = deserialize('!');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles missing value after ==', () => {
            const expr = deserialize('key ==');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles unexpected token at start', () => {
            const expr = deserialize('&&');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles unclosed parenthesis', () => {
            const expr = deserialize('(a && b');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles unterminated string literal', () => {
            const expr = deserialize('key == "abc');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        it('handles extra tokens after expression', () => {
            const expr = deserialize('a b');
            expect(expr.evaluate(mockContext())).toBe(false);
            expect(warn).toHaveBeenCalled();
        });

        afterEach(() => {
            warn.mockRestore();
        });
    });

    describe('CONTEXT_KEY_TRUE sentinel', () => {
        it('is a TrueExpr', () => {
            expect(CONTEXT_KEY_TRUE.type).toBe(ContextKeyExprType.True);
        });

        it('always evaluates to true', () => {
            expect(CONTEXT_KEY_TRUE.evaluate(mockContext())).toBe(true);
        });
    });

    describe('serialize round-trip', () => {
        it('round-trips simple key', () => {
            const expr = deserialize('editorFocused');
            const re = deserialize(expr.serialize());
            expect(re.evaluate(mockContext({ editorFocused: true }))).toBe(
                true,
            );
            expect(re.evaluate(mockContext())).toBe(false);
        });

        it('round-trips negation', () => {
            const expr = deserialize('!modalOpen');
            const re = deserialize(expr.serialize());
            expect(re.evaluate(mockContext())).toBe(true);
            expect(re.evaluate(mockContext({ modalOpen: true }))).toBe(false);
        });

        it('round-trips equality', () => {
            const expr = deserialize('viewType == "editor"');
            const re = deserialize(expr.serialize());
            expect(re.evaluate(mockContext({ viewType: 'editor' }))).toBe(true);
            expect(re.evaluate(mockContext({ viewType: 'graph' }))).toBe(false);
        });

        it('round-trips compound AND', () => {
            const expr = deserialize('a && !b');
            const re = deserialize(expr.serialize());
            expect(re.evaluate(mockContext({ a: true }))).toBe(true);
            expect(re.evaluate(mockContext({ a: true, b: true }))).toBe(false);
        });

        it('round-trips compound OR', () => {
            const expr = deserialize('a || b');
            const re = deserialize(expr.serialize());
            expect(re.evaluate(mockContext({ b: true }))).toBe(true);
            expect(re.evaluate(mockContext())).toBe(false);
        });
    });
});
