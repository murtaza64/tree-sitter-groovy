const PREC = {
  DEFAULT: 1,
  PRIORITY: 2,
  ELVIS: 3, // ?:
  OR: 4, // ||
  AND: 5, // &&
  BIN_OR: 6, // |
  BIN_XOR: 7, // ^
  BIN_AND: 8, // &
  COMPARE_EQ: 9, // == != <=> === !== =~ ==~
  COMPARE: 10, // < <= > >= in !in instanceof !instanceof as
  SHIFT: 11, // << >> >>> .. ..< <..< <..
  PLUS: 12, // + -
  STAR: 13, // * / %
  UNARY: 14, // +x -x ++x --x
  POW: 15, // **
  TOP: 16, // new () [] {} . .& .@ ?. * *. *: ~ ! (type) x[y] ++ --
  STATEMENT: 17
}

const IDENTIFIER_REGEX = /[$_a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00F8\u0100-\uFFFE][$_0-9a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00F8\u0100-\uFFFE]*/

const list_of = (e) => seq(
  repeat(prec.left(seq(e, ','))),
  seq(e, optional(',')),
)

module.exports = grammar({
  name: 'groovy',

  extras: $ => [/\s/, $.comment, $.groovy_doc],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._juxt_function_name, $._type] //TODO: dynamic precedence, heuristics? eg capital letter
  ],

  rules: {
    source_file: $ => seq(
      optional($.shebang),
      repeat($._statement),
      optional($.pipeline)
    ),

    shebang: $ => seq(
      '#!', /[^\n]*/
    ),

    _statement: $ => prec.left(PREC.STATEMENT, seq(choice(
      $.assertion,
      $.groovy_import,
      $.groovy_package,
      $.assignment,
      $.class_definition,
      $.declaration,
      $.do_while_loop,
      $.for_in_loop,
      $.for_loop,
      $.function_call,
      $.function_declaration,
      $.function_definition,
      $.if_statement,
      $.juxt_function_call,
      // $.pipeline_step_with_block,
      $.return,
      $.switch_statement,
      $.try_statement,
      $.while_loop,
      $.closure,
      alias("break", $.break),
      alias("continue", $.continue),
      // $.step,
    ), optional(';'))),

    access_op: ($) =>
      choice(
        ...[
          [".&", PREC.TOP],
          [".@", PREC.TOP],
          ["?.", PREC.TOP],
          ["*.", PREC.TOP],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq($._expression, operator, $._expression))
        ),
        ...[
          ["*", PREC.TOP],
          ["*:", PREC.TOP],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq(operator, $._expression))
        ),
      ),

    dotted_identifier: $ => seq(
      $._prefix_expression,
      '.',
      $.identifier,
    ),

    groovy_import: $ => seq(
      'import',
      optional($.modifier),
      field('import',
          choice(
            $.identifier,
            $.dotted_identifier,
            seq(choice($.identifier, $.dotted_identifier), '.*')
          )
      ),
      optional(
        seq('as', field('import_alias', $.identifier))
      )
    ),

    groovy_package: $ => seq(
        'package',
        choice($.identifier, $.dotted_identifier)
    ),

    _prefix_expression: $ => prec.left(1, choice(
      $.identifier,
      $.dotted_identifier,
      $.index,
      $.function_call,
      $.string
    )),

    annotation: $ => seq(
      '@',
      alias(token.immediate(IDENTIFIER_REGEX), $.identifier),
      optional($.argument_list),
    ),

    assertion: $ => seq('assert', $._expression),

    // TODO: multi assignment (String x, int y) = [1, 3]
    assignment: $ => prec.left(-1, choice( //??? is -1 ok here? (fixes conflict with expression for ++)
      seq(
        $._prefix_expression,
        choice('=', '**=', '*=', '/=', '%=', '+=', '-=', 
          '<<=', '>>=', '>>>=', '&=', '^=', '|=', '?='),
        $._expression
      ),
      $.increment_op,
    )),

    increment_op: $ => choice(
      prec.left(PREC.UNARY, seq($._prefix_expression, "++")),
      prec.left(PREC.UNARY, seq($._prefix_expression, "--")),
      prec.right(PREC.UNARY, seq("++", $._prefix_expression)),
      prec.right(PREC.UNARY, seq("--", $._prefix_expression)),
    ),

    binary_op: ($) =>
      choice(
        ...[
          ["%", PREC.STAR],
          ["*", PREC.STAR],
          ["/", PREC.STAR],
          ["+", PREC.PLUS],
          ["-", PREC.PLUS],
          ["<<", PREC.SHIFT],
          [">>", PREC.SHIFT],
          [">>>", PREC.SHIFT],
          ["..", PREC.SHIFT],
          ["..<", PREC.SHIFT],
          ["<..<", PREC.SHIFT],
          ["<..", PREC.SHIFT],
          ["<", PREC.COMPARE],
          ["<=", PREC.COMPARE],
          [">", PREC.COMPARE],
          [">=", PREC.COMPARE],
          ["in", PREC.COMPARE],
          ["!in", PREC.COMPARE],
          ["instanceof", PREC.COMPARE],
          ["!instanceof", PREC.COMPARE],
          ["as", PREC.COMPARE],
          ["==", PREC.COMPARE_EQ],
          ["!=", PREC.COMPARE_EQ],
          ["<=>", PREC.COMPARE_EQ],
          ["===", PREC.COMPARE_EQ],
          ["!==", PREC.COMPARE_EQ],
          ["=~", PREC.COMPARE_EQ],
          ["==~", PREC.COMPARE_EQ],
          ["&", PREC.BIN_AND],
          ["^", PREC.BIN_XOR],
          ["|", PREC.BIN_OR],
          ["&&", PREC.AND],
          ["||", PREC.OR],
          ["?:", PREC.ELVIS],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq($._expression, operator, $._expression))
        ),
        prec.right(PREC.POW, seq($._expression, "**", $._expression))
      ),

    boolean_literal: $ => choice('true', 'false'),

    class_definition: $ => seq(
      optional($.annotation),
      optional($.access_modifier),
      repeat($.modifier),
      choice('@interface', 'interface', 'class'),
      field('name', $.identifier),
      optional(field('generics', $.generic_parameters)),
      optional(seq(
        'extends',
        field('superclass', $._prefix_expression),
      )),
      field('body', $.closure),
    ),

    generic_parameters: $ => seq(
      '<',
      list_of($.generic_param),
      '>'
    ),

    generic_param: $ => seq(
      field('name', $.identifier),
      optional(seq(
        'extends',
        field('superclass', $._type),
      ))
    ),

    closure: $ => seq(
      '{',
      optional(seq($.parameter_list, '->')),
      // repeat(choice($._statement, $._expression)),
      repeat($._statement),
      optional($._expression),
      '}'
    ),

    comment: $ => choice(
      /\/\/[^\n]*/,
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*\//), // not sure why comments work better as seq
    ),

    groovy_doc: $ =>
      // seq('/**', /[^*]*\*+([^/*][^*]*\*+)*\//),
      seq(
        '/**',
        // optional(
          token.immediate(/[*\n\s]+/),
          alias(token.immediate(/[^\n\.]+[\.]?/), $.first_line),
        // ),
        repeat(
          choice(
            // /[^*\s]*(\*[^/][^*\s]+)*/
            $.groovy_doc_param,
            $.groovy_doc_throws,
            $.groovy_doc_tag,
            /([^@*]|\*[^/])([^*\s@]|[^\s\n]@|\*[^/])+/,
          ),
        ),
        '*/'
      ),

    groovy_doc_param: $ => seq (
      '@param',
      $.identifier
    ),

    groovy_doc_throws: $ => seq (
      '@throws',
      $.identifier
    ),

    groovy_doc_tag: $ => 
      /@[a-z]+/,

    declaration: $ => seq(
      optional($.annotation),
      optional($.access_modifier),
      repeat($.modifier),
      choice(field('type', $._type), 'def'),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression)))
    ),

    _expression: $ => choice(
      $.access_op,
      $.binary_op,
      $.boolean_literal,
      $.closure,
      $.dotted_identifier,
      $.function_call,
      $.identifier,
      "this",
      $.increment_op,
      $.index,
      $.number_literal,
      $.list,
      $.map,
      alias("null", $.null),
      $.string,
      $.ternary_op,
      $.unary_op,
      seq('(', $._expression, ')'),
    ),

    do_while_loop: $ => seq(
      'do',
      field('body', choice(
        $._statement,
        $.closure
      )),
      'while',
      '(',
      field('condition', $._expression),
      ')',
    ),

    for_parameters: $ => seq (
      '(',
      field('initializer', optional(seq(
        $.declaration,
        repeat(seq(',', $.assignment))
      ))),
      ';',
      field('condition', optional($._expression)),
      ';',
      field('increment', optional(seq(
        $._statement,
        repeat(seq(',', $._statement))
      ))),
      ')',
    ),
    for_loop: $ => seq(
      'for',
      $.for_parameters,
      field('body', choice(
        $._statement,
        $.closure
      )),
    ),

    for_in_loop: $ => prec(1, seq(
      'for',
      '(',
      field('variable', $.identifier),
      'in',
      field('collection', $._expression),
      ')',
      field('body', choice(
        $._statement,
        $.closure
      )),
    )),

    function_call: $ =>
      prec.left(2, seq( //higher precedence than juxt_function_call
        field('function', $._prefix_expression),
        field('args', $.argument_list),
      )),

    argument_list: $ =>
      prec(1, seq(
        '(',
        optional(
          list_of(choice($.map_item, $._expression)),
        ),
        ')',
      )),

    parameter_list: $ => prec(1, seq(
      '(',
      optional(list_of($.parameter)),
      ')'
    )),

    parameter: $ => seq(
      field('type', $._type),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
    ),

    function_declaration: $ => prec(2, seq(
      optional($.annotation),
      optional($.access_modifier),
      repeat($.modifier),
      field('type', choice($._type, 'def')),
      field('function', $.identifier),
      field('parameters', $.parameter_list),
    )),

    function_definition: $ => prec(3, seq(
      optional($.annotation),
      optional($.access_modifier),
      repeat($.modifier),
      field('type', choice($._type, 'def')),
      field('function', $.identifier),
      field('parameters', $.parameter_list),
      field('body', $.closure), //TODO: optional return
    )),

    identifier: $ => IDENTIFIER_REGEX,
    // identifier: $ => seq(
    //   choice($._letter, '$', '_'),
    //   repeat(choice($._letter, '[0-9]', '$', '_'))
    // ),
    
    if_statement: $ => prec.left(seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('body', choice(
        $._statement,
        $.closure,
      )),
      optional(
        seq('else', field('else_body', choice($._statement, $.closure)))
      )
    )),

    index: $ => prec(PREC.TOP, seq(
      $._prefix_expression,
      '[',
      $._expression,
      ']',
    )),

    juxt_function_call: $ => 
      prec.left(1, seq(
        field('function', $._juxt_function_name),
        field('args', alias($._juxt_argument_list, $.argument_list)),
      )),

    _juxt_function_name: $ => prec.left(1, $._prefix_expression),

    _juxt_argument_list: $ => prec.left(seq(
      choice($.map_item, $._expression),
      repeat(
        seq(',', choice($.map_item, $._expression)),
      )
    )),

    list: $ => prec(1, seq(
      '[',
      repeat(prec.left(seq($._expression, ','))),
      optional(seq($._expression, optional(','))),
      ']'
    )),


    map_item: $ => seq(
      field('key', choice(
        $.identifier,
        $.number_literal,
        seq('(', $._expression, ')'), //TODO: strings without parens??
      )),
      ':',
      field('value', $._expression),
    ),

    map: $ => choice(
      seq(
        '[',
        repeat(
          prec.left(seq(
            $.map_item,
            ',',
          ))
        ),
        $.map_item,
        optional(','),
        ']',
      ),
      seq('[', ':', ']'),
    ),

    number_literal: $ => choice(
      /-?[0-9]+(_[0-9]+)*[DFGILdfgil]?/,
      /-?0x[0-9a-fA-F]+(_[0-9a-fA-F]+)*[DFGILdfgil]?/,
      /-?0b[0-1]+(_[0-1]+)*[DFGILdfgil]?/,
      /-?0[0-7]+(_[0-7]+)*[DFGILdfgil]?/,
      /-?[0-9]+(_[0-9]+)*\.[0-9]+(_[0-9]+)*([eE][0-9]+)?[DFGILdfgil]?/,
    ),

    pipeline: $ => seq(
      'pipeline',
      $.closure,
    ),
    
    // pipeline_step_with_block: $ => seq(
    //   $._prefix_expression,
    //   $.closure,
    // ),

    return: $ => prec.right(1, seq('return', optional($._expression))), //??????
    
    string: $ => choice(
      $._plain_string,
      $._interpolate_string,
    ),

    _plain_string: $ => choice(
      seq(
        '\'',
        repeat(choice(
          alias(token.immediate(prec(1, /[^\\'\n]+/)), $.string_content),
          $.escape_sequence,
        )),
        '\'',
      ),
      seq(
        "'''",
        repeat(seq(
          optional(alias(token.immediate(prec(0, /[']{1,2}/)), $.string_internal_quote)),
          choice(
            alias(token.immediate(prec(1, /([^$\\']|[']{1,2}[^'$\\])+/)), $.string_content),
            seq(
              optional(/[']{1,2}/), // edge case: these wont be in string_content
              $.escape_sequence,
            ),
          ))),
        "'''",
      ),
    ),

    _interpolate_string: $ => choice(
      seq(
        '"',
        repeat(choice(
          alias(token.immediate(prec(1, /[^$\\"\n]+/)), $.string_content),
          $.escape_sequence,
          $.interpolation,
        )),
        '"',
      ),
      seq(
        '"""',
        repeat(seq(
          // optional(alias(token.immediate(prec(0, /["]{1,2}/)), $.string_internal_quote)),
          choice(
            alias(token.immediate(prec(1, /([^$\\"]|["]{1,2}[^"$\\])+/)), $.string_content),
            seq(
              optional(/["]{1,2}/), // edge case: these wont be in string_content
              $.escape_sequence,
            ),
            seq(
              optional(/["]{1,2}/),
              $.interpolation,
            ),
          ))),
        '"""',
      ),
      seq( // slashy string, only slashes can be escaped
        '/',
        repeat1(choice(
          alias(token.immediate(prec(1, /[^$\\\/]+/)), $.string_content),
          alias('\\/', $.escape_sequence),
          $.interpolation,
        )),
        '/',
      ),
      seq( // dollar slashy string
        '$/',
        repeat(choice(
          alias(token.immediate(prec(1, 
            /([^$\/]|\/[^$]|\$[^\/$a-zA-Z{])+/
          )), $.string_content),
          alias('$/', $.escape_sequence),
          alias('$$', $.escape_sequence),
          // alias(//, $.string_content),
          $.interpolation,
        )),
        '/$',
      ),
    ),

    escape_sequence: _ => token(prec(1, seq(
      '\\',
      choice(
        /[$bfnrst\\'"\n]/,
        /u[0-9a-fA-F]{4}/,
      ),
    ))),

    
    interpolation: $ => seq(
      '$',
      choice(
        seq(
          '{',
          $._expression,
          '}',
        ),
        alias(token.immediate(/[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*/), $.identifier),
      )
    ),

    switch_statement: $ => seq(
      'switch',
      '(',
      field('value', $._expression),
      ')',
      field('body', $.switch_block),
    ),

    switch_block: $ => seq(
      '{',
      repeat($.case),
      '}'
    ),

    case: $ => seq(
      choice(
        seq('case', field('value', $._expression), ':'),
        seq('default', ':'),
      ),
      repeat($._statement)
    ),

    ternary_op: $ => prec.right(seq(
      field('condition', $._expression),
      '?',
      field('then', $._expression),
      ':',
      field('else', $._expression),
    )),

    try_statement: $ => prec.left(seq(
      'try',
      field('body', choice(
        $._statement,
        $.closure,
      )),
      optional(
        seq(
          'catch',
          '(',
          field(
            'catch_exception',
            choice(
              $.declaration,
              $._expression
            ),
          ), //TODO multi-catch
          ')',
          field('catch_body', $.closure),
        )
      ),
      optional(
        seq(
          'finally',
          field('finally_body', $.closure),
        )
      )
    )),

    builtintype: $ => choice(
      'int',
      'boolean',
      'char',
      'short',
      'int',
      'long',
      'float',
      'double',
      'void',
    ),
    
    _type: $ => prec.left(1, choice(
      $.builtintype,
      $._prefix_expression,
      $.array_type, //TODO: int[5]?
      $.type_with_generics,
    )),

    array_type: $ => seq($._type, '[]'),

    access_modifier: $ => choice(
      'public',
      'protected',
      'private'
    ),

    modifier: $ => choice(
      'static',
      'final',
      'synchronized'
    ),

    //TODO diamond operator
    type_with_generics: $ => seq($._type, $.generics),

    generics: $ => seq('<', list_of($._type), '>'),

    unary_op: $ => 
      choice(
        ...[
          ["+", PREC.UNARY],
          ["-", PREC.UNARY],
          ["~", PREC.TOP],
          ["!", PREC.TOP],
          ["new", PREC.TOP],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq(operator, $._expression))
        ),
      ),

    while_loop: $ => seq(
      'while',
      '(',
      field('condition', $._expression),
      ')',
      field('body', choice(
        $._statement,
        $.closure
      )),
    ),
  }
});

// TODO
// closures cleanup
// highlight jenkins words
// import
// package and other keywords
// function declaration
