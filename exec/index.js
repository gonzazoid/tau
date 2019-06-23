const { Scope, CGT, FuncDef, Apply, Var } = require('./ast.js');

const vars = new Scope();
vars.add('bool', [{constructorName: 'true'}, {constructorName: 'false'}]);
vars.add('not', new FuncDef([['', 'bool', true]], [new CGT('bool:1'), new CGT('bool:0')]));
vars.add('num', [{constructorName: 'O'}, {constructorName: 'S', params: [{paramName: 'pred', typeName: 'num'}]}]);
vars.add('add', new FuncDef([['a', 'num', true], ['b', 'num', false]]
                           ,[new Var('b'), new CGT('num:1'
                                                  ,[new Apply(new Var('add')
                                                             ,[new CGT('num:1:0', [new Var('a')]), new Var('b')]
                                                             )
                                                   ]
                                                  )
                            ]
                           )
        );

const notTrue  = (new Apply(new Var('not'), [new CGT('bool:0')])).resolve(vars);
const notFalse = (new Apply(new Var('not'), [new CGT('bool:1')])).resolve(vars);
console.log('not true = ', notTrue.toString(vars));
console.log('not false = ', notFalse.toString(vars));

const add_0_1 = (new Apply(new Var('add'), [new CGT('num:0'), new CGT('num:1', [new CGT('num:0')])])).resolve(vars);
console.log('add O (S O) = ', add_0_1.toString(vars));


const add_1_0 = (new Apply(new Var('add'), [new CGT('num:1', [new CGT('num:0')]), new CGT('num:0')])).resolve(vars);
console.log('add (S O) O = ', add_1_0.toString(vars));

const add_1_1 = (new Apply(new Var('add'), [new CGT('num:1', [new CGT('num:0')]), new CGT('num:1', [new CGT('num:0')])])).resolve(vars);
console.log('add (S O) (S O) = ', add_1_1.toString(vars));
