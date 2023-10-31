module.exports = grammar({
  name: 'jenkins',

  extras: $ => [/\s/, $.comment],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(
      repeat($._statement),
      optional($.pipeline_block),
    ),

    _statement: $ => choice(
      $.declaration,
      $.assignment,
      $.function_call,
      $.function_definition,
    ),

    assignment: $ => seq(
      choice(
        $.identifier,
        $.index
      ),
      '=',
      $._expression
    ),

    binary_op : $ => choice(
      prec.left(1, seq($._expression, '+', $._expression)),
      prec.left(2, seq($._expression, '*', $._expression)),
      //TODO
    ),

    boolean_literal: $ => choice('true', 'false'),

    code_block: $ => seq(
      '{',
      repeat($._statement),
      '}'
    ),

    comment: $ => choice(
      /\/\/[^\n]*/,
      // seq('/*', //, '*/')
    ),

    declaration: $ => seq(
      choice($.type, 'def'),
      $.identifier,
      optional(seq('=', $._expression))
    ),

    _expression: $ => choice(
      $.binary_op,
      $.identifier,
      $.index,
      $.integer, //TODO: other number types
      $.boolean_literal,
      $.list,
      $.map,
      $.string,
      seq('(', $._expression, ')')
    ),

    //TODO: function delcarations, x[3]()
    function_call: $ => seq(
      field('name', $.identifier),
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
    ),

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

    pipeline_block: $ => choice(
      seq(
        field('section_name', choice($.identifier, $.function_call)),
        '{',
        repeat(choice(
          $.pipeline_block,
          // $.oneline_directive,
          $.step,
        )),
        '}'
      ),
      seq(
        field('section_name', 'script'),
        '{',
        repeat($._statement),
        '}'
      )
    ),

    oneline_directive: $ => seq($.identifier, $.identifier),

    step: $ => seq(
      field('step_name', $.identifier),
      field('arg', $._expression)
    ),
    
    //TODO: external string parser
    string: $ => seq(
      '"',
      /[^"]*/,
      '"'
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

  }
});

