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

(type) @type
(integer) @number
(string) @string
(comment) @comment


(declaration ("=") @operator)
(assignment ("=") @operator)


(function_call 
  name: (identifier) @function)
(function_definition 
  name: (identifier) @function)
(function_call (map_item key_identifier: (identifier) @parameter))
(function_call ("(") @punctuation.bracket)
(function_call (")") @punctuation.bracket)

(pipeline_block (pipeline_block_name (identifier) @function.macro))
(pipeline_script_block ("script") @function.macro)
(pipeline_block ("{") @punctuation.bracket)
(pipeline_block ("}") @punctuation.bracket)

(step step_name: (identifier) @function.builtin)
(step step_name: (identifier) @function.macro 
      arg: (identifier)
      (#eq? @function.macro "agent"))
(step step_name: (identifier) @function.macro
      arg: (identifier) @constant
      (#eq? @function.macro "agent")
      (#any-of? @constant "any" "none"))


(map (map_item key_identifier: (identifier) @parameter))

(map_item (":") @punctuation.delimiter)
(map ("[") @punctuation.bracket)
(map ("]") @punctuation.bracket)
(map (",") @punctuation.delimiter)

(list ("[") @punctuation.bracket)
(list ("]") @punctuation.bracket)
(list (",") @punctuation.delimiter)
