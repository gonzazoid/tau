const parser = require('./parser.js');
const { Scope, makeScope, Apply, ID, FuncDef, Close, FuncComp} = require('./ast.js');

const afterEffects = ast => {
    const tokenizer = token => {
        switch(token.type){
            case 'SEQ':
            case 'LIST':
                if(token.value.length > 1){
                    return {type: 'APPLY', func: afterEffects(token.value[0]), argv: afterEffects(token.value.slice(1))};
                }else{
                    return afterEffects(token.value[0]);
                }
            case 'FDEF':
                token.closes = token.closes.map(close => {
                    close.to = tokenizer(close.to);
                    return close;
                });
                return token;
            case 'FCOMP':
                token.body = tokenizer(token.body);
                return token;
            default:
                return token;
        }
    }
    if(Array.isArray(ast)){
        return ast.map(tokenizer);
    }else{
        return tokenizer(ast);
    }
};

const translate = function(ast){
    switch(ast.type){
        case 'ID':
            return new ID(ast.value);
        case 'FDEF':
            return new FuncDef(ast.args.map(translate), translate(ast.match), ast.closes.map(translate));
        case 'CLOSE':
            return new Close(ast.from.map(translate), translate(ast.to));
        case 'FCOMP':
            return new FuncComp(ast.args.map(translate), translate(ast.body));
        case 'APPLY':
            return new Apply(translate(ast.func), ast.argv.map(translate));
    }
};

exports.parse = function(src){
    const ast = parser.parse(src);
    const objectAST = afterEffects(ast);
    return translate(objectAST);
};
