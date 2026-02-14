import React from 'react';
import { Text, TextStyle, StyleSheet, View } from 'react-native';
import theme from '../theme/theme';

interface SyntaxHighlighterProps {
    code: string;
    language?: string; // 'python', 'java', 'cpp', etc.
    fontSize?: number;
    fontFamily?: string;
}

// Colors from stitch/flashcard_study_view/code.html
const COLORS = {
    keyword: '#c678dd',   // Purple
    function: '#61afef',  // Blue
    string: '#98c379',    // Green
    comment: '#5c6370',   // Grey italic
    operator: '#56b6c2',  // Cyan
    number: '#d19a66',    // Orange
    variable: '#e06c75',  // Red/Pink (default/identifier)
    plain: '#e0def4',     // Base text color
};

type TokenType = 'keyword' | 'function' | 'string' | 'comment' | 'operator' | 'number' | 'plain';

interface Token {
    text: string;
    type: TokenType;
}

// Simple regex-based tokenizer
const tokenize = (code: string, language: string = 'python'): Token[] => {
    const tokens: Token[] = [];
    let remaining = code;

    // Regex patterns (simplified)
    const patterns = {
        comment: /^#.*/, // Python style
        string: /^(['"])(?:(?!\1)[^\\]|\\.)*\1/,
        number: /^\d+(\.\d+)?/,
        keyword: /^(def|class|return|if|else|elif|for|while|in|import|from|as|try|except|finally|with|lambda|pass|break|continue|and|or|not|is|None|True|False)\b/,
        operator: /^[+\-*/%=<>!&|^~]+/,
        function: /^[a-zA-Z_]\w*(?=\()/, // identifier followed by (
        identifier: /^[a-zA-Z_]\w*/,
        whitespace: /^\s+/,
        other: /^./,
    };

    if (language === 'cpp' || language === 'java') {
        patterns.comment = /^\/\/.*|^\/\*[\s\S]*?\*\//;
        patterns.keyword = /^(public|private|protected|class|static|void|int|float|double|char|bool|boolean|if|else|for|while|do|switch|case|default|break|continue|return|new|this|super|extends|implements|import|package|namespace|using|include|template|typename|const|virtual|override)\b/;
    }

    while (remaining.length > 0) {
        let match = null;
        let bestType: TokenType | 'whitespace' | 'other' | 'identifier' = 'other';

        // Try matches
        if ((match = remaining.match(patterns.comment))) {
            bestType = 'comment';
        } else if ((match = remaining.match(patterns.string))) {
            bestType = 'string';
        } else if ((match = remaining.match(patterns.number))) {
            bestType = 'number';
        } else if ((match = remaining.match(patterns.keyword))) {
            bestType = 'keyword';
        } else if ((match = remaining.match(patterns.function))) {
            bestType = 'function';
        } else if ((match = remaining.match(patterns.operator))) {
            bestType = 'operator';
        } else if ((match = remaining.match(patterns.identifier))) {
            bestType = 'plain'; // Identifiers are plain usually, or variable color
        } else if ((match = remaining.match(patterns.whitespace))) {
            bestType = 'whitespace';
        } else {
            match = remaining.match(patterns.other);
        }

        if (match) {
            const text = match[0];
            if (bestType !== 'whitespace') {
                tokens.push({ text, type: bestType === 'other' ? 'plain' : bestType as TokenType });
            } else {
                tokens.push({ text, type: 'plain' }); // Keep whitespace as plain tokens
            }
            remaining = remaining.slice(text.length);
        } else {
            // If no match found (should be rare given 'other' pattern but just in case), consume 1 char
            tokens.push({ text: remaining[0], type: 'plain' });
            remaining = remaining.slice(1);
        }
    }

    return tokens;
};


export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language, fontSize, fontFamily }) => {
    const tokens = tokenize(code, language);

    const baseStyle: TextStyle = {
        fontSize: fontSize || theme.typography.sizes.sm,
        fontFamily: fontFamily || theme.typography.families.mono,
        color: COLORS.plain,
        lineHeight: (fontSize || theme.typography.sizes.sm) * 1.5,
    };

    return (
        <Text style={baseStyle}>
            {tokens.map((token, index) => {
                const style: TextStyle = {};
                switch (token.type) {
                    case 'keyword': style.color = COLORS.keyword; break;
                    case 'function': style.color = COLORS.function; break;
                    case 'string': style.color = COLORS.string; break;
                    case 'comment': style.color = COLORS.comment; style.fontStyle = 'italic'; break;
                    case 'operator': style.color = COLORS.operator; break;
                    case 'number': style.color = COLORS.number; break;
                    case 'plain': default: style.color = COLORS.plain; break;
                }
                return <Text key={index} style={style}>{token.text}</Text>;
            })}
        </Text>
    );
};
