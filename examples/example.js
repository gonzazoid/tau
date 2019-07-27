const parser = require('../lang/tau.js');

const sum = `
(
   ( a b =>
        ( sum a b =>
          match a
          | O => b
          | S a' => S (sum sum a' b))

        ( sum a b =>
          match a
          | O => b
          | S a' => S (sum sum a' b))
        a
        b
    )
    _
    (S O)
)
(S(S(S O)))
`;


const fst = `
    (list => match list
      | EMPTY => EMPTY
      | L x list' => x
    )
    L( S(S(S(O))) L( S(S(O)) L(S(S(S(S(O)))) EMPTY)))
`;

const bt = `
    ( a b =>
        ( bt bt' a b =>
            match a
            | O => false
            | S a' => bt' bt' bt a' b
        )
        ( bt bt' a b =>
            match a
            | O => false
            | S a' => bt' bt' bt a' b
        )
        (bt' bt a' b =>
            match b
            | O => true
            | S b' => bt bt bt' a' b'
        )
        a
        b
    )
    (S(S(S(S(O)))))
    (S(S(S(O))))

`;

const filter = `
    (list predicate =>
        ( filter filter' predicate list =>
            match list
            | EMPTY => EMPTY
            | L head tail => filter' ( filter filter filter' predicate tail ) head (predicate head) 
        )
        ( filter filter' predicate list =>
            match list
            | EMPTY => EMPTY
            | L head tail => filter' ( filter filter filter' predicate tail ) head (predicate head) 
        )
        ( list elem flag =>
            match flag
            | true => L elem list
            | false => list
        )
        predicate
        list
    )
    (L (S(S(S(O)))) (L (S(S(S(S(S(O)))))) (L (S(S(S(S(O))))) EMPTY)))
    (a =>
        ( bt bt' a b =>
            match a
            | O => false
            | S a' => bt' bt' bt a' b
        )
        ( bt bt' a b =>
            match a
            | O => false
            | S a' => bt' bt' bt a' b
        )
        (bt' bt a' b =>
            match b
            | O => true
            | S b' => bt bt bt' a' b'
        )
        (S(S(S(S(S O)))))
        a
    )
`;

const sort = `
    ( list =>
        (sort join filter lt ge list => sort sort join filter lt ge list)
        (sort join filter lt ge list =>
            match list
            | EMPTY => EMPTY
            | L head tail => join (sort sort join filter lt ge (filter tail (lt _ head))) (L head (sort sort join filter lt ge (filter tail ( ge _ head))))
        )
        (list1 list2 =>
            (join list1 list2 => join join list1 list2)
            ( join list1 list2 =>
                match list1
                | EMPTY => list2
                | L head tail => L head (join join tail list2)
            )
            list1
            list2
        )
        (list predicate =>
            ( filter filter' predicate list =>
                match list
                | EMPTY => EMPTY
                | L head tail => filter' ( filter filter filter' predicate tail ) head (predicate head) 
            )
            ( filter filter' predicate list =>
                match list
                | EMPTY => EMPTY
                | L head tail => filter' ( filter filter filter' predicate tail ) head (predicate head) 
            )
            ( list elem flag =>
                match flag
                | true => L elem list
                | false => list
            )
            predicate
            list
        )
        ( a b =>
            (lt lt' a b => lt lt lt' a b)
            ( lt lt' a b =>
                match b
                | O => false
                | S b' => lt' lt' lt a b'
            )
            (lt' lt a b' =>
                match a
                | O => true
                | S a' => lt lt lt' a' b'
            )
            a
            b
        )
        ( a b =>
            (ge ge' isZero a b => ge ge ge' isZero a b)
            ( ge ge' isZero a b =>
                match a
                | O => isZero b
                | S a' => ge' ge' ge isZero a' b
            )
            (ge' ge isZero a' b =>
                match b
                | O => true
                | S b' => ge ge ge' isZero a' b'
            )
            (x =>
                match x
                | O => true
                | S x' => false
            )
            a
            b
        )
        list
    )
    (L (S(S(S(O)))) (L (S(S(S(S(S(O)))))) (L (S(S(S(S(O))))) (L (S(S O)) EMPTY))))

`;

const src = sort;

const ast = parser.parse(src);
const result = ast.resolve();

console.log("source:\n", src);
console.log("\n______________________________\n");
console.log('result:', result.toString());
