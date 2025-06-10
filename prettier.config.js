const config = {
    arrowParens: 'avoid',
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'none',
    overrides: [
        {
            files: ['package.json', '*.yml', '*.md'],
            options: {
                tabWidth: 2
            }
        }
    ]
};

module.exports = config;
