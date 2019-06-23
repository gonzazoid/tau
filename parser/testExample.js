const parser = require('./parser.js');

const ast = parser.parse(`
    ( sum a b =>
      match a
      | O => O
      | S a' => sum sum a' b)

    ( sum a b =>
      match a
      | O => O
      | S a' => sum (sum a') (b) )

    ( bum x y => bum (bum x) y)
    ( S O O)
    (S(S O))

             `);

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
                if('match' in token){
                    token.closes = token.closes.map(close => {
                        close.to = tokenizer(close.to);
                        return close;
                    });
                }else{
                    token.body = tokenizer(token.body);
                    return token;
                }
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


// console.log(JSON.stringify(ast, null, '  '));
console.log(JSON.stringify(afterEffects(ast), null, '  '));
