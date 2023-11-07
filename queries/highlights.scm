[
  "def"
  "pipeline"
  ; "break"
  ; "continue"
  (break)
  (continue)
  "assert"
  "return"
  "if"
  "for"
  "while"
  "in"
  "!in"
  "instanceof"
  "!instanceof"
  "as"
] @keyword

[
  "true"
  "false"
] @boolean

(null) @constant

[ "int"
  "char"
  "short"
  "long"
  "boolean"
  "float"
  "double"
] @type.builtin

(comment) @comment
(shebang) @comment
(string) @string
(string (escape_sequence) @operator)
(string (interpolation ([ "$" "{" "}" ]) @operator))
(string (interpolation) @normal)

("(") @punctuation.bracket
(")") @punctuation.bracket
("[") @punctuation.bracket
("]") @punctuation.bracket
("{") @punctuation.bracket
("}") @punctuation.bracket
(":") @punctuation.delimiter
(",") @punctuation.delimiter
(".") @punctuation.delimiter

(integer) @number
(identifier) @variable
((identifier) @constant
  (#match? @constant "^[A-Z][A-Z_]+"))

[ 
  "%" "*" "/" "+" "-" "<<" ">>" ">>>" ".." "..<" "<..<" "<.." "<"
  "<=" ">" ">=" "==" "!=" "<=>" "===" "!==" "=~" "==~" "&" "^" "|"
  "&&" "||" "?:" "+" "*" ".&" ".@" "?." "*." "*" "*:" "++" "--" "!"
] @operator

(ternary_op ([ "?" ":" ]) @operator)

(map (map_item key: (identifier) @parameter))


(declaration type: (identifier) @type)

(declaration ("=") @operator)
(assignment ("=") @operator)


(function_call 
  function: (identifier) @function)
(function_call
  function: (access_op
	  (identifier) @function . ))
(function_call (argument_list
		 (map_item key: (identifier) @parameter)))
(juxt_function_call 
  function: (identifier) @function)
(juxt_function_call
  function: (access_op
	  (identifier) @function . ))
(juxt_function_call (argument_list 
		      (map_item key: (identifier) @parameter)))

(function_definition 
  function: (identifier) @function)

"pipeline" @keyword

(section section_name: (identifier) @function.macro)
(section ("expression") @function.macro)
(section
  section_name: (function_call 
    function: (identifier) @function.macro))
(section
  section_name: (function_call
    function: (access_op
		(identifier) @function.macro)))



