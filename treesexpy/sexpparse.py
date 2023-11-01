import re
from typing import List

class TokenizeError(Exception):
    pass

def tokenize(s: str):
    i = 0
    tokens = []
    current_word = ''
    while i < len(s):
        if s[i] == '(':
            if current_word:
                raise TokenizeError('expected word')
            tokens.append('(')
        elif s[i] == ')':
            if current_word:
                tokens.append(current_word)
                current_word = ''
            tokens.append(')')
        elif s[i] == ':':
            if current_word:
                tokens.append(current_word)
                current_word = ''
            tokens.append(':')
        elif re.match(r'\s', s[i]):
            if current_word:
                tokens.append(current_word)
                current_word = ''
        elif re.match(r'[a-zA-Z0-9_]', s[i]):
            current_word += s[i]
        else:
            raise TokenizeError(f'unexpected character `{s[i]}` (index {i})')
        i += 1
    return tokens

class Node:
    def __init__(self, name, label=None):
        self.name: str = name
        self.label: str | None = label
        self.children: List[Node] = []

    def __str__(self):
        if not self.children:
            if self.label:
                return f'{self.label}: ({self.name})'
            return f'({self.name})'
        else:
            s = f'{self.label}: ({self.name}' if self.label else f'({self.name}'
            for child in self.children:
                child_str = str(child)
                s += '\n' + '\n'.join('  ' + s for s in child_str.split('\n'))
            s += ')'
            return s


class ParseError(Exception):
    pass

def _parse(tokens: List[str], label: str | None = None) -> Node:
    if tokens.pop(0) != '(':
        raise ParseError('expected (')
    if not re.match(r'[a-zA-Z0-9_]+', tokens[0]):
        raise ParseError(f'expected symbol, got {tokens[0]}')
    node = Node(tokens.pop(0), label)
    next_label = None
    while tokens:
        if tokens[0] == ')':
            tokens.pop(0)
            return node
        elif tokens[0] == '(':
            node.children.append(_parse(tokens, next_label))
            next_label = None
        elif tokens[1] == ':':
            next_label = tokens.pop(0)
            tokens.pop(0)
        else:
            raise ParseError(f'unexpected token {tokens[0]}')
    raise ParseError('expected )')


# s = open('test_sexpr').read()
# print(s.__repr__())
# print(tokenize(s))
# print(parse(tokenize(s)))

def parse(sexpr: str):
    return _parse(tokenize(sexpr))

