const _ = require('lodash');  

class Scope {
    constructor(scope){
        this.scope = scope ? scope : {};
    }

    add(name, value){
        this.scope[name] = _.cloneDeep(value);
    }

    get(name){
        if(name in this.scope){
            return _.cloneDeep(this.scope[name]);
        }else{
            return undefined;
        }
    }

    apply(newScope){
       return new Scope(Object.assign({}, _.cloneDeep(this.scope), _.cloneDeep(newScope.scope)));
    }

    clone(){
        return _.cloneDeep(this);
    }
}

const makeScope = function(ids, argv){
    const scope = new Scope();
    ids.forEach((id, i) => {
        varName = id.name;
        varValue = argv[i];
        scope.add(varName, varValue);
    });

    return scope;
}

class Apply {

    constructor(func, params){
        this.value = {func, params};
    }

    get type() {
        return 'APPLY';
    }

    get params() {
        return this.value.params;
    }

    get func(){
        return this.value.func;
    }

    get arity(){
        return this.func.arity;
    }

    resolve(scope){

        const { params, func } = this.value;

        if(scope){
            this.value.params = params.map(param => param.isResolved ? param : param.resolve(scope));
        }

        if(!func.isResolved){
            this.value.func = func.resolve(scope);
        }

        if(!this.value.func.isResolved){
            // CGT!!!
            return this;
        }

        return _.cloneDeep(this.value.func.apply(this.value.params));
    }

    get isResolved(){
        return false;
    }

    toString(){
        return `(${'name' in this.value.func ? this.value.func.name : this.value.func.toString()}  ${this.value.params.map(param => param.toString()).join(' ')})`;
    }
}

class Close {

    constructor(from, to){
        this.value = {from, to};
    }

    get from(){
        return this.value.from;
    }

    get to(){
        return this.value.to;
    }

    resolve(scope, match){

        const { from, to } = this.value;

        if(from.length === 1){
            const _res = to.resolve(scope);
            return _res;
        }else{
            // добавим в скоп переменные деструктора
            // match должен быть APPLY
            const argv = match.params;
            const newScope = scope.clone();
            from.slice(1).forEach((id, index) => {
                newScope.add(id.name, argv[index])
            });
            const res = to.resolve(newScope);
            return res;

        }
        
    }

}
// v2
class ID {

    constructor(name){
        this._name = name;
    }

    get type() {
        return 'ID';
    }

    get name(){
        return this._name;
    }

    resolve(scope){
        if(!scope){
            return this;
        }

        const res = scope.get(this._name);
        return res === undefined ? this : res;
    }

    get isResolved(){
        return false;
    }

    toString(){
        return this._name;
    }
}

class FuncDef {
    constructor(args, match, closes){
        this.value = {args, match, closes};
    }

    get arity(){
        return this.value.args.length;
    }

    get isResolved(){
        return true;
    }

    _matchTypes(args){
        return this.value.args.length >= args.length;
    }

    resolveMatch(args){
        return this.value.match.resolve(args);
    }

    _getFuctionClose(args){
        // находим индекс match в списке аргументов
        // по этому индексу находим value соотв. аргумента
        const matter = this.resolveMatch(args);
        // должен быть либо apply либо ID
        let res;
        switch(matter.type){
            case 'APPLY':
                // CGT имя контруктора - в ID функции
                res = this.value.closes.filter(close => close.from[0].name === matter.func.name && close.from.length === (matter.params.length +1));
                if(res.length === 1){
                    return res[0];
                }else{
                    throw new Error(`Function not defined on symbol ${matter.func.name}`);
                }
                break;
            case 'ID':
                // CGT без параметров
                // то есть соотв. close должен в поле from содержать только один ID и его value должно совпадать с исследуемым
                // в close.from могут быть только ID, так что тип не проверяем
                res = this.value.closes.filter(close => close.from.length === 1 && close.from[0].name === matter.name);
                if(res.length === 1){
                    return res[0];
                }else{
                    throw new Error('');
                }
                break;
            default:
                    throw new Error('');
        }
    }

    resolve(scope){
        return this;
    }

    apply(argv){
        if(!this._matchTypes(argv)){
            throw new Error('types not match');
        }

        const scope = makeScope(this.value.args, argv);
        const _close = this._getFuctionClose(scope);
        const close = _.cloneDeep(_close); // не уверен что нужно
        const match = this.resolveMatch(scope);
        return close.resolve(scope, match);
    }

    toString(){
        return 'fdef';
    }
}

class FuncComp {
    constructor(args, body){
        this.value = {args, body };
    }

    get type() {
        return 'FCOMP';
    }

    get isResolved(){
        return true;
    }

    get arity(){
        return this.value.body.arity;
    }

    isJoker(arg){
        return arg.type === 'ID' && arg.name === '_';
    }

    isPartial(argv){
        return argv.length < this.value.args || argv.some(arg => this.isJoker(arg));
    }

    _matchArity(argv){
        return this.value.args.length >= argv.length;
    }

    apply(argv){
        if(!this._matchArity(argv)){
            throw new Error('arity not match');
        }
        if(this.isPartial(argv)){
            // возвращаем новую FuncComp
            // из аргументов удаляем все, что не указано в вызове либо указано как _
            // в body проставляем все что указано в вызове
            const newArgs = this.value.args.filter((arg, i) => i >= argv.length || this.isJoker(argv[i]));
            const indexes = argv.map((arg, i) => this.isJoker(arg) ? -1 : i).filter(i => i >=0);
            const names = indexes.map(index => this.value.args[index].name);
            const params = this.value.body.value.params.map(param => param.type === 'ID' && names.includes(param.name) ? argv[indexes[names.indexOf(param.name)]] : param)
            return new FuncComp(_.cloneDeep(newArgs), new Apply(_.cloneDeep(this.value.body.value.func), params.map(_.cloneDeep)));
        }else{
            const scope = makeScope(this.value.args, argv);
            // body может быть только apply
            return this.value.body.resolve(scope);
        }
    }

    toString(){
        return `${this.value.args.map(arg => arg.name).join(' ')} => ${this.value.body.toString()}`;
    }
}

module.exports = { Scope, makeScope, ID, Apply, FuncDef, Close, FuncComp };
