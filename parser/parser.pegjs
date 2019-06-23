{

  function makeId(chars) {
    return {type: 'ID', value: [chars[0], ...chars[1]].join('')};
  }

  function makeFunc(args, body){
    return Array.isArray(body) ? {type: 'FDEF', match: body[1], closes: body[2]} : {type: 'FDEF', args, body};
  }

  function makeClose(from, to){
    return {type: 'CLOSE', from, to};
  }

  function cleanSeq(match){
    const expose = function(seq){
        const res = seq.reduce((tokens, token) => {
            if(Array.isArray(token)){
                return tokens.concat(expose(token));
            }else{
                if(token.type === 'SEQ'){
                    return tokens.concat(expose(token.value));
                }else{
                    tokens.push(token);
                }
                return tokens;
            }
        }, []);
        return res;
    };

    const res = [match[0], ...match[1]]
                    .filter(token => !('type' in token && token.type === 'SPACE'))
                    .filter(token => !('type' in token && token.type === 'SEQ' && token.value.length === 0));
    return res.length === 1 ? res[0] : {type: 'SEQ', value: expose(res)};

  }

  function makeList(_list){
    if(('type' in _list) && _list.type === 'SEQ'){
        return {type: 'LIST', value: _list.value};
    }
    if(Array.isArray(_list) && _list.length === 1){
        return _list[0];
    }

    return {type: 'LIST', value: _list};

  }

}

start = seq

id = space* chars:([a-zA-Z_][a-zA-Z_0-9']*) space* { return makeId(chars); }
ids = id+

fdef = "(" space* args:ids space* "=>" body: ((fmatch id  fclose+) / seq) ")" { return makeFunc(args, body); }
fmatch = space* "match" space+ { return 'match'; }
fclose = "|" space* from:ids "=>" space* to:seq space* { return makeClose(from, to); }

seq = match: ( e:expr s:seq* ) { return cleanSeq(match); }
list = "(" s:seq ")" { return makeList(s); }
expr
    = seq:ids { return cleanSeq([[], seq]); }
    / list 
    / space+ { return {type: 'SPACE'}; }
    / fdef

space = [ \t\n\r]
