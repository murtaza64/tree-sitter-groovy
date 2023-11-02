const PREC = {
  DEFAULT: 1,
  PRIORITY: 2,
  OR: 3, // ||
  AND: 4, // &&
  BIN_OR: 5, // |
  BIN_XOR: 6, // ^
  BIN_AND: 7, // &
  COMPARE_EQ: 8, // == != <=> === !== =~ ==~
  COMPARE: 9, // < <= > >= in !in instanceof !instanceof as
  SHIFT: 10, // << >> >>> .. ..< <..< <..
  PLUS: 11, // + -
  STAR: 12, // * / %
  UNARY: 13, // +x -x ++x --x
  POW: 14, // **
  TOP: 15, // new () [] {} . .& .@ ?. * *. *: ~ ! (type) x[y] ++ --
  STATEMENT: 16
}
module.exports = grammar({
  name: 'jenkins',

  extras: $ => [/\s/, $.comment, $.groovy_doc],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(
      repeat($._statement),
      optional($.pipeline_top_block)
    ),

    _statement: $ => prec.left(PREC.STATEMENT, choice(
      $.declaration,
      $.assignment,
      $.function_call,
      $.function_definition,
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
          ["*.", PREC.TOP],
          ["*:", PREC.TOP],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq(operator, $._expression))
        ),
      ),

    // TODO: +=, *= etc
    assignment: $ => seq(
      choice(
        $.identifier,
        $.index
      ),
      '=',
      $._expression
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
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq($._expression, operator, $._expression))
        ),
        prec.right(PREC.POW, seq($._expression, "**", $._expression))
      ),

    boolean_literal: $ => choice('true', 'false'),

    code_block: $ => seq(
      '{',
      repeat($._statement),
      '}'
    ),

    comment: $ => choice(
      /\/\/[^\n]*/,
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    ),

    groovy_doc: $ =>
      seq('/**', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),

    declaration: $ => seq(
      choice($.type, 'def'),
      $.identifier,
      optional(seq('=', $._expression))
    ),

    _expression: $ => choice(
      $.access_op,
      $.binary_op,
      $.boolean_literal,
      $.function_call,
      $.identifier,
      $.index,
      $.integer, //TODO: other number types
      $.list,
      $.map,
      $.string,
      $.unary_op,
      seq('(', $._expression, ')')
    ),

    //TODO: function delcarations, x[3]()
    function_call: $ => prec.left(PREC.PRIORITY, seq(
      field('name', $._expression),
      '(',
      field('args', seq(
        repeat(prec.left(seq(
          choice($._expression, field('named_param', $.map_item)),
          ','
        ))),
        optional(seq(
          choice($._expression, field('named_param', $.map_item)),
          optional(',')
        )),
      )),
      ')'
    )),

    function_definition: $ => prec(2, seq(
      choice($.type, 'def'),
      field('name', $.identifier),
      '(',
      optional(seq(
        $.type,
        $.identifier,
        optional(seq('=', $._expression)),
      )),
      repeat(seq(
        $.type,
        $.identifier,
        optional(seq('=', $._expression)),
        ',',
      )),
      optional(','),
      ')',
      $.code_block
    )),

    identifier: $ => /[$_a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00F8\u0100-\uFFFE][$_0-9a-zA-Z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00F8\u0100-\uFFFE]*/,
    // identifier: $ => seq(
    //   choice($._letter, '$', '_'),
    //   repeat(choice($._letter, '[0-9]', '$', '_'))
    // ),

    index: $ => prec(1, seq(
      $._expression,
      '[',
      $._expression,
      ']',
    )),

    list: $ => prec(1, seq(
      '[',
      repeat(prec.left(seq($._expression, ','))),
      optional(seq($._expression, optional(','))),
      ']'
    )),

    map_item: $ => seq(
      field('key', choice(
        field('key_identifier', $.identifier),
        $.integer,
        seq('(', $._expression, ')'), //TODO: strings without parens??
      )),
      ':',
      field('value', $._expression),
    ),

    map: $ => seq(
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

    //TODO: non-decimal integers
    integer: $ => /-?[0-9]+/,

    pipeline_block_name: $ => choice(
      $.identifier,
      seq(
        $.identifier,
        '(',
        repeat(prec.left(seq($._expression, ','))),
        optional(seq($._expression, optional(','))),
        ')'
      )
    ),

    pipeline_block: $ => seq(
      field('block_name', $.pipeline_block_name),
      '{',
      repeat(choice(
        $.pipeline_block,
        // $.oneline_directive,
        $.pipeline_script_block,
        $.step,
        // $._statement,
      )),
      '}'
    ),

    pipeline_top_block: $ => seq(
      'pipeline',
      '{',
      repeat(choice(
        $.pipeline_block,
        // $.oneline_directive,
        $.pipeline_script_block,
        $.step,
        // $._statement,
      )),
      '}'
    ),
    
    pipeline_script_block: $ => seq(
      'script',
      '{',
      repeat(choice(
        $._statement,
        $.step
      )),
      '}'
    ),

    step: $ => seq(
      field('step_name', $.identifier),
      field('arg', choice(
        $._expression,
        prec(PREC.PRIORITY, seq(
          repeat(
            prec.left(seq(
              $.map_item,
              ',',
            ))
          ),
          $.map_item,
          optional(','),
        )),
      )),
    ),
    
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
        /[$bfnrst\\'"]/,
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
    type: $ => choice($._builtintype, $.identifier),

    unary_op: $ => 
      choice(
        ...[
          ["+", PREC.UNARY],
          ["-", PREC.UNARY],
          ["++", PREC.UNARY],
          ["--", PREC.UNARY],
          ["~", PREC.TOP],
          ["!", PREC.TOP],
          ["new", PREC.TOP],
        ].map(([operator, precedence]) =>
          prec.left(precedence, seq(operator, $._expression))
        ),
      ),
  }
});

// TODO
// closures
// classes
// keywords
