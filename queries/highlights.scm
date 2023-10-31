[
  "def"
] @keyword

[
  "true"
  "false"
] @boolean

[ "int"
  "char"
  "short"
  "long"
  "boolean"
  "float"
  "double"
] @type.builtin

(binary_op ([
	     "+"
	     "*"
	    ]) @operator)


(pipeline_block . (identifier) @function.macro)
(pipeline_block . ("script") @function.macro)
(pipeline_block . (function_call name: (identifier) @function.macro))

(step step_name: (identifier) @function.macro 
      arg: (identifier) @constant
      (#eq? @function.macro "agent")
      (#any-of? @constant "any" "none"))

(step step_name: (identifier) @function.builtin)

(function_definition 
  name: (identifier) @function)
(function_call 
  name: (identifier) @function)
(function_call (map_item key_identifier: (identifier) @parameter))

(type) @type
(integer) @number
(string) @string
(comment) @comment


(map (map_item key_identifier: (identifier) @parameter))

(map_item (":") @punctuation.delimiter)
(map ("[") @punctuation.bracket)
(map ("]") @punctuation.bracket)
(map (",") @punctuation.delimiter)

(list ("[") @punctuation.bracket)
(list ("]") @punctuation.bracket)
(list (",") @punctuation.delimiter)
