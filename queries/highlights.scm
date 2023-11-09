[
  "!in"
  "!instanceof"
  "as"
  "assert"
  "catch"
  "def"
  "finally"
  "for"
  "if"
  "in"
  "instanceof"
  "pipeline"
  "return"
  "try"
  "while"
  (break)
  (continue)
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

(number_literal) @number
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

(pipeline_step_with_block (identifier) @function.builtin
  (#any-of? @function.builtin
    "aborted"
    "agent"
    "always"
    "axes"
    "axis"
    "changed"
    "cleanup"
    "environment"
    "fixed"
    "input"
    "matrix"
    "name"
    "options"
    "parallel"
    "parameters"
    "post"
    "regression"
    "script"
    "stage"
    "stages"
    "steps"
    "success"
    "tools"
    "triggers"
    "unstable"
    "unsuccessful"
    "values"
    "when"
   ))
(pipeline_step_with_block 
  (function_call (identifier) @function.builtin)
  (#any-of? @function.builtin
    "stage"
  ))
; (section section_name: (identifier) @function.macro)
; (section ("expression") @function.macro)
; (section
;   section_name: (function_call 
;     function: (identifier) @function.macro))
; (section
;   section_name: (function_call
;     function: (access_op
; 		(identifier) @function.macro)))



