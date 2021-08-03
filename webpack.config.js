const path = require('path')

module.exports = {
    entry: './src/index.html',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index_bundle.js',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.html$/i,
                loader: "html-loader",
            },
        ],
    },
    mode: 'production',
}
