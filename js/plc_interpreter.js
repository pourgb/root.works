const TokenType = {
    IDENTIFIER: 'IDENTIFIER',
    NUMBER: 'NUMBER',
    IF: 'IF',
    THEN: 'THEN',
    ELSE: 'ELSE',
    ENDIF: 'ENDIF',
    IN: 'IN',
    OUT: 'OUT',
    AND: 'AND',
    OR: 'OR',
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    MUL: 'MUL',
    DIV: 'DIV',
    ASSIGN: 'ASSIGN',
    EQ: 'EQ',
    NEQ: 'NEQ',
    LT: 'LT',
    GT: 'GT',
    LTE: 'LTE',
    GTE: 'GTE',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    EOF: 'EOF'
};

const KEYWORDS = {
    'IF': TokenType.IF,
    'THEN': TokenType.THEN,
    'ELSE': TokenType.ELSE,
    'ENDIF': TokenType.ENDIF,
    'IN': TokenType.IN,
    'OUT': TokenType.OUT,
    'AND': TokenType.AND,
    'OR': TokenType.OR
};

export class PLCLexer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.currentChar = this.input.length > 0 ? this.input[0] : null;
    }

    advance() {
        this.pos++;
        if (this.pos > this.input.length - 1) {
            this.currentChar = null;
        } else {
            this.currentChar = this.input[this.pos];
        }
    }

    skipWhitespace() {
        while (this.currentChar !== null && /\s/.test(this.currentChar)) {
            this.advance();
        }
    }

    skipComment() {
        while (this.currentChar !== null && this.currentChar !== '\n') {
            this.advance();
        }
        this.advance();
    }

    number() {
        let result = '';
        while (this.currentChar !== null && /[0-9\.]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }
        return { type: TokenType.NUMBER, value: parseFloat(result) };
    }

    identifier() {
        let result = '';
        while (this.currentChar !== null && /[a-zA-Z0-9_]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
        }
        let type = KEYWORDS[result.toUpperCase()] || TokenType.IDENTIFIER;
        return { type: type, value: result };
    }

    getNextToken() {
        while (this.currentChar !== null) {
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }

            if (this.currentChar === '/' && this.input[this.pos + 1] === '/') {
                this.skipComment();
                continue;
            }

            if (/[0-9]/.test(this.currentChar)) {
                return this.number();
            }

            if (/[a-zA-Z_]/.test(this.currentChar)) {
                return this.identifier();
            }

            if (this.currentChar === '=') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return { type: TokenType.EQ, value: '==' };
                }
                return { type: TokenType.ASSIGN, value: '=' };
            }

            if (this.currentChar === '!') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return { type: TokenType.NEQ, value: '!=' };
                }
                throw new Error("Invalid character: !");
            }

            if (this.currentChar === '<') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return { type: TokenType.LTE, value: '<=' };
                }
                return { type: TokenType.LT, value: '<' };
            }

            if (this.currentChar === '>') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return { type: TokenType.GTE, value: '>=' };
                }
                return { type: TokenType.GT, value: '>' };
            }

            if (this.currentChar === '+') {
                this.advance();
                return { type: TokenType.PLUS, value: '+' };
            }
            if (this.currentChar === '-') {
                this.advance();
                return { type: TokenType.MINUS, value: '-' };
            }
            if (this.currentChar === '*') {
                this.advance();
                return { type: TokenType.MUL, value: '*' };
            }
            if (this.currentChar === '/') {
                this.advance();
                return { type: TokenType.DIV, value: '/' };
            }
            if (this.currentChar === '(') {
                this.advance();
                return { type: TokenType.LPAREN, value: '(' };
            }
            if (this.currentChar === ')') {
                this.advance();
                return { type: TokenType.RPAREN, value: ')' };
            }

            throw new Error(`Unknown character: ${this.currentChar} at pos ${this.pos}`);
        }
        return { type: TokenType.EOF, value: null };
    }
}

export class PLCParser {
    constructor(lexer) {
        this.lexer = lexer;
        this.currentToken = this.lexer.getNextToken();
    }

    eat(tokenType) {
        if (this.currentToken.type === tokenType) {
            this.currentToken = this.lexer.getNextToken();
        } else {
            throw new Error(`Expected ${tokenType}, got ${this.currentToken.type}`);
        }
    }

    factor() {
        let token = this.currentToken;
        if (token.type === TokenType.NUMBER) {
            this.eat(TokenType.NUMBER);
            return { type: 'Number', value: token.value };
        } else if (token.type === TokenType.IDENTIFIER) {
            this.eat(TokenType.IDENTIFIER);
            return { type: 'Variable', name: token.value };
        } else if (token.type === TokenType.IN) {
            this.eat(TokenType.IN);
            this.eat(TokenType.LPAREN);
            let idExpr = this.expr();
            this.eat(TokenType.RPAREN);
            return { type: 'InCall', idExpr: idExpr };
        } else if (token.type === TokenType.LPAREN) {
            this.eat(TokenType.LPAREN);
            let node = this.expr();
            this.eat(TokenType.RPAREN);
            return node;
        }
        throw new Error(`Unexpected token in factor: ${token.type}`);
    }

