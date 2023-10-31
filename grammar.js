module.exports = grammar({
  name: 'jenkins',

  extras: $ => [/\s/, $.comment],
  rules: {
    source_file: $ => seq(
      repeat($._statement),
      optional($.pipeline_block),
    ),

    _statement: $ => choice(
      $.declaration,
      $.assignment,
      $.function_call,
    ),

    assignment: $ => seq(
      choice(
        $.identifier,
        $.index
      ),
      '=',
      $._expression
    ),

    _binary_op : $ => choice(
      prec.left(1, seq($._expression, '+', $._expression)),
      prec.left(2, seq($._expression, '*', $._expression)),
      //TODO
    ),

    comment: $ => choice(
      /\/\/[^\n]*/,
      // seq('/*', //, '*/')
    ),

    declaration: $ => seq(
      choice($._type, 'def'),
      $.identifier,
      optional(seq('=', $._expression))
    ),

    _expression: $ => choice(
      $._binary_op,
      $.identifier,
      $.index,
      $.integer, //TODO: other number types
      $.list,
      $.map,
      $.string,
      seq('(', $._expression, ')')
    ),

    //TODO: function delcarations, x[3]()
    function_call: $ => seq(
      field('function', $.identifier),
      '(',
      field('args', seq(
        repeat(prec.left(seq(
          choice($._expression, $._map_item),
          ','
        ))),
        optional(seq(
          choice($._expression, $._map_item),
          optional(',')
        )),
      )),
      ')'
    ),

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

    _map_item: $ => seq(
      field('key', choice(
        $.identifier,
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
          $._map_item,
          ',',
        ))
      ),
      $._map_item,
      optional(','),
      ']',
    ),

    //TODO: non-decimal integers
    integer: $ => /-?[0-9]+/,

    pipeline_block: $ => choice(
      seq(
        $.identifier,
        '{',
        repeat($.pipeline_block),
        '}'
      ),
      seq(
        "steps",
        '{',
        repeat($.step),
        '}'
      )
    ),

    step: $ => seq(
      $.identifier,
      $._expression
    ),
    
    //TODO: external string parser
    string: $ => seq(
      '"',
      /[^"]*/,
      '"'
    ),
    
    //TODO: array types
    _type: $ => $.identifier,

  }
});

