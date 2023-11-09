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
const list_of = (e) => seq(
  repeat(prec.left(seq(e, ','))),
  seq(e, optional(',')),
)

module.exports = grammar({
  name: 'jenkins',

  extras: $ => [/\s/, $.comment, $.groovy_doc],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._type, $.juxt_function_call], //TODO: sort out conflict with dynamic prec
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

    _statement: $ => prec.left(PREC.STATEMENT, choice(
      $.assertion,
      $.assignment,
      $.declaration,
      $.do_while_loop,
      $.for_in_loop,
      $.for_loop,
      $.function_call,
      $.function_definition,
      $.if_statement,
      $.juxt_function_call,
      $.return,
      $.pipeline_step_with_block,
      $.try_statement,
      $.while_loop,
      alias("break", $.break),
      alias("continue", $.continue),
      // $.step,
    )),

    access_op: ($) =>
      choice(
        ...[
          [".", PREC.TOP],
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

    assertion: $ => seq('assert', $._expression),

    // TODO: multi assignment (String x, int y) = [1, 3]
    assignment: $ => prec.left(-1, choice( //??? is -1 ok here? (fixes conflict with expression for ++)
      seq(
        choice(
          $.identifier,
          $.index
        ),
        choice('=', '**=', '*=', '/=', '%=', '+=', '-=', 
          '<<=', '>>=', '>>>=', '&=', '^=', '|=', '?='),
        $._expression
      ),
      $.increment_op,
    )),

    increment_op: $ => choice(
      prec.left(PREC.UNARY, seq($._expression, "++")),
      prec.left(PREC.UNARY, seq($._expression, "--")),
      prec.right(PREC.UNARY, seq("++", $._expression)),
      prec.right(PREC.UNARY, seq("--", $._expression)),
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

    code_block: $ => seq(
      '{',
      repeat($._statement),
      optional($._expression),
      '}'
    ),

    comment: $ => choice(
      /\/\/[^\n]*/,
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    ),

    groovy_doc: $ =>
      seq('/**', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),

    declaration: $ => seq(
      choice(field('type', $._type), 'def'),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression)))
    ),

    _expression: $ => choice(
      $.access_op,
      $.binary_op,
      $.boolean_literal,
      $.function_call,
      $.identifier,
      $.increment_op,
      $.index,
      $.number_literal, //TODO: other number types
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
        $.code_block
      )),
      'while',
      '(',
      field('condition', $._expression),
      ')',
    ),

    for_loop: $ => seq(
      'for',
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
      field('body', choice(
        $._statement,
        $.code_block
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
        $.code_block
      )),
    )),

    function_call: $ =>
      prec.left(1, seq(
        field('function', $._expression),
        '(',
        field('args', optional($.argument_list)),
        ')'
      )),

    argument_list: $ =>
      prec(1, list_of(choice($.map_item, $._expression))),

    parameter_list: $ =>
      prec(1, list_of(
        $.parameter
      )),

    parameter: $ => seq(
      field('type', $._type),
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
    ),

    function_definition: $ => prec(2, seq(
      choice($._type, 'def'),
      field('function', $.identifier),
      '(',
      optional($.parameter_list),
      ')',
      $.code_block //TODO: optional return
    )),

    identifier: $ => /[$_a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00F8\u0100-\uFFFE][$_0-9a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00F8\u0100-\uFFFE]*/,
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
        $.code_block,
      )),
      optional(
        seq('else', field('else_body', choice($._statement, $.code_block)))
      )
    )),

    index: $ => prec(PREC.TOP, seq(
      $._expression,
      '[',
      $._expression,
      ']',
    )),

    juxt_function_call: $ => 
      prec.left(0, seq(
        field('function', $._expression),
        field('args', alias($._juxt_argument_list, $.argument_list)),
      )),

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
      $.code_block,
    ),
    
    pipeline_step_with_block: $ => seq(
      choice($.function_call, $.identifier),
      $.code_block,
    ),

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
        token.immediate(/[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*/),
      )
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
        $.code_block,
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
          field('catch_body', $.code_block),
        )
      ),
      optional(
        seq(
          'finally',
          field('finally_body', $.code_block),
        )
      )
    )),

    _builtintype: $ => choice(
      'int',
      'boolean',
      'char',
      'short',
      'int',
      'long',
      'float',
      'double'
    ),
    
    //TODO: array types
    _type: $ => choice($._builtintype, $._expression),

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
        $.code_block
      )),
    ),
  }
});

// TODO
// closures
// classes