    term() {
        let node = this.factor();
        while (this.currentToken.type === TokenType.MUL || this.currentToken.type === TokenType.DIV) {
            let token = this.currentToken;
            if (token.type === TokenType.MUL) {
                this.eat(TokenType.MUL);
            } else if (token.type === TokenType.DIV) {
                this.eat(TokenType.DIV);
            }
            node = { type: 'BinOp', left: node, op: token.type, right: this.factor() };
        }
        return node;
    }

    arithmeticExpr() {
        let node = this.term();
        while (this.currentToken.type === TokenType.PLUS || this.currentToken.type === TokenType.MINUS) {
            let token = this.currentToken;
            if (token.type === TokenType.PLUS) {
                this.eat(TokenType.PLUS);
            } else if (token.type === TokenType.MINUS) {
                this.eat(TokenType.MINUS);
            }
            node = { type: 'BinOp', left: node, op: token.type, right: this.term() };
        }
        return node;
    }

    comparisonExpr() {
        let node = this.arithmeticExpr();
        if ([TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.LTE, TokenType.GT, TokenType.GTE].includes(this.currentToken.type)) {
            let token = this.currentToken;
            this.eat(token.type);
            node = { type: 'BinOp', left: node, op: token.type, right: this.arithmeticExpr() };
        }
        return node;
    }

    expr() {
        let node = this.comparisonExpr();
        while (this.currentToken.type === TokenType.AND || this.currentToken.type === TokenType.OR) {
            let token = this.currentToken;
            this.eat(token.type);
            node = { type: 'BinOp', left: node, op: token.type, right: this.comparisonExpr() };
        }
        return node;
    }

    assignment() {
        if (this.currentToken.type === TokenType.OUT) {
            this.eat(TokenType.OUT);
            this.eat(TokenType.LPAREN);
            let idExpr = this.expr();
            this.eat(TokenType.RPAREN);
            this.eat(TokenType.ASSIGN);
            let right = this.expr();
            return { type: 'OutAssign', idExpr: idExpr, right: right };
        } else {
            let varName = this.currentToken.value;
            this.eat(TokenType.IDENTIFIER);
            this.eat(TokenType.ASSIGN);
            let right = this.expr();
            return { type: 'Assign', name: varName, right: right };
        }
    }

    ifStatement() {
        this.eat(TokenType.IF);
        let condition = this.expr();
        this.eat(TokenType.THEN);
        let trueBranch = this.statementList(TokenType.ELSE, TokenType.ENDIF);
        let falseBranch = [];
        if (this.currentToken.type === TokenType.ELSE) {
            this.eat(TokenType.ELSE);
            falseBranch = this.statementList(TokenType.ENDIF);
        }
        this.eat(TokenType.ENDIF);
        return { type: 'If', condition: condition, trueBranch: trueBranch, falseBranch: falseBranch };
    }

    statement() {
        if (this.currentToken.type === TokenType.IF) {
            return this.ifStatement();
        } else {
            return this.assignment();
        }
    }

    statementList(...stopTokens) {
        let results = [];
        while (this.currentToken.type !== TokenType.EOF && !stopTokens.includes(this.currentToken.type)) {
            results.push(this.statement());
        }
        return results;
    }

    parse() {
        return this.statementList();
    }
}

export class PLCInterpreter {
    evalExpr(node, context) {
        if (node.type === 'Number') return node.value;
        if (node.type === 'Variable') return context.env[node.name] || 0;
        if (node.type === 'InCall') {
            let id = this.evalExpr(node.idExpr, context);
            return context.inputs[id] || 0;
        }
        if (node.type === 'BinOp') {
            let left = this.evalExpr(node.left, context);
            let right = this.evalExpr(node.right, context);
            switch (node.op) {
                case TokenType.PLUS: return left + right;
                case TokenType.MINUS: return left - right;
                case TokenType.MUL: return left * right;
                case TokenType.DIV: return right !== 0 ? left / right : 0;
                case TokenType.EQ: return left === right ? 1 : 0;
                case TokenType.NEQ: return left !== right ? 1 : 0;
                case TokenType.LT: return left < right ? 1 : 0;
                case TokenType.LTE: return left <= right ? 1 : 0;
                case TokenType.GT: return left > right ? 1 : 0;
                case TokenType.GTE: return left >= right ? 1 : 0;
                case TokenType.AND: return (left !== 0 && right !== 0) ? 1 : 0;
                case TokenType.OR: return (left !== 0 || right !== 0) ? 1 : 0;
            }
        }
        throw new Error(`Unknown node type: ${node.type}`);
    }

    evalStatement(node, context) {
        if (node.type === 'Assign') {
            context.env[node.name] = this.evalExpr(node.right, context);
        } else if (node.type === 'OutAssign') {
            let id = this.evalExpr(node.idExpr, context);
            context.outputs[id] = this.evalExpr(node.right, context);
        } else if (node.type === 'If') {
            let cond = this.evalExpr(node.condition, context);
            if (cond !== 0) {
                this.evalStatements(node.trueBranch, context);
            } else {
                this.evalStatements(node.falseBranch, context);
            }
        }
    }

    evalStatements(nodes, context) {
        for (let node of nodes) {
            this.evalStatement(node, context);
        }
    }

    execute(ast, context) {
        this.evalStatements(ast, context);
    }
}
