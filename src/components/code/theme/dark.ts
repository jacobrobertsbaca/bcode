import {tags as t} from '@lezer/highlight';
import { createTheme } from 'thememirror';

// Author: Joe Bergantine
export const dark = createTheme({
	variant: 'dark',
	settings: {
		background: '#141414',
		foreground: '#E6E1C4',
		caret: '#E6E1C4',
		selection: '#16120E',
		gutterBackground: '#141414',
		gutterForeground: '#b8c2cc90',
		lineHighlight: '#8a91991a',
	},
	styles: [
		{
			tag: t.comment,
			color: '#787b8099',
		},
		{
			tag: [t.keyword, t.operator, t.derefOperator],
			color: '#EF5D32',
		},
		{
			tag: t.className,
			color: '#EFAC32',
			fontWeight: 'bold',
		},
		{
			tag: [
				t.typeName,
				t.propertyName,
				t.function(t.variableName),
				t.definition(t.variableName),
			],
			color: '#EFAC32',
		},
		{
			tag: t.definition(t.typeName),
			color: '#EFAC32',
			fontWeight: 'bold',
		},
		{
			tag: t.labelName,
			color: '#EFAC32',
			fontWeight: 'bold',
		},
		{
			tag: [t.number, t.bool],
			color: '#6C99BB',
		},
		{
			tag: [t.variableName, t.self],
			color: '#b8c2cc',
		},
		{
			tag: [t.string, t.special(t.brace), t.regexp],
			color: '#D9D762',
		},
		{
			tag: [t.angleBracket, t.tagName, t.attributeName],
			color: '#EFCB43',
		},
	],
});