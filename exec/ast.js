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
            throw new Error(`can't resolve ${name}`);
        }
    }
    apply(newScope){
       return new Scope(Object.assign({}, _.cloneDeep(this.scope), _.cloneDeep(newScope.scope)));
    }
};

const makeScope = function(def, argv){
    const scope = new Scope();
    def.forEach((varDesc, i) => {
        varName = varDesc[0];
        varValue = argv[i];
        scope.add(varName, varValue);
    });

    return scope;
};

class CGT {
    get type() {
        return 'cgt';
    }

    constructor(type /* string */ , params /* any token[] */){
        this.value = { constructor: type, params};
    }

    resolve(scope){
        if(this.value.params){
            this.value.params = this.value.params.map(param => param.resolve(scope));
        }
        const tokens = this.value.constructor.split(':');
        if(tokens.length === 3){
            // селектор
            const offs = parseInt(tokens[2]);
                                           // у селектора только один параметр
            return _.cloneDeep(this.value.params[0].value.params[offs]);
        }
        return _.cloneDeep(this);
    }

    getConstructorName(){
        return this.value.constructor.split(':')[0];
    }
    getConstructorOffset(){
        return parseInt(this.value.constructor.split(':')[1], 10);
    }
    get isResolved(){
        const tokens = this.value.constructor.split(':');
        if(tokens.length === 3){
            return false;
        }
        return this.value.params ? this.value.params.every(param => param.isResolved): true;
    }

    toString(scope){
        const [name, offs] = this.value.constructor.split(':');
        const constructor = scope.get(name)[parseInt(offs, 10)].constructorName;
        if('params' in this.value && this.value.params){
            const params = this.value.params.map(param => param.toString(scope));
            return `(${constructor} ${params.join('')})`;
        }else{
            return constructor;
        }
    }
};

class Apply {
    get type() {
        return 'apply';
    }

    constructor(func /* function */, params /* any token[] */){
        this.value = {func, params};
    }

    resolve(scope){

        const { params, func } = this.value;

        if(params){
            this.value.params = params.map(param => param.resolve(scope));
        }
        if(!func.isResolved){
            this.value.func = func.resolve(scope);
        }
        return _.cloneDeep(this.value.func.apply(this.value.params, scope));
    }

    get isResolved(){
        return false;
    }
};

class Var {
    get type() {
        return 'var';
    }

    constructor(name){
        this._name = name;
    }

    resolve(scope){
        return scope.get(this._name);
    }

    get isResolved(){
        return false;
    }
};

class FuncDef {
    constructor(args, closes){
        this.value = {args, closes};
    }
    get isResolved(){
        return true;
    }

    _matchTypes(args){
        if(this.value.args.length !== args.length){
            return false;
        }
        return this.value.args.every((type, i) => type[1] === args[i].getConstructorName());
    }

    _getFuctionCloseIndex(args, scope){
        const arity = args.reduce((acc, arg, i, args) => {
            acc.push(scope.get(arg.getConstructorName()).length);
            return acc;
        }, []);
        const indexes = args.reduce((acc, arg) => {
            acc.push(arg.getConstructorOffset());
            return acc;
        }, []);

        const index = indexes.reduce((acc, index, i) => {
            if(i < arity.length-1){
                acc += index*arity.slice(i+1).reduce(((acc, ar) => acc*ar), 1);
            }else{
                acc += index+1;
            }
            return acc;
        }, 0)

        return index - 1;

    }

    apply(args, scope){
        // надо бы разрезолвить аргументы
        if(!this._matchTypes(args)){
            console.log(args, this.value.args);
            throw new Error('types not match');
        }

        const closeIndex = this._getFuctionCloseIndex(args.filter((arg, i) => this.value.args[i][2]), scope);
        const close = _.cloneDeep(this.value.closes[closeIndex]);
        // здесь накладываем аргументы на скоп и делаем резолв
        const _scope = scope.apply(makeScope(this.value.args, args));
        return close.resolve(_scope);
    }
};

module.exports = { Scope, CGT, FuncDef, Apply, Var };
